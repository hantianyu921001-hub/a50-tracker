/**
 * A50-Tracker API Server
 * 提供评分刷新、版本管理等后端接口
 */
import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { createVersionSnapshot, getVersionList, getPendingReviewQueue } from '../src/services/versionHistory.js';
import { evaluateCompany, updateDecisionState } from '../src/services/decisionEngine.js';
import { checkSignificantEvents } from '../src/services/dataRefresh.js';
import {
  loadCompanyChanges,
  getCurrentIndex,
  loadCompanyCurrent,
  loadCompanyDecision,
  loadCompanyEvents,
  loadCompanyHistory,
  markCompanyEventsProcessed,
  syncAllCompanyArchives,
  syncCompanyArchive,
  upsertCompanyEvents,
} from '../src/services/companyArchives.js';
import { runBankAnalysisValidation } from '../src/services/companyAnalysisRunner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3001;
const execFileAsync = promisify(execFile);
const FETCH_SCRIPT_PATH = join(__dirname, '../scripts/fetch_bank_external_data.py');

// 数据文件路径
const V22_RESULTS_PATH = join(__dirname, '../v22_results.json');
const COMPANIES_PATH = join(__dirname, '../src/data/companies.json');
const DECISION_STATE_PATH = join(__dirname, '../src/data/decisionState.json');
const REFRESH_STATUS_PATH = join(__dirname, '../src/data/refreshStatus.json');

const app = express();
app.use(cors());
app.use(express.json());

// ============ 辅助函数 ============

function getRefreshStatus() {
  if (!existsSync(REFRESH_STATUS_PATH)) {
    const defaultStatus = {
      lastRefresh: null,
      pendingRefresh: false,
      refreshInProgress: false,
      nextScheduledRefresh: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    };
    return defaultStatus;
  }
  return JSON.parse(readFileSync(REFRESH_STATUS_PATH, 'utf-8'));
}

function saveRefreshStatus(status) {
  writeFileSync(REFRESH_STATUS_PATH, JSON.stringify(status, null, 2), 'utf-8');
}

function loadCompanies() {
  if (!existsSync(COMPANIES_PATH)) return [];
  return JSON.parse(readFileSync(COMPANIES_PATH, 'utf-8'));
}

function evaluateDecision(company, decisionState) {
  const evaluation = evaluateCompany(company, decisionState);
  if (evaluation?.error) {
    throw new Error(evaluation.error);
  }
  return updateDecisionState(company.code || company.symbol, evaluation, decisionState)[company.code || company.symbol];
}

function buildAdmissionError(externalValidation, symbol) {
  const validation = externalValidation?.externalData?.validation || {}
  const error = new Error(`${symbol} 自动分析校验未通过，已阻止写入正式归档`)
  error.statusCode = 422
  error.payload = {
    symbol,
    validation,
    blockingIssues: validation.blockingIssues || [],
    warnings: validation.warnings || [],
  }
  return error
}

async function runExternalArchiveRefresh({
  symbol,
  companies,
  decisionState = {},
  trigger = 'manual',
  triggerReason = '',
  incomingEvents = [],
}) {
  const externalValidation = await runBankAnalysisValidation(symbol);
  const validation = externalValidation?.externalData?.validation || {}
  if (validation.is_valid === false) {
    throw buildAdmissionError(externalValidation, symbol)
  }
  const existingDecision = loadCompanyDecision(symbol) || {};
  const externalCompany = externalValidation.externalData?.company || {};
  const existingRegistered = companies.find((item) => item.code === symbol);
  const legacyCompany = existingRegistered || {
    code: symbol,
    name: externalCompany.name || symbol,
    industry: externalCompany.industry || '待识别行业',
    swIndustry: externalCompany.industry || '待识别行业',
    status: 'analyzed',
    tags: ['外部数据映射', '自动分析'],
    lastUpdate: externalValidation.fetched_at,
  };

  const archiveResult = syncCompanyArchive({
    legacyCompany,
    decisionState: existingDecision,
    trigger: trigger === 'event' ? 'event_refresh' : 'manual_analysis',
    triggerReason: triggerReason || (trigger === 'event' ? `${symbol} 重大事件触发自动分析` : `手动刷新 ${symbol}`),
    events: [...incomingEvents, ...(externalValidation.externalData?.events || [])],
    externalValidation,
  });

  return {
    archiveResult,
    externalValidation,
  };
}

async function discoverCompanyAnnouncements(symbol) {
  const { stdout } = await execFileAsync('python3', [FETCH_SCRIPT_PATH, symbol, '--discover-announcements'], {
    cwd: join(__dirname, '..'),
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 5,
  });
  return JSON.parse(stdout);
}

async function processCompanyEvents({ symbol, payloadEvents }) {
  const normalizedEvents = payloadEvents.map((event, index) => ({
    id: event.id || `${symbol}-event-${Date.now()}-${index}`,
    date: event.date || new Date().toISOString().slice(0, 10),
    type: event.type || 'manual_event',
    title: event.title || '未命名事件',
    impact_level: event.impact_level || 'medium',
    impact_direction: event.impact_direction || 'neutral',
    requires_refresh: Boolean(event.requires_refresh),
    source: event.source || 'manual_event_input',
    url: event.url || '',
    processed: event.requires_refresh ? false : true,
  }))

  const mergedEvents = upsertCompanyEvents(symbol, normalizedEvents)
  const pendingRefreshEvents = mergedEvents.filter((event) => event.requires_refresh && !event.processed)

  if (!pendingRefreshEvents.length) {
    return {
      success: true,
      symbol,
      message: '事件已记录，无需自动刷新',
      data: {
        events: mergedEvents,
        autoTriggered: false,
      },
    }
  }

  const status = getRefreshStatus()
  if (status.refreshInProgress) {
    return {
      success: false,
      statusCode: 409,
      symbol,
      message: '当前有刷新任务进行中，事件已记录，稍后再试自动触发',
      data: {
        events: mergedEvents,
        pendingEventIds: pendingRefreshEvents.map((event) => event.id),
      },
    }
  }

  status.refreshInProgress = true
  saveRefreshStatus(status)

  try {
    const companies = loadCompanies()
    const { archiveResult, externalValidation } = await runExternalArchiveRefresh({
      symbol,
      companies,
      decisionState: {},
      trigger: 'event',
      triggerReason: `重大事件触发自动分析：${pendingRefreshEvents.map((event) => event.title).join(' / ')}`,
      incomingEvents: pendingRefreshEvents,
    })

    markCompanyEventsProcessed(symbol, pendingRefreshEvents.map((event) => event.id), {
      refreshTriggeredAt: new Date().toISOString(),
      refreshVersion: archiveResult.current?.meta?.source_version || '',
    })

    status.refreshInProgress = false
    status.lastRefresh = new Date().toISOString()
    status.lastEventTrigger = new Date().toISOString()
    saveRefreshStatus(status)

    return {
      success: true,
      symbol,
      message: `${symbol} 重大事件已触发自动刷新`,
      data: {
        autoTriggered: true,
        current: archiveResult.current,
        externalValidation,
      },
    }
  } catch (e) {
    status.refreshInProgress = false
    saveRefreshStatus(status)
    throw e
  }
}

// ============ API 路由 ============

// 1. 获取刷新状态
app.get('/api/refresh/status', (req, res) => {
  try {
    const status = getRefreshStatus();
    res.json({ success: true, data: status });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 2. 手动刷新单个公司
app.post('/api/refresh/company/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const {
    analysisType = 'default',
    trigger = 'manual',
    triggerReason = '',
    events: incomingEvents = [],
  } = req.body || {};
  const status = getRefreshStatus();

  if (status.refreshInProgress) {
    return res.status(409).json({ success: false, message: '刷新正在进行中' });
  }

  status.refreshInProgress = true;
  saveRefreshStatus(status);

  try {
    // 加载数据
    let v22Results = [];
    if (existsSync(V22_RESULTS_PATH)) {
      v22Results = JSON.parse(readFileSync(V22_RESULTS_PATH, 'utf-8'));
    }

    let decisionState = {};
    if (existsSync(DECISION_STATE_PATH)) {
      decisionState = JSON.parse(readFileSync(DECISION_STATE_PATH, 'utf-8'));
    }

    const companies = loadCompanies();
    const companyIndex = v22Results.findIndex(c => c.code === symbol || c.symbol === symbol);
    const shouldRunExternal = analysisType === 'external' || companyIndex === -1;

    if (shouldRunExternal) {
      const { archiveResult, externalValidation } = await runExternalArchiveRefresh({
        symbol,
        companies,
        decisionState,
        trigger,
        triggerReason,
        incomingEvents,
      });

      status.refreshInProgress = false;
      status.lastRefresh = new Date().toISOString();
      if (trigger === 'event') {
        status.lastEventTrigger = new Date().toISOString();
      }
      saveRefreshStatus(status);

      return res.json({
        success: true,
        symbol,
        message: `${archiveResult.current.meta.name || symbol} 自动分析完成`,
        data: {
          current: archiveResult.current,
          externalValidation,
        },
      });
    }

    // 找到目标公司
    if (companyIndex === -1) {
      status.refreshInProgress = false;
      saveRefreshStatus(status);
      return res.status(404).json({ success: false, message: `未找到公司 ${symbol}` });
    }

    const company = v22Results[companyIndex];

    // 重新评估决策状态
    const newDecisionState = evaluateDecision(company);
    decisionState[symbol] = newDecisionState;

    // 保存更新后的数据
    writeFileSync(V22_RESULTS_PATH, JSON.stringify(v22Results, null, 2), 'utf-8');
    writeFileSync(DECISION_STATE_PATH, JSON.stringify(decisionState, null, 2), 'utf-8');

    syncCompanyArchive({
      legacyCompany: companies.find((item) => item.code === symbol),
      v22Data: company,
      decisionState: decisionState[symbol] || {},
      trigger: 'manual_review',
      triggerReason: `手动刷新 ${symbol}`,
    });
    syncAllCompanyArchives({
      companies,
      v22Results,
      decisionStates: decisionState,
      trigger: 'manual_review',
      triggerReason: '刷新后同步单公司索引',
    });

    // 创建版本快照
    const previousVersions = getVersionList({ limit: 1 });
    createVersionSnapshot({
      type: 'manual_review',
      trigger: 'manual',
      triggerReason: `手动刷新 ${symbol}`,
      parentVersion: previousVersions[0]?.versionId || null,
      scoreResults: v22Results,
      decisionState,
      events: []
    });

    status.refreshInProgress = false;
    status.lastRefresh = new Date().toISOString();
    saveRefreshStatus(status);

    res.json({
      success: true,
      symbol,
      newDecisionState,
      message: `${company.name || symbol} 刷新完成`
    });
  } catch (e) {
    status.refreshInProgress = false;
    saveRefreshStatus(status);
    res.status(e.statusCode || 500).json({ success: false, message: e.message, data: e.payload || null });
  }
});

// 2b. 记录重大事件并自动触发刷新
app.post('/api/events/company/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const payloadEvents = Array.isArray(req.body?.events)
    ? req.body.events
    : (req.body ? [req.body] : []);

  if (!payloadEvents.length) {
    return res.status(400).json({ success: false, message: '缺少事件数据' });
  }

  try {
    const result = await processCompanyEvents({ symbol, payloadEvents })
    if (!result.success && result.statusCode) {
      return res.status(result.statusCode).json(result)
    }
    return res.json(result)
  } catch (e) {
    return res.status(e.statusCode || 500).json({ success: false, message: e.message, data: e.payload || null })
  }
})

// 2c. 自动从公告源发现重大事件并复用事件触发链
app.post('/api/events/company/:symbol/discover', async (req, res) => {
  const { symbol } = req.params

  try {
    const discovery = await discoverCompanyAnnouncements(symbol)
    const announcements = discovery.announcements || []
    const significantEvents = checkSignificantEvents(
      announcements.map((item) => ({
        title: item.title,
        text: item.title,
        source: item.source,
        url: item.url,
      })),
    )

    const payloadEvents = significantEvents.map((event, index) => {
      const announcement = announcements.find((item) => item.title === event.title) || {}
      return {
        id: announcement.id || `${symbol}-discovered-${Date.now()}-${index}`,
        date: announcement.date || new Date().toISOString().slice(0, 10),
        type: event.type,
        title: event.title,
        impact_level: event.priority === 'high' ? 'high' : 'medium',
        impact_direction: 'neutral',
        requires_refresh: event.priority === 'high',
        source: announcement.source || event.source || 'cninfo_disclosure',
        url: announcement.url || event.url || '',
      }
    })

    if (!payloadEvents.length) {
      return res.json({
        success: true,
        symbol,
        message: '最近公告已扫描，未发现需处理的重大事件',
        data: {
          discoveredCount: announcements.length,
          significantCount: 0,
          autoTriggered: false,
          announcements,
        },
      })
    }

    const result = await processCompanyEvents({ symbol, payloadEvents })
    if (!result.success && result.statusCode) {
      return res.status(result.statusCode).json({
        ...result,
        data: {
          ...(result.data || {}),
          discoveredCount: announcements.length,
          significantCount: payloadEvents.length,
        },
      })
    }

    return res.json({
      ...result,
      data: {
        ...(result.data || {}),
        discoveredCount: announcements.length,
        significantCount: payloadEvents.length,
        announcements,
      },
    })
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message })
  }
})

// 3. 全量刷新
app.post('/api/refresh/all', async (req, res) => {
  const status = getRefreshStatus();

  if (status.refreshInProgress) {
    return res.status(409).json({ success: false, message: '刷新正在进行中' });
  }

  status.refreshInProgress = true;
  saveRefreshStatus(status);

  try {
    let v22Results = [];
    if (existsSync(V22_RESULTS_PATH)) {
      v22Results = JSON.parse(readFileSync(V22_RESULTS_PATH, 'utf-8'));
    }

    let decisionState = {};
    if (existsSync(DECISION_STATE_PATH)) {
      decisionState = JSON.parse(readFileSync(DECISION_STATE_PATH, 'utf-8'));
    }

    // 重新评估所有公司的决策状态
    v22Results.forEach(company => {
      const symbol = company.code || company.symbol;
      decisionState[symbol] = evaluateDecision(company);
    });

    // 保存
    writeFileSync(V22_RESULTS_PATH, JSON.stringify(v22Results, null, 2), 'utf-8');
    writeFileSync(DECISION_STATE_PATH, JSON.stringify(decisionState, null, 2), 'utf-8');

    const companies = loadCompanies();
    syncAllCompanyArchives({
      companies,
      v22Results,
      decisionStates: decisionState,
      trigger: 'refresh',
      triggerReason: '全量刷新后同步单公司档案',
    });

    // 创建版本快照
    createVersionSnapshot({
      type: 'refresh',
      trigger: 'manual',
      triggerReason: '手动全量刷新',
      parentVersion: null,
      scoreResults: v22Results,
      decisionState,
      events: []
    });

    status.refreshInProgress = false;
    status.lastRefresh = new Date().toISOString();
    saveRefreshStatus(status);

    res.json({
      success: true,
      count: v22Results.length,
      message: `全量刷新完成，共处理 ${v22Results.length} 家公司`
    });
  } catch (e) {
    status.refreshInProgress = false;
    saveRefreshStatus(status);
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4. 获取版本历史
app.get('/api/versions', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const versions = getVersionList({ limit });
    res.json({ success: true, data: versions });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4b. 获取当前单公司索引
app.get('/api/analysis/index', (req, res) => {
  try {
    res.json({ success: true, data: getCurrentIndex() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4c. 获取单公司当前档案
app.get('/api/analysis/company/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const current = loadCompanyCurrent(symbol);
    const decision = loadCompanyDecision(symbol);
    const events = loadCompanyEvents(symbol);
    if (!current) {
      return res.status(404).json({ success: false, message: `未找到 ${symbol} 的分析档案` });
    }
    res.json({
      success: true,
      data: {
        current,
        decision,
        events,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4d. 获取单公司历史版本
app.get('/api/analysis/company/:symbol/history', (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;
    res.json({
      success: true,
      data: {
        history: loadCompanyHistory(symbol, limit),
        changes: loadCompanyChanges(symbol, limit),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4e. 最小外部抓取 + 银行评分验证
app.get('/api/analysis/company/:symbol/validate-external', async (req, res) => {
  try {
    const { symbol } = req.params;
    const result = await runBankAnalysisValidation(symbol);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 5. 获取待审核队列
app.get('/api/review/queue', (req, res) => {
  try {
    const queue = getPendingReviewQueue();
    res.json({ success: true, data: queue });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 6. 获取单个公司决策状态
app.get('/api/decision/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const archiveDecision = loadCompanyDecision(symbol);
    let decisionState = {};
    if (existsSync(DECISION_STATE_PATH)) {
      decisionState = JSON.parse(readFileSync(DECISION_STATE_PATH, 'utf-8'));
    }
    res.json({ success: true, data: decisionState[symbol] || archiveDecision || null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 7. 更新决策状态（复核通过/拒绝）
app.put('/api/decision/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const {
      action,
      reviewStatus,
      reviewNotes = '',
      decisionReason = '',
      reviewDeadline = '',
    } = req.body;

    let decisionState = {};
    if (existsSync(DECISION_STATE_PATH)) {
      decisionState = JSON.parse(readFileSync(DECISION_STATE_PATH, 'utf-8'));
    }

    if (!decisionState[symbol]) {
      decisionState[symbol] = {
        meta: {
          symbol,
          updatedAt: new Date().toISOString().slice(0, 10),
          lastReviewedAt: new Date().toISOString().slice(0, 10),
        },
        review: {},
        portfolio: {},
        checklist: {},
        signals: {},
        audit: { createdAt: new Date().toISOString(), history: [] },
      };
    }

    const current = decisionState[symbol];
    current.review = current.review || {};
    current.meta = current.meta || {};
    current.audit = current.audit || {};
    current.audit.history = current.audit.history || [];

    if (action) current.review.decisionAction = action;
    if (reviewStatus) current.review.reviewStatus = reviewStatus;
    if (reviewNotes) current.review.reviewNotes = reviewNotes;
    if (decisionReason) current.review.decisionReason = decisionReason;
    if (reviewDeadline) current.meta.reviewDeadline = reviewDeadline;
    current.review.reviewedAt = new Date().toISOString();
    current.review.reviewCount = (current.review.reviewCount || 0) + 1;
    current.meta.updatedAt = new Date().toISOString().slice(0, 10);
    current.meta.lastReviewedAt = new Date().toISOString().slice(0, 10);
    current.audit.history.push({
      timestamp: new Date().toISOString(),
      action: 'manual_review',
      newAction: current.review.decisionAction || '',
      reviewStatus: current.review.reviewStatus || '',
      trigger: 'api_update',
    });

    writeFileSync(DECISION_STATE_PATH, JSON.stringify(decisionState, null, 2), 'utf-8');

    const companies = loadCompanies();
    let v22Results = [];
    if (existsSync(V22_RESULTS_PATH)) {
      v22Results = JSON.parse(readFileSync(V22_RESULTS_PATH, 'utf-8'));
    }
    syncCompanyArchive({
      legacyCompany: companies.find((item) => item.code === symbol),
      v22Data: v22Results.find((item) => item.code === symbol),
      decisionState: current,
      trigger: 'manual_review',
      triggerReason: `人工更新 ${symbol} 决策状态`,
    });
    syncAllCompanyArchives({
      companies,
      v22Results,
      decisionStates: decisionState,
      trigger: 'manual_review',
      triggerReason: '人工更新决策后同步索引',
    });

    res.json({ success: true, data: current });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 A50 API Server running on http://localhost:${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   GET  /api/refresh/status     - 获取刷新状态`);
  console.log(`   POST /api/refresh/company/:symbol - 刷新单个公司`);
  console.log(`   POST /api/refresh/all        - 全量刷新`);
  console.log(`   GET  /api/versions          - 版本历史`);
  console.log(`   GET  /api/review/queue      - 待审核队列`);
  console.log(`   GET  /api/decision/:symbol  - 获取决策状态`);
  console.log(`   PUT  /api/decision/:symbol  - 更新决策状态`);
});
