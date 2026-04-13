import { createContext, useContext, useState, useMemo } from 'react'
import companiesV20 from '../data/companies.json'
import v22Raw from '../../v22_results.json'

const ScoringContext = createContext()

// v2.2 评级列表（含 S+/A+/B+）
const V22_GRADES = ['S', 'A+', 'A', 'B+', 'B', 'C', 'D']
// v2.0 评级列表
const V20_GRADES = ['S', 'A', 'B', 'C', 'D']

// v2.2 维度定义（原始分满分不是100）
const V22_DIMENSIONS = [
  { name: '护城河', key: 'moat', weight: '25%', maxScore: 25 },
  { name: '成长性', key: 'growth', weight: '20%', maxScore: 20 },
  { name: '盈利质量', key: 'profit', weight: '20%', maxScore: 20 },
  { name: '估值安全边际', key: 'valuation', weight: '25%', maxScore: 25 },
  { name: '催化剂', key: 'catalyst', weight: '10%', maxScore: 10 },
  { name: '风险扣分', key: 'risk', weight: '扣分', maxScore: 0 },
]

// v2.0 维度定义（百分制）
const V20_DIMENSIONS = [
  { name: '护城河', key: 'moat', weight: '25%', maxScore: 100 },
  { name: '成长性', key: 'growth', weight: '20%', maxScore: 100 },
  { name: '盈利质量', key: 'profitability', weight: '20%', maxScore: 100 },
  { name: '估值安全边际', key: 'valuation', weight: '25%', maxScore: 100 },
  { name: '催化剂', key: 'catalyst', weight: '10%', maxScore: 100 },
]

// 将 v22_results 合并到 companies 数据中
function buildV22Companies() {
  // 按 code 建 v22 索引
  const v22Map = {}
  v22Raw.forEach(item => {
    v22Map[item.code] = item
  })

  // 遍历 v20 公司列表，合并 v22 数据
  return companiesV20.map(c => {
    const v22 = v22Map[c.code]
    if (!v22) {
      // 没有 v22 数据的公司，标记 v22 不可用
      return { ...c, v22Available: false }
    }
    return {
      ...c,
      v22Available: true,
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
    }
  })
}

const v22Companies = buildV22Companies()

// 从 localStorage 读取版本，刷新后记住用户选择
function getInitialVersion() {
  try {
    const saved = localStorage.getItem('a50_scoring_version')
    if (saved === 'v20' || saved === 'v22') return saved
  } catch (e) { /* ignore */ }
  return 'v20'
}

export function ScoringProvider({ children }) {
  const [version, setVersionRaw] = useState(getInitialVersion) // 'v20' | 'v22'

  // 切换版本时同步到 localStorage
  const setVersion = (v) => {
    setVersionRaw(v)
    try { localStorage.setItem('a50_scoring_version', v) } catch (e) { /* ignore */ }
  }

  const isV22 = version === 'v22'

  // 当前版本的公司数据
  const companies = isV22 ? v22Companies : companiesV20

  // 当前版本的维度定义
  const dimensions = isV22 ? V22_DIMENSIONS : V20_DIMENSIONS

  // 当前版本的评级列表
  const grades = isV22 ? V22_GRADES : V20_GRADES

  // 获取公司当前版本的评分
  const getScore = (company, key) => {
    if (!isV22) {
      // v2.0: 兼容 old other 字段
      if (key === 'profitability') return company.profitability || company.other || 0
      if (key === 'catalyst') return company.catalyst || company.other || 0
      return company[key] || 0
    }
    // v2.2
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

  // 获取当前版本总分
  const getTotalScore = (company) => {
    return isV22 ? (company.v22_score || 0) : (company.score || 0)
  }

  // 获取当前版本评级
  const getGrade = (company) => {
    return isV22 ? (company.v22_grade || '-') : (company.grade || '-')
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
    if (isV22) {
      const labels = {
        'S': '极度低估', 'A+': '强烈买入', 'A': '买入',
        'B+': '偏强持有', 'B': '持有', 'C': '观望', 'D': '规避',
      }
      return labels[grade] || '待评级'
    }
    const labels = {
      'S': '强烈买入', 'A': '买入', 'B': '持有', 'C': '观望', 'D': '规避',
    }
    return labels[grade] || '待评级'
  }

  // 分数颜色（v2.2 按原始分/满分比例，v2.0 按百分制）
  const getScoreColor = (score, maxScore) => {
    const max = maxScore || (isV22 ? 25 : 100)
    const ratio = max > 0 ? score / max : 0
    if (isV22) {
      // v2.2 用满分比例
      if (ratio >= 0.9) return 'text-red-600 font-bold'
      if (ratio >= 0.75) return 'text-orange-600 font-semibold'
      if (ratio >= 0.6) return 'text-green-600'
      if (ratio >= 0.4) return 'text-yellow-600'
      return 'text-gray-600'
    }
    if (ratio >= 0.9) return 'text-red-600 font-bold'
    if (ratio >= 0.8) return 'text-orange-600 font-semibold'
    if (ratio >= 0.7) return 'text-green-600'
    if (ratio >= 0.6) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const value = useMemo(() => ({
    version,
    setVersion,
    isV22,
    companies,
    dimensions,
    grades,
    getScore,
    getTotalScore,
    getGrade,
    getGradeColor,
    getGradeLabel,
    getScoreColor,
  }), [version])

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
