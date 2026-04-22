/**
 * A50-Tracker API 客户端
 * 与后端 Express 服务器通信
 */

const API_BASE = '/api';

async function request(method, path, data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || '请求失败');
  }
  return result;
}

// ============ 刷新相关 API ============

/**
 * 获取刷新状态
 */
export async function getRefreshStatus() {
  return request('GET', '/refresh/status');
}

/**
 * 刷新单个公司
 */
export async function refreshCompany(symbol, payload = null) {
  return request('POST', `/refresh/company/${symbol}`, payload);
}

export async function discoverCompanyEvents(symbol) {
  return request('POST', `/events/company/${symbol}/discover`);
}

/**
 * 全量刷新
 */
export async function refreshAll() {
  return request('POST', '/refresh/all');
}

// ============ 版本相关 API ============

/**
 * 获取版本历史
 */
export async function getVersions(limit = 20) {
  return request('GET', `/versions?limit=${limit}`);
}

export async function getAnalysisIndex() {
  return request('GET', '/analysis/index');
}

export async function getCompanyArchive(symbol) {
  return request('GET', `/analysis/company/${symbol}`);
}

export async function getCompanyArchiveHistory(symbol, limit = 20) {
  return request('GET', `/analysis/company/${symbol}/history?limit=${limit}`);
}

export async function getCompanyExternalValidation(symbol) {
  return request('GET', `/analysis/company/${symbol}/validate-external`);
}

// ============ 决策相关 API ============

/**
 * 获取待审核队列
 */
export async function getReviewQueue() {
  return request('GET', '/review/queue');
}

/**
 * 获取单个公司决策状态
 */
export async function getDecision(symbol) {
  return request('GET', `/decision/${symbol}`);
}

/**
 * 更新决策状态
 */
export async function updateDecision(symbol, payload) {
  return request('PUT', `/decision/${symbol}`, payload);
}

export default {
  getRefreshStatus,
  refreshCompany,
  discoverCompanyEvents,
  refreshAll,
  getVersions,
  getAnalysisIndex,
  getCompanyArchive,
  getCompanyArchiveHistory,
  getCompanyExternalValidation,
  getReviewQueue,
  getDecision,
  updateDecision,
};
