/**
 * 版本历史管理模块
 * 路径: src/services/versionHistory.js
 *
 * 功能:
 * 1. 创建版本快照（自动/手动）
 * 2. 版本索引管理
 * 3. 版本对比（diff）
 * 4. 版本回滚（restore）
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const HISTORY_DIR = join(__dirname, '../../v22_history');
const VERSIONS_INDEX = join(HISTORY_DIR, 'versions_index.json');

// ============ 数据结构 ============

/**
 * 版本索引结构 (versions_index.json)
 * {
 *   "versions": [
 *     {
 *       "versionId": "20260416172600",
 *       "timestamp": "2026-04-16T17:26:00",
 *       "type": "refresh|event_update|manual_review|snapshot",
 *       "trigger": "scheduled|event|manual",
 *       "triggerReason": "手动刷新|重大事件：年报发布|半月定时刷新",
 *       "parentVersion": "20260416120000",
 *       "symbolCount": 68,
 *       "snapshotPath": "2026-04-16/snapshot_172600.json",
 *       "summary": {
 *         "totalChanged": 5,
 *         "scoreChanges": [
 *           { "symbol": "600036", "name": "招商银行", "oldScore": 55, "newScore": 58, "delta": +3 }
 *         ],
 *         "decisionChanges": [
 *           { "symbol": "601628", "name": "中国人寿", "oldAction": "watch", "newAction": "buy", "reason": "年报数据更新" }
 *         ]
 *       },
 *       "events": ["年报发布", "分红公告"],
 *       "status": "active|archived"
 *     }
 *   ]
 * }
 */

// ============ 核心函数 ============

/**
 * 获取版本索引
 */
export function getVersionsIndex() {
  if (!existsSync(VERSIONS_INDEX)) {
    const defaultIndex = { versions: [], lastUpdated: null };
    writeFileSync(VERSIONS_INDEX, JSON.stringify(defaultIndex, null, 2), 'utf-8');
    return defaultIndex;
  }
  return JSON.parse(readFileSync(VERSIONS_INDEX, 'utf-8'));
}

/**
 * 保存版本索引
 */
function saveVersionsIndex(index) {
  index.lastUpdated = new Date().toISOString();
  writeFileSync(VERSIONS_INDEX, JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * 生成版本ID (格式: YYYYMMDDHHMMSS)
 */
export function generateVersionId() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

/**
 * 获取当前日期目录
 */
function getDateDir() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dateDir = join(HISTORY_DIR, today);
  if (!existsSync(dateDir)) {
    mkdirSync(dateDir, { recursive: true });
  }
  return { today, dateDir };
}

/**
 * 创建版本快照
 * @param {Object} options
 * @param {string} options.type - snapshot|refresh|event_update|manual_review
 * @param {string} options.trigger - scheduled|event|manual
 * @param {string} options.triggerReason - 触发原因描述
 * @param {string} options.parentVersion - 父版本ID
 * @param {Array} options.scoreResults - 评分结果数组
 * @param {Object} options.decisionState - decisionState.json 数据
 * @param {Array} options.events - 触发的事件关键词
 * @param {Object} options.previousResults - 上一个版本的评分结果（用于diff）
 */
export function createVersionSnapshot(options) {
  const {
    type = 'snapshot',
    trigger = 'manual',
    triggerReason = '',
    parentVersion = null,
    scoreResults = [],
    decisionState = {},
    events = [],
    previousResults = []
  } = options;

  const versionId = generateVersionId();
  const { today, dateDir } = getDateDir();
  const snapshotFilename = `snapshot_${versionId.slice(8)}.json`;
  const snapshotPath = join(dateDir, snapshotFilename);

  // 生成评分变化摘要
  const summary = generateVersionSummary(scoreResults, decisionState, previousResults);

  // 构建版本元数据
  const versionMeta = {
    versionId,
    timestamp: new Date().toISOString(),
    type,
    trigger,
    triggerReason,
    parentVersion,
    symbolCount: scoreResults.length,
    snapshotPath: `${today}/${snapshotFilename}`,
    summary,
    events,
    status: 'active'
  };

  // 保存完整快照（评分结果 + decisionState）
  const snapshotData = {
    versionId,
    createdAt: versionMeta.timestamp,
    scoreResults,
    decisionState,
    versionMeta
  };
  writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf-8');

  // 更新索引
  const index = getVersionsIndex();
  index.versions.unshift(versionMeta); // 新版本插入最前
  saveVersionsIndex(index);

  return { versionId, snapshotPath, versionMeta };
}

/**
 * 生成版本摘要（diff）
 */
function generateVersionSummary(newResults, newDecisionState, previousResults) {
  const summary = {
    totalChanged: 0,
    scoreChanges: [],
    decisionChanges: [],
    gradeChanges: []
  };

  if (!previousResults || previousResults.length === 0) {
    return summary;
  }

  // 建立上一版本的快速查询
  const prevMap = new Map();
  previousResults.forEach(r => prevMap.set(r.code, r));

  // 遍历当前结果找变化
  newResults.forEach(current => {
    const prev = prevMap.get(current.code);
    if (!prev) return;

    // 评分变化
    if (prev.v22_total !== current.v22_total) {
      summary.scoreChanges.push({
        symbol: current.code,
        name: current.name,
        oldScore: prev.v22_total,
        newScore: current.v22_total,
        delta: current.v22_total - prev.v22_total
      });
      summary.totalChanged++;
    }

    // 等级变化
    if (prev.v22_grade !== current.v22_grade) {
      summary.gradeChanges.push({
        symbol: current.code,
        name: current.name,
        oldGrade: prev.v22_grade,
        newGrade: current.v22_grade
      });
    }
  });

  // decisionState 变化
  Object.keys(newDecisionState).forEach(symbol => {
    const newState = newDecisionState[symbol];
    if (newState.review && newState.review.decisionAction) {
      // 这里可以添加 decisionState 的 diff 逻辑
      summary.decisionChanges.push({
        symbol,
        name: newState.meta?.name || symbol,
        decisionAction: newState.review.decisionAction,
        reviewStatus: newState.review.reviewStatus
      });
    }
  });

  return summary;
}

/**
 * 获取版本列表
 * @param {Object} filters
 * @param {string} filters.type - 筛选类型
 * @param {string} filters.trigger - 筛选触发原因
 * @param {number} filters.limit - 返回数量限制
 */
export function getVersionList(filters = {}) {
  const index = getVersionsIndex();
  let versions = [...index.versions];

  if (filters.type) {
    versions = versions.filter(v => v.type === filters.type);
  }
  if (filters.trigger) {
    versions = versions.filter(v => v.trigger === filters.trigger);
  }

  // 排序：最新在前
  versions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (filters.limit) {
    versions = versions.slice(0, filters.limit);
  }

  return versions;
}

/**
 * 获取指定版本的快照数据
 */
export function getVersionSnapshot(versionId) {
  const index = getVersionsIndex();
  const version = index.versions.find(v => v.versionId === versionId);

  if (!version) {
    throw new Error(`Version not found: ${versionId}`);
  }

  const snapshotPath = join(HISTORY_DIR, version.snapshotPath);
  if (!existsSync(snapshotPath)) {
    throw new Error(`Snapshot file not found: ${snapshotPath}`);
  }

  return JSON.parse(readFileSync(snapshotPath, 'utf-8'));
}

/**
 * 获取版本对比（两个版本之间的变化）
 */
export function compareVersions(versionId1, versionId2) {
  const snapshot1 = getVersionSnapshot(versionId1);
  const snapshot2 = getVersionSnapshot(versionId2);

  const comparison = {
    version1: versionId1,
    version2: versionId2,
    scoreChanges: [],
    newSymbols: [],
    removedSymbols: [],
    decisionChanges: []
  };

  // 建立快速查询
  const snapshot1Map = new Map();
  snapshot1.scoreResults.forEach(r => snapshot1Map.set(r.code, r));

  const snapshot2Map = new Map();
  snapshot2.scoreResults.forEach(r => snapshot2Map.set(r.code, r));

  // 新增的标的
  snapshot2.scoreResults.forEach(r => {
    if (!snapshot1Map.has(r.code)) {
      comparison.newSymbols.push({ code: r.code, name: r.name });
    }
  });

  // 删除的标的
  snapshot1.scoreResults.forEach(r => {
    if (!snapshot2Map.has(r.code)) {
      comparison.removedSymbols.push({ code: r.code, name: r.name });
    }
  });

  // 评分变化
  snapshot2.scoreResults.forEach(current => {
    const prev = snapshot1Map.get(current.code);
    if (prev && prev.v22_total !== current.v22_total) {
      comparison.scoreChanges.push({
        code: current.code,
        name: current.name,
        oldScore: prev.v22_total,
        newScore: current.v22_total,
        delta: current.v22_total - prev.v22_total,
        oldGrade: prev.v22_grade,
        newGrade: current.v22_grade
      });
    }
  });

  // Decision action 变化
  Object.keys(snapshot2.decisionState || {}).forEach(symbol => {
    const newState = snapshot2.decisionState[symbol];
    const oldState = snapshot1.decisionState?.[symbol];
    if (newState?.review?.decisionAction !== oldState?.review?.decisionAction) {
      comparison.decisionChanges.push({
        symbol,
        name: newState.meta?.name || symbol,
        oldAction: oldState?.review?.decisionAction || 'N/A',
        newAction: newState.review.decisionAction,
        reason: newState.review.decisionReason
      });
    }
  });

  return comparison;
}

/**
 * 获取标的的历史版本
 */
export function getSymbolHistory(symbol, limit = 10) {
  const index = getVersionsIndex();
  const history = [];

  for (const version of index.versions) {
    try {
      const snapshotPath = join(HISTORY_DIR, version.snapshotPath);
      if (existsSync(snapshotPath)) {
        const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
        const company = snapshot.scoreResults.find(r => r.code === symbol);
        if (company) {
          history.push({
            versionId: version.versionId,
            timestamp: version.timestamp,
            type: version.type,
            trigger: version.trigger,
            triggerReason: version.triggerReason,
            score: company.v22_total,
            grade: company.v22_grade,
            decisionAction: snapshot.decisionState?.[symbol]?.review?.decisionAction
          });
        }
      }
    } catch (e) {
      console.warn(`Failed to load version ${version.versionId}:`, e.message);
    }

    if (history.length >= limit) break;
  }

  return history;
}

/**
 * 归档旧版本（减少索引大小）
 */
export function archiveVersion(versionId) {
  const index = getVersionsIndex();
  const version = index.versions.find(v => v.versionId === versionId);

  if (!version) {
    throw new Error(`Version not found: ${versionId}`);
  }

  version.status = 'archived';
  saveVersionsIndex(index);

  return version;
}

/**
 * 获取待审核队列（reviewStatus === needs_review）
 */
export function getPendingReviewQueue() {
  const latestVersion = getVersionList({ limit: 1 })[0];
  if (!latestVersion) return [];

  try {
    const snapshot = getVersionSnapshot(latestVersion.versionId);
    const pending = [];

    Object.keys(snapshot.decisionState || {}).forEach(symbol => {
      const state = snapshot.decisionState[symbol];
      if (state.review?.reviewStatus === 'needs_review' || state.signals?.reviewPriority === 'high') {
        pending.push({
          symbol,
          name: state.meta?.name || symbol,
          reviewStatus: state.review?.reviewStatus,
          reviewPriority: state.signals?.reviewPriority,
          reviewDeadline: state.meta?.reviewDeadline,
          lastReviewedAt: state.meta?.lastReviewedAt,
          decisionAction: state.review?.decisionAction,
          reason: state.review?.decisionReason
        });
      }
    });

    // 按优先级和截止日期排序
    pending.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.reviewPriority] !== priorityOrder[b.reviewPriority]) {
        return priorityOrder[a.reviewPriority] - priorityOrder[b.reviewPriority];
      }
      return new Date(a.reviewDeadline) - new Date(b.reviewDeadline);
    });

    return pending;
  } catch (e) {
    console.error('Failed to get pending review queue:', e);
    return [];
  }
}

/**
 * 获取刷新统计
 */
export function getRefreshStats() {
  const index = getVersionsIndex();
  const stats = {
    totalVersions: index.versions.length,
    byType: {},
    byTrigger: {},
    lastRefresh: null,
    pendingReviews: getPendingReviewQueue().length
  };

  index.versions.forEach(v => {
    stats.byType[v.type] = (stats.byType[v.type] || 0) + 1;
    stats.byTrigger[v.trigger] = (stats.byTrigger[v.trigger] || 0) + 1;
    if (v.type === 'refresh' && !stats.lastRefresh) {
      stats.lastRefresh = v.timestamp;
    }
  });

  return stats;
}

export default {
  createVersionSnapshot,
  getVersionList,
  getVersionSnapshot,
  compareVersions,
  getSymbolHistory,
  getPendingReviewQueue,
  getRefreshStats,
  archiveVersion,
  generateVersionId
};
