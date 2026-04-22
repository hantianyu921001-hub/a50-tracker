import { createContext, useContext, useMemo } from 'react'
import companiesV20 from '../data/companies.json'
import v22Raw from '../../v22_results.json'
import decisionState from '../data/decisionState.json'
import currentIndex from '../../analysis/index/current_index.json'

const ScoringContext = createContext()

// v2.2 维度定义（原始分满分不是100）
const V22_DIMENSIONS = [
  { name: '护城河', key: 'moat', weight: '25%', maxScore: 25 },
  { name: '成长性', key: 'growth', weight: '20%', maxScore: 20 },
  { name: '盈利质量', key: 'profit', weight: '20%', maxScore: 20 },
  { name: '估值安全边际', key: 'valuation', weight: '25%', maxScore: 25 },
  { name: '催化剂', key: 'catalyst', weight: '10%', maxScore: 10 },
  { name: '风险扣分', key: 'risk', weight: '扣分', maxScore: 0 },
]

// v2.2 评级列表（含 S+/A+/B+）
const V22_GRADES = ['S', 'A+', 'A', 'B+', 'B', 'C', 'D']

// 将 v22_results 合并到 companies 数据中
function buildV22Companies() {
  // 按 code 建 v22 索引
  const v22Map = {}
  v22Raw.forEach(item => {
    v22Map[item.code] = item
  })
  const legacyMap = {}
  companiesV20.forEach(item => {
    legacyMap[item.code] = item
  })
  const indexMap = {}
  currentIndex.forEach(item => {
    indexMap[item.code] = item
  })

  const symbols = Array.from(new Set([
    ...companiesV20.map((item) => item.code),
    ...currentIndex.map((item) => item.code),
    ...Object.keys(v22Map),
    ...Object.keys(decisionState),
  ]))

  return symbols.map((symbol) => {
    const c = legacyMap[symbol] || { code: symbol, name: indexMap[symbol]?.name || symbol }
    const v22 = v22Map[c.code]
    const decision = decisionState[c.code] || {}
    const indexEntry = indexMap[c.code] || {}
    const decisionSignals = decision.signals || {}
    if (!v22) {
      // 没有 v22 数据的公司，标记 v22 不可用
      return {
        ...c,
        v22Available: false,
        status: c.status || 'analyzed',
        industry: c.industry || indexEntry.industry || '',
        swIndustry: c.swIndustry || c.industry || indexEntry.industry || '',
        decisionState: decision,
        decision_review_status: decision.review?.reviewStatus || decision.reviewStatus || '',
        decision_action: decision.review?.decisionAction || decision.decisionAction || '',
        decision_reason: decision.review?.decisionReason || decision.decisionReason || '',
        decision_review_deadline: decision.meta?.reviewDeadline || decision.reviewDeadline || '',
        decision_last_reviewed_at: decision.meta?.lastReviewedAt || decision.lastReviewedAt || '',
        decision_notes: decision.review?.reviewNotes || decision.reviewNotes || '',
        decision_portfolio_position: decision.portfolio?.portfolioPosition ?? decision.portfolioPosition ?? null,
        decision_target_position: decision.portfolio?.targetPosition || decision.targetPosition || '',
        v22_signal_status: indexEntry.signal_status || decisionSignals.signalStatus || 'stale',
        v22_signal_age_days: indexEntry.signal_age_days ?? decisionSignals.signalAgeDays ?? null,
        v22_stale_reason: indexEntry.stale_reason || decisionSignals.staleReason || '',
        v22_review_priority: indexEntry.review_priority || decisionSignals.reviewPriority || 'low',
        v22_checklist_auto_status: indexEntry.checklist_auto_status || 'unknown',
        v22_checklist_auto_score: null,
        v22_checklist_auto_reasons: [],
      }
    }
    return {
      ...c,
      v22Available: true,
      status: c.status || 'analyzed',
      industry: c.industry || indexEntry.industry || v22.industry || '',
      swIndustry: c.swIndustry || c.industry || indexEntry.industry || v22.industry || '',
      // v2.2 评分字段
      v22_score: v22.v22_total,
      v22_grade: v22.v22_grade,
      v22_base_grade: v22.v22_base_grade,
      v22_main: v22.v22_main,
      v22_moat: v22.v22_moat,
      v22_growth: v22.v22_growth,
      v22_profit: v22.v22_profit,
      v22_valuation: v22.v22_valuation,
      v22_catalyst: v22.v22_catalyst,
      v22_risk: v22.v22_risk,
      v22_details: v22.v22_details,
      v22_constraint: v22.constraint_hit,
      // 保留原始分和评级
      v22_orig_score: v22.orig_score,
      v22_orig_grade: v22.orig_grade,
      // v2.2 估值指标
      v22_pe: v22.pe,
      v22_pb: v22.pb,
      v22_roe: v22.roe,
      v22_dy: v22.dy,
      v22_data_gaps: v22.data_gaps || [],
      // 时效状态字段
      v22_signal_status: indexEntry.signal_status || v22.signal_status || decisionSignals.signalStatus || 'fresh',
      v22_signal_age_days: indexEntry.signal_age_days ?? v22.signal_age_days ?? decisionSignals.signalAgeDays ?? null,
      v22_stale_reason: indexEntry.stale_reason || v22.stale_reason || decisionSignals.staleReason || '',
      v22_review_priority: indexEntry.review_priority || v22.review_priority || decisionSignals.reviewPriority || 'low',
      v22_checklist_auto_status: indexEntry.checklist_auto_status || v22.checklist_auto_status || 'unknown',
      v22_checklist_auto_score: v22.checklist_auto_score ?? null,
      v22_checklist_auto_reasons: v22.checklist_auto_reasons || [],
      // 决策状态字段 - 新schema结构
      decisionState: decision,  // 完整传入，供详情页使用
      decision_review_status: decision.review?.reviewStatus || decision.reviewStatus || '',
      decision_action: decision.review?.decisionAction || decision.decisionAction || '',
      decision_reason: decision.review?.decisionReason || decision.decisionReason || '',
      decision_review_deadline: decision.meta?.reviewDeadline || decision.reviewDeadline || '',
      decision_last_reviewed_at: decision.meta?.lastReviewedAt || decision.lastReviewedAt || '',
      decision_notes: decision.review?.reviewNotes || decision.reviewNotes || '',
      decision_portfolio_position: decision.portfolio?.portfolioPosition ?? decision.portfolioPosition ?? null,
      decision_target_position: decision.portfolio?.targetPosition || decision.targetPosition || '',
    }
  })
}

const v22Companies = buildV22Companies()

export function ScoringProvider({ children }) {
  // 统一使用 v22Companies（已包含全部字段）
  const companies = v22Companies

  const dimensions = V22_DIMENSIONS
  const grades = V22_GRADES

  // 获取 v2.2 评分
  const getScore = (company, key) => {
    const keyMap = {
      moat: 'v22_moat',
      growth: 'v22_growth',
      profit: 'v22_profit',
      profitability: 'v22_profit', // 兼容
      valuation: 'v22_valuation',
      catalyst: 'v22_catalyst',
      risk: 'v22_risk',
    }
    return company[keyMap[key]] ?? 0
  }

  // 获取 v2.2 总分（优先），无则用 v2.0 总分
  const getTotalScore = (company) => {
    return company.v22_score || company.score || 0
  }

  // 获取 v2.2 评级（优先），无则用 v2.0 评级
  const getGrade = (company) => {
    return company.v22_grade || company.grade || '-'
  }

  // 获取当前版本评级颜色
  const getGradeColor = (grade) => {
    const colors = {
      'S': 'bg-red-500',
      'A+': 'bg-rose-500',
      'A': 'bg-orange-500',
      'B+': 'bg-lime-500',
      'B': 'bg-green-500',
      'C': 'bg-yellow-500',
      'D': 'bg-gray-500',
    }
    return colors[grade] || 'bg-gray-400'
  }

  // 获取当前版本评级标签
  const getGradeLabel = (grade) => {
    const labels = {
      'S': '极度低估', 'A+': '强烈买入', 'A': '买入',
      'B+': '偏强持有', 'B': '持有', 'C': '观望', 'D': '规避',
    }
    return labels[grade] || '待评级'
  }

  // 分数颜色（v2.2 按原始分/满分比例）
  const getScoreColor = (score, maxScore) => {
    const max = maxScore || 25
    const ratio = max > 0 ? score / max : 0
    // v2.2 用满分比例
    if (ratio >= 0.9) return 'text-red-600 font-bold'
    if (ratio >= 0.75) return 'text-orange-600 font-semibold'
    if (ratio >= 0.6) return 'text-green-600'
    if (ratio >= 0.4) return 'text-yellow-600'
    return 'text-gray-600'
  }

  // 判断是否可执行 - 四层决策
  // isActionable = signal_status !== 'stale' && checklist_auto_status === 'pass' && decision_review_status === 'approved' && 无data_gaps + 无constraint + action in [buy, add]
  const isActionable = (company) => {
    const signalStatus = company.v22_signal_status
    const checklistStatus = company.v22_checklist_auto_status
    const decisionStatus = company.decision_review_status
    const decisionAction = company.decision_action
    const dataGaps = company.v22_data_gaps
    const constraintHit = company.v22_constraint
    
    return (
      signalStatus !== 'stale' &&
      checklistStatus === 'pass' &&
      decisionStatus === 'approved' &&
      !(dataGaps && dataGaps.length > 0) &&
      !constraintHit &&
      ['buy', 'add'].includes(decisionAction)
    )
  }

  // 获取复核状态徽章
  const getReviewBadge = (company) => {
    const signalStatus = company.v22_signal_status
    const decisionStatus = company.decision_review_status
    
    // 优先级：stale > needs_review > fresh
    if (signalStatus === 'stale' || decisionStatus === 'stale') {
      return { label: '已过期', color: 'bg-red-100 text-red-800' }
    }
    if (decisionStatus === 'needs_review' || signalStatus === 'needs_review') {
      return { label: '待复核', color: 'bg-yellow-100 text-yellow-800' }
    }
    if (decisionStatus === 'approved') {
      return { label: '已确认', color: 'bg-green-100 text-green-800' }
    }
    if (decisionStatus === 'rejected') {
      return { label: '已否决', color: 'bg-gray-100 text-gray-800' }
    }
    return { label: '待处理', color: 'bg-gray-100 text-gray-600' }
  }

  // 动作映射文案
  const getActionLabel = (action) => {
    const labels = {
      buy: '买入',
      add: '加仓',
      hold: '持有',
      trim: '减仓',
      watch: '观察',
      avoid: '规避',
    }
    return labels[action] || action
  }

  const value = useMemo(() => ({
    companies,
    dimensions,
    grades,
    getScore,
    getTotalScore,
    getGrade,
    getGradeColor,
    getGradeLabel,
    getScoreColor,
    isActionable,
    getReviewBadge,
    getActionLabel,
  }), [companies])

  return (
    <ScoringContext.Provider value={value}>
      {children}
    </ScoringContext.Provider>
  )
}

export function useScoring() {
  const ctx = useContext(ScoringContext)
  if (!ctx) throw new Error('useScoring must be used within ScoringProvider')
  return ctx
}
