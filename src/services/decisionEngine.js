/**
 * 状态流转引擎
 * 路径: src/services/decisionEngine.js
 * 功能: 12项checklist自动化评估 + decisionAction决策生成
 */

const CHECKLIST_WEIGHTS = {
  fundamental_trend: 1.0,
  valuation_fit: 1.2,
  catalyst_validity: 0.8,
  risk_events: 1.5,
  industry_cycle: 0.7,
  earnings_quality: 1.0,
  cashflow_health: 1.0,
  position_fit: 0.6,
  liquidity_fit: 0.8,
  timing_window: 0.9,
  data_completeness: 1.0,
  thesis_integrity: 1.3
};

const STATUS_SCORES = { pass: 1.0, review: 0.5, fail: 0.0, unknown: 0.3 };
const DECISION_THRESHOLDS = { buy: 0.75, add: 0.65, hold: 0.45, watch: 0.30, sell: 0.0 };

export function evaluateChecklistItem(checkKey, checkData, companyData) {
  const baseScore = STATUS_SCORES[checkData.status] || STATUS_SCORES.unknown;
  const confidence = checkData.confidence || 3;
  const weight = CHECKLIST_WEIGHTS[checkKey] || 1.0;
  const confidenceFactor = 0.6 + (confidence / 5) * 0.8;
  const weightedScore = baseScore * weight * confidenceFactor;
  let assessment = '';
  switch (checkData.status) {
    case 'pass': assessment = `✅ ${checkData.note || '检查通过'}`; break;
    case 'review': assessment = `⚠️ ${checkData.note || '需要复核'}`; break;
    case 'fail': assessment = `❌ ${checkData.note || '检查失败'}`; break;
    default: assessment = `❓ 状态未知`; break;
  }
  return { key: checkKey, status: checkData.status, baseScore, confidence, weight, confidenceFactor, weightedScore, note: checkData.note, assessment };
}

export function evaluateAllChecklist(checklist, companyData) {
  const evaluations = [];
  let totalWeight = 0, totalWeightedScore = 0;
  Object.keys(checklist).forEach(key => {
    const eval_ = evaluateChecklistItem(key, checklist[key], companyData);
    evaluations.push(eval_);
    totalWeight += eval_.weight;
    totalWeightedScore += eval_.weightedScore;
  });
  const normalizedScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  return { evaluations, totalScore: totalWeightedScore, normalizedScore: Math.round(normalizedScore * 100) / 100, maxPossibleScore: totalWeight, completionRate: evaluations.filter(e => e.status !== 'unknown').length / evaluations.length };
}

export function generateDecisionAction(normalizedScore, currentAction = null) {
  let action = 'watch', reason = '';
  if (normalizedScore >= DECISION_THRESHOLDS.buy) { action = 'buy'; reason = `综合得分${normalizedScore}>=${DECISION_THRESHOLDS.buy}，推荐买入`; }
  else if (normalizedScore >= DECISION_THRESHOLDS.add) { action = 'add'; reason = `综合得分${normalizedScore}>=${DECISION_THRESHOLDS.add}，可考虑加仓`; }
  else if (normalizedScore >= DECISION_THRESHOLDS.hold) { action = 'hold'; reason = `综合得分${normalizedScore}>=${DECISION_THRESHOLDS.hold}，建议持有`; }
  else if (normalizedScore >= DECISION_THRESHOLDS.watch) { action = 'watch'; reason = `综合得分${normalizedScore}>=${DECISION_THRESHOLDS.watch}，建议观望`; }
  else { action = 'sell'; reason = `综合得分${normalizedScore}<${DECISION_THRESHOLDS.watch}，建议减仓或卖出`; }
  if (currentAction === action) reason = `维持${action}，${reason}`;
  return { action, reason, score: normalizedScore };
}

export function evaluateCompany(companyData, decisionStateData) {
  const symbol = companyData.code;
  const state = decisionStateData[symbol];
  if (!state) return { error: `No decision state found for ${symbol}` };
  const checklistResult = evaluateAllChecklist(state.checklist, companyData);
  const decision = generateDecisionAction(checklistResult.normalizedScore, state.review?.decisionAction);
  const riskItems = checklistResult.evaluations.filter(e => e.key === 'risk_events' && e.status !== 'pass');
  const incompleteItems = checklistResult.evaluations.filter(e => e.status === 'unknown' || e.confidence < 3);
  return {
    symbol, name: companyData.name, timestamp: new Date().toISOString(), companyScore: companyData.v22_total, companyGrade: companyData.v22_grade,
    checklistScore: checklistResult, decision, riskAssessment: { hasHighRisk: riskItems.length > 0, riskItems: riskItems.map(e => ({ key: e.key, note: e.note })), incompleteItems: incompleteItems.map(e => ({ key: e.key, confidence: e.confidence })) },
    reviewRecommendation: { status: riskItems.length > 0 || incompleteItems.length > 0 ? 'needs_review' : 'auto_approved', priority: riskItems.length > 0 ? 'high' : (incompleteItems.length > 3 ? 'medium' : 'low'), reasons: [...(riskItems.length > 0 ? ['存在高风险项'] : []), ...(incompleteItems.length > 0 ? [`${incompleteItems.length}项数据置信度较低`] : [])] }
  };
}

export function batchEvaluate(companies, decisionStates) {
  const results = { timestamp: new Date().toISOString(), total: companies.length, evaluated: 0, errors: [], byAction: { buy: [], add: [], hold: [], watch: [], sell: [] }, needsReview: [], highRisk: [], evaluations: [] };
  companies.forEach(company => {
    try {
      const eval_ = evaluateCompany(company, decisionStates);
      if (eval_.error) { results.errors.push({ symbol: company.code, error: eval_.error }); return; }
      results.evaluated++;
      results.evaluations.push(eval_);
      results.byAction[eval_.decision.action].push({ symbol: eval_.symbol, name: eval_.name, score: eval_.checklistScore.normalizedScore, companyScore: eval_.companyScore, grade: eval_.companyGrade });
      if (eval_.reviewRecommendation.status === 'needs_review') results.needsReview.push({ symbol: eval_.symbol, name: eval_.name, priority: eval_.reviewRecommendation.priority, reasons: eval_.reviewRecommendation.reasons });
      if (eval_.riskAssessment.hasHighRisk) results.highRisk.push({ symbol: eval_.symbol, name: eval_.name, risks: eval_.riskAssessment.riskItems });
    } catch (e) { results.errors.push({ symbol: company.code, error: e.message }); }
  });
  results.needsReview.sort((a, b) => { const priorityOrder = { high: 0, medium: 1, low: 2 }; return priorityOrder[a.priority] - priorityOrder[b.priority]; });
  return results;
}

export function updateDecisionState(symbol, evaluation, currentState) {
  const updatedState = { ...currentState };
  if (!updatedState[symbol]) {
    updatedState[symbol] = { meta: { symbol, name: evaluation.name, updatedAt: new Date().toISOString().slice(0, 10) }, review: {}, portfolio: {}, checklist: {}, signals: {}, audit: { createdAt: new Date().toISOString(), history: [] } };
  }
  const deadline = new Date(); deadline.setDate(deadline.getDate() + 14);
  updatedState[symbol].review = { ...updatedState[symbol].review, reviewStatus: evaluation.reviewRecommendation.status, decisionAction: evaluation.decision.action, decisionReason: evaluation.decision.reason, reviewedAt: evaluation.timestamp, reviewCount: (updatedState[symbol].review?.reviewCount || 0) + 1, autoReviewed: true };
  updatedState[symbol].signals = { ...updatedState[symbol].signals, signalStatus: 'fresh', signalAgeDays: 0, reviewPriority: evaluation.reviewRecommendation.priority };
  updatedState[symbol].meta = { ...updatedState[symbol].meta, updatedAt: new Date().toISOString().slice(0, 10), lastReviewedAt: new Date().toISOString().slice(0, 10), reviewDeadline: deadline.toISOString().slice(0, 10) };
  if (!updatedState[symbol].audit) updatedState[symbol].audit = {};
  updatedState[symbol].audit.history = updatedState[symbol].audit.history || [];
  updatedState[symbol].audit.history.push({ timestamp: evaluation.timestamp, action: 'auto_review', previousAction: currentState[symbol]?.review?.decisionAction, newAction: evaluation.decision.action, score: evaluation.checklistScore.normalizedScore, trigger: 'decision_engine' });
  return updatedState;
}

export function getDecisionStats(evaluations) {
  const stats = { total: evaluations.length, byAction: { buy: 0, add: 0, hold: 0, watch: 0, sell: 0 }, byPriority: { high: 0, medium: 0, low: 0 }, avgScore: 0, highRiskCount: 0, scoreDistribution: { A: 0, B: 0, C: 0, D: 0 } };
  let totalScore = 0;
  evaluations.forEach(eval_ => {
    stats.byAction[eval_.decision.action]++;
    stats.byPriority[eval_.reviewRecommendation.priority]++;
    totalScore += eval_.checklistScore.normalizedScore;
    if (eval_.riskAssessment.hasHighRisk) stats.highRiskCount++;
    const grade = eval_.companyGrade;
    if (grade in stats.scoreDistribution) stats.scoreDistribution[grade]++;
  });
  stats.avgScore = evaluations.length > 0 ? Math.round(totalScore / evaluations.length * 100) / 100 : 0;
  return stats;
}

export default { evaluateChecklistItem, evaluateAllChecklist, generateDecisionAction, evaluateCompany, batchEvaluate, updateDecisionState, getDecisionStats, CHECKLIST_WEIGHTS, DECISION_THRESHOLDS };
