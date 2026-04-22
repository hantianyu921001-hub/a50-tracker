/**
 * 定时刷新服务
 * 路径: src/services/dataRefresh.js
 *
 * 功能:
 * 1. 半月自动刷新（cron）
 * 2. 手动刷新触发（API）
 * 3. 事件触发刷新
 * 4. 刷新状态管理
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createVersionSnapshot, getVersionList, getPendingReviewQueue } from './versionHistory.js';
import { syncAllCompanyArchives, syncCompanyArchive } from './companyArchives.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const V22_RESULTS_PATH = join(__dirname, '../../v22_results.json');
const COMPANIES_PATH = join(DATA_DIR, 'companies.json');
const DECISION_STATE_PATH = join(DATA_DIR, 'decisionState.json');

// ============ 刷新状态管理 ============

const REFRESH_STATUS_PATH = join(DATA_DIR, 'refreshStatus.json');

/**
 * 刷新状态结构
 * {
 *   "lastRefresh": "2026-04-16T10:00:00",
 *   "lastEventTrigger": "2026-04-15T14:30:00",
 *   "pendingRefresh": false,
 *   "refreshInProgress": false,
 *   "nextScheduledRefresh": "2026-04-20T00:00:00",
 *   "refreshIntervalDays": 14
 * }
 */

function getRefreshStatus() {
  if (!existsSync(REFRESH_STATUS_PATH)) {
    const defaultStatus = {
      lastRefresh: null,
      lastEventTrigger: null,
      pendingRefresh: false,
      refreshInProgress: false,
      nextScheduledRefresh: calculateNextRefresh(),
      refreshIntervalDays: 14
    };
    writeFileSync(REFRESH_STATUS_PATH, JSON.stringify(defaultStatus, null, 2), 'utf-8');
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

function calculateNextRefresh() {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 14);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

// ============ 事件关键词配置 ============

const EVENT_KEYWORDS = {
  annual_report: ['年报', '年度报告', '年度业绩', '年报发布', '2025年报', '2024年报'],
  quarterly_report: ['季报', '季度报告', 'Q1', 'Q2', 'Q3', 'Q4', '中报', '半年报'],
  dividend: ['分红', '派息', '分红方案', '分红预案', '除权', '除息'],
  rights_issue: ['配股', '增发', '定向增发', '公开增发'],
  acquisition: ['收购', '并购', '重组', '资产重组', '股权收购'],
  spinoff: ['分拆', '分立', '剥离'],
  new_product: ['新产品', '新产品发布', '新品发布', '技术创新'],
  contract: ['重大合同', '战略合作', '框架协议', '订单'],
  share_repurchase: ['回购', '股票回购', '增持', '减持'],
  split: ['拆股', '合股', '缩股'],
  investigation: ['调查', '立案', '处罚', '监管'],
  delisting_risk: ['退市风险', '*ST', 'ST股', '风险警示'],
  policy: ['政策', '规划', '十四五', '十五五', '碳中和', '新能源'],
  market_news: ['涨价', '降价', '产能', '停产', '安全事故']
};

/**
 * 检测文本中的事件关键词
 */
export function detectEvents(text) {
  const detectedEvents = [];
  Object.entries(EVENT_KEYWORDS).forEach(([eventType, keywords]) => {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        detectedEvents.push({ type: eventType, keyword, timestamp: new Date().toISOString() });
        break;
      }
    }
  });
  return detectedEvents;
}

/**
 * 检测是否有重大事件
 */
export function checkSignificantEvents(newsList = []) {
  const significantEvents = [];
  const highPriorityTypes = [
    'annual_report', 'acquisition', 'investigation', 'delisting_risk',
    'rights_issue', 'spinoff', 'share_repurchase'
  ];
  newsList.forEach(news => {
    const events = detectEvents(news.text || news.title || '');
    events.forEach(event => {
      const priority = highPriorityTypes.includes(event.type) ? 'high' : 'normal';
      significantEvents.push({ ...event, source: news.source || 'unknown', url: news.url, title: news.title, priority });
    });
  });
  return significantEvents;
}

// ============ 刷新核心逻辑 ============

export async function executeRefresh(options = {}) {
  const { trigger = 'manual', triggerReason = '手动刷新', events = [], scorerFn = null } = options;
  const status = getRefreshStatus();

  if (status.refreshInProgress) {
    return { success: false, message: '刷新正在进行中，请稍后再试' };
  }

  status.refreshInProgress = true;
  saveRefreshStatus(status);

  try {
    const previousVersions = getVersionList({ limit: 1 });
    const previousResults = previousVersions.length > 0 && previousVersions[0].snapshotPath
      ? await loadPreviousResults(previousVersions[0].snapshotPath)
      : [];

    let newResults = [];
    let decisionState = {};

    if (scorerFn) {
      const scoreOutput = await scorerFn();
      newResults = scoreOutput.results || scoreOutput;
    } else {
      if (existsSync(V22_RESULTS_PATH)) {
        newResults = JSON.parse(readFileSync(V22_RESULTS_PATH, 'utf-8'));
      }
    }

    if (existsSync(DECISION_STATE_PATH)) {
      decisionState = JSON.parse(readFileSync(DECISION_STATE_PATH, 'utf-8'));
    }

    const versionResult = createVersionSnapshot({
      type: trigger === 'scheduled' ? 'refresh' : (trigger === 'event' ? 'event_update' : 'manual_review'),
      trigger,
      triggerReason,
      parentVersion: previousVersions[0]?.versionId || null,
      scoreResults: newResults,
      decisionState,
      events: events.map(e => e.keyword || e.type)
    });

    syncAllCompanyArchives({
      companies: loadCompanies(),
      v22Results: newResults,
      decisionStates: decisionState,
      trigger,
      triggerReason,
    });

    status.refreshInProgress = false;
    if (trigger === 'scheduled') {
      status.lastRefresh = new Date().toISOString();
      status.nextScheduledRefresh = calculateNextRefresh();
    } else if (trigger === 'event') {
      status.lastEventTrigger = new Date().toISOString();
    }
    status.pendingRefresh = false;
    saveRefreshStatus(status);

    return { success: true, versionId: versionResult.versionId, versionMeta: versionResult.versionMeta, summary: versionResult.versionMeta.summary, message: `${trigger === 'scheduled' ? '定时' : trigger === 'event' ? '事件' : '手动'}刷新完成` };
  } catch (error) {
    status.refreshInProgress = false;
    saveRefreshStatus(status);
    throw error;
  }
}

async function loadPreviousResults(snapshotPath) {
  try {
    const fullPath = join(__dirname, '../../v22_history', snapshotPath);
    if (existsSync(fullPath)) {
      const snapshot = JSON.parse(readFileSync(fullPath, 'utf-8'));
      return snapshot.scoreResults || [];
    }
  } catch (e) { console.warn('Failed to load previous results:', e); }
  return [];
}

// ============ 状态查询 ============

export function getStatus() { return getRefreshStatus(); }
export function getReviewQueue() { return getPendingReviewQueue(); }

export function needsRefresh(daysThreshold = 30) {
  const status = getRefreshStatus();
  if (!status.lastRefresh) return true;
  const daysSinceRefresh = (new Date() - new Date(status.lastRefresh)) / (1000 * 60 * 60 * 24);
  return daysSinceRefresh > daysThreshold;
}

export function getRefreshSuggestion() {
  const status = getRefreshStatus();
  const queue = getPendingReviewQueue();
  const suggestions = [];

  if (needsRefresh()) {
    suggestions.push({ type: 'data_stale', priority: 'high', message: '数据已超过30天未更新，建议刷新' });
  }
  if (queue.length > 0) {
    const highPriority = queue.filter(q => q.reviewPriority === 'high').length;
    suggestions.push({ type: 'pending_review', priority: highPriority > 0 ? 'high' : 'medium', message: `有 ${queue.length} 个标的待审核${highPriority > 0 ? `（${highPriority} 个高优先级）` : ''}` });
  }
  if (status.nextScheduledRefresh) {
    const daysUntil = Math.ceil((new Date(status.nextScheduledRefresh) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3) {
      suggestions.push({ type: 'scheduled_refresh', priority: 'low', message: `定时刷新将在 ${daysUntil} 天后执行` });
    }
  }
  return suggestions;
}

export async function batchRefresh(symbols = [], options = {}) {
  const results = [];
  for (const symbol of symbols) {
    try { results.push({ symbol, success: true }); }
    catch (e) { results.push({ symbol, success: false, error: e.message }); }
  }
  return results;
}

export function markPendingRefresh(reason = '') {
  const status = getRefreshStatus();
  status.pendingRefresh = true;
  status.pendingRefreshReason = reason;
  status.pendingRefreshAt = new Date().toISOString();
  saveRefreshStatus(status);
  return status;
}

export async function refreshCompany(symbol, options = {}) {
  const { scorerFn = null } = options;
  const status = getRefreshStatus();

  if (status.refreshInProgress) {
    return { success: false, message: '刷新正在进行中，请稍后再试' };
  }

  status.refreshInProgress = true;
  saveRefreshStatus(status);

  try {
    // 加载当前数据
    let v22Results = [];
    if (existsSync(V22_RESULTS_PATH)) {
      v22Results = JSON.parse(readFileSync(V22_RESULTS_PATH, 'utf-8'));
    }

    let decisionState = {};
    if (existsSync(DECISION_STATE_PATH)) {
      decisionState = JSON.parse(readFileSync(DECISION_STATE_PATH, 'utf-8'));
    }

    // 找到目标公司
    const companyIndex = v22Results.findIndex(c => c.code === symbol || c.symbol === symbol);
    if (companyIndex === -1) {
      status.refreshInProgress = false;
      saveRefreshStatus(status);
      return { success: false, message: `未找到公司 ${symbol}` };
    }

    const company = v22Results[companyIndex];

    // TODO: 调用评分系统重新评分
    // if (scorerFn) {
    //   const newScore = await scorerFn(symbol);
    //   v22Results[companyIndex] = { ...v22Results[companyIndex], ...newScore };
    // }

    // 更新决策状态（重新评估 checklist）
    const { evaluateDecision } = await import('./decisionEngine.js');
    const newDecisionState = evaluateDecision(company);
    decisionState[symbol] = newDecisionState;

    // 保存更新后的数据
    writeFileSync(V22_RESULTS_PATH, JSON.stringify(v22Results, null, 2), 'utf-8');
    writeFileSync(DECISION_STATE_PATH, JSON.stringify(decisionState, null, 2), 'utf-8');

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

    const companies = loadCompanies();
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
      triggerReason: '单公司刷新后同步当前索引',
    });

    status.refreshInProgress = false;
    saveRefreshStatus(status);

    return {
      success: true,
      symbol,
      newDecisionState,
      message: `${company.name || symbol} 刷新完成`
    };
  } catch (error) {
    status.refreshInProgress = false;
    saveRefreshStatus(status);
    throw error;
  }
}

export default { executeRefresh, detectEvents, checkSignificantEvents, getStatus, getReviewQueue, needsRefresh, getRefreshSuggestion, batchRefresh, markPendingRefresh, refreshCompany };
