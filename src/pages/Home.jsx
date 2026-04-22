import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useScoring } from '../context/ScoringContext'
import FilterBar from '../components/FilterBar'
import { refreshCompany } from '../services/api'

function normalizeSymbol(input) {
  return input.replace(/\s+/g, '').replace(/[^0-9]/g, '').slice(0, 6)
}

export default function Home() {
  const navigate = useNavigate()
  const { companies, grades, getTotalScore, getGrade, getGradeColor, getScoreColor, getScore } = useScoring()
  const [symbol, setSymbol] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const [filters, setFilters] = useState({
    scope: 'all',
    search: '',
    grade: '',
    swIndustry: '',
    status: '',
    decisionAction: '', // 新增：决策动作筛选
    reviewStatus: '',    // 新增：复核状态筛选
  })
  // 默认排序：全部→总分降序，a50→排名(权重)升序
  const getDefaultSort = (scope) => scope === 'a50' ? { field: 'rank', order: 'asc' } : { field: 'score', order: 'desc' }
  const [sortField, setSortField] = useState('score')
  const [sortOrder, setSortOrder] = useState('desc')
  // 跟踪是否是用户主动切换的排序（非 scope 变化触发的默认排序）
  const [userSorted, setUserSorted] = useState(false)

  // 申万一级行业列表
  const swIndustries = useMemo(() => {
    return [...new Set(companies.map(c => c.swIndustry).filter(Boolean))].sort()
  }, [companies])

  // 筛选
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      if (filters.scope === 'a50' && !company.isA50) return false
      if (filters.search) {
        const s = filters.search.toLowerCase()
        if (!company.name.toLowerCase().includes(s) && !company.code.includes(s)) return false
      }
      if (filters.grade && getGrade(company) !== filters.grade) return false
      if (filters.swIndustry && company.swIndustry !== filters.swIndustry) return false
      if (filters.status && company.status !== filters.status) return false
      if (filters.decisionAction && company.decision_action !== filters.decisionAction) return false
      if (filters.reviewStatus && company.decision_review_status !== filters.reviewStatus) return false
      return true
    })
  }, [filters, companies, getGrade])

  // 排序
  const sortedCompanies = useMemo(() => {
    const sorted = [...filteredCompanies].sort((a, b) => {
      let aVal, bVal
      switch (sortField) {
        case 'rank': aVal = a.rank || 999; bVal = b.rank || 999; break
        case 'score': aVal = getTotalScore(a); bVal = getTotalScore(b); break
        case 'moat': aVal = getScore(a, 'moat'); bVal = getScore(b, 'moat'); break
        case 'growth': aVal = getScore(a, 'growth'); bVal = getScore(b, 'growth'); break
        case 'profitability':
      case 'profit': aVal = getScore(a, 'profit'); bVal = getScore(b, 'profit'); break
        case 'valuation': aVal = getScore(a, 'valuation'); bVal = getScore(b, 'valuation'); break
        case 'catalyst': aVal = getScore(a, 'catalyst'); bVal = getScore(b, 'catalyst'); break
        case 'risk': aVal = getScore(a, 'risk'); bVal = getScore(b, 'risk'); break
        default: aVal = getTotalScore(a); bVal = getTotalScore(b)
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })
    return sorted
  }, [filteredCompanies, sortField, sortOrder, filters.scope, getTotalScore, getScore])

  // 统计数据
  const stats = useMemo(() => {
    const analyzed = filteredCompanies.filter(c => c.status === 'analyzed')
    const avgScore = analyzed.length > 0
      ? (analyzed.reduce((sum, c) => sum + getTotalScore(c), 0) / analyzed.length).toFixed(1)
      : 0
    const gradeDistribution = {}
    analyzed.forEach(c => {
      const g = getGrade(c)
      if (g && g !== '-') {
        gradeDistribution[g] = (gradeDistribution[g] || 0) + 1
      }
    })
    const topCompanies = [...analyzed].sort((a, b) => getTotalScore(b) - getTotalScore(a)).slice(0, 5)
    return { total: filteredCompanies.length, analyzed: analyzed.length, avgScore, gradeDistribution, topCompanies }
  }, [filteredCompanies, getTotalScore, getGrade])

  const handleSort = (field) => {
    setUserSorted(true)
    if (sortField === field) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      // 排名默认升序（1在前），其他默认降序（高在前）
      setSortOrder(field === 'rank' ? 'asc' : 'desc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return '⇅'
    return sortOrder === 'desc' ? '↓' : '↑'
  }

  // scope 变化时重置为对应的默认排序
  const handleFilterChange = (newFilters) => {
    const scopeChanged = newFilters.scope !== filters.scope
    if (scopeChanged) {
      // scope 变了，重置排序为该 scope 的默认排序
      const def = getDefaultSort(newFilters.scope)
      setSortField(def.field)
      setSortOrder(def.order)
      setUserSorted(false)
    }
    setFilters(newFilters)
  }

  const filtersWithCount = { ...filters, count: filteredCompanies.length }

  const analyzedCompanies = sortedCompanies.filter(c => c.status === 'analyzed' && getTotalScore(c) != null)

  // 待处理队列（统一用v22数据）
  const needsReviewList = useMemo(() => {
    return companies.filter(c => c.v22_signal_status === 'needs_review' || c.decision_review_status === 'needs_review').slice(0, 5)
  }, [companies])

  const staleList = useMemo(() => {
    return companies.filter(c => c.v22_signal_status === 'stale').slice(0, 5)
  }, [companies])

  const highPriorityList = useMemo(() => {
    return companies.filter(c => c.v22_review_priority === 'high').slice(0, 5)
  }, [companies])

  const actionableList = useMemo(() => {
    return companies.filter(c => {
      const signalStatus = c.v22_signal_status
      const decisionStatus = c.decision_review_status
      const decisionAction = c.decision_action
      const dataGaps = c.v22_data_gaps
      const constraint = c.v22_constraint
      
      // 双状态联合决策：只有满足以下条件才算可执行
      return (
        signalStatus !== 'stale' &&
        decisionStatus === 'approved' &&
        !(dataGaps && dataGaps.length > 0) &&
        !constraint &&
        ['buy', 'add'].includes(decisionAction)
      )
    }).slice(0, 5)
  }, [companies])

  const actionLabels = { buy: '买入', add: '加仓', hold: '持有', trim: '减仓', watch: '观察', avoid: '规避' }
  const normalizedSymbol = useMemo(() => normalizeSymbol(symbol), [symbol])
  const isValidSymbol = /^\d{6}$/.test(normalizedSymbol)

  const handleAnalyzeNow = async (event) => {
    event.preventDefault()
    if (!isValidSymbol || submitting) return

    setSubmitting(true)
    setSubmitMessage('正在抓取外部数据并执行自动分析...')
    try {
      const result = await refreshCompany(normalizedSymbol, {
        analysisType: 'external',
        trigger: 'manual',
        triggerReason: `首页新增公司并立即分析 ${normalizedSymbol}`,
      })
      setSubmitMessage(`✅ ${result.message}`)
      navigate(`/company/${normalizedSymbol}`)
    } catch (error) {
      setSubmitMessage(`❌ ${error.message || '自动分析失败'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // 维度表头：统一使用v2.2六维度列
  const dimColumns = [
    { key: 'moat', label: '护城河(25%)', max: 25 },
    { key: 'growth', label: '成长性(20%)', max: 20 },
    { key: 'profit', label: '盈利质量(20%)', max: 20 },
    { key: 'valuation', label: '估值(25%)', max: 25 },
    { key: 'catalyst', label: '催化(10%)', max: 10 },
    { key: 'risk', label: '风险扣分', max: 0 },
  ]

  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
        <form className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between" onSubmit={handleAnalyzeNow}>
          <div className="flex-1 max-w-xl">
            <div className="text-sm font-medium text-gray-900 mb-1">新增公司分析</div>
            <div className="text-sm text-gray-500 mb-3">
              输入 6 位股票代码，直接触发自动分析并入档。
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="例如：601288"
              value={symbol}
              onChange={(event) => setSymbol(normalizeSymbol(event.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-lg tracking-[0.2em] text-gray-900 outline-none transition-colors focus:border-blue-400"
            />
            <div className={`mt-2 text-sm ${symbol && !isValidSymbol ? 'text-red-600' : 'text-gray-500'}`}>
              {symbol && !isValidSymbol ? '请输入 6 位股票代码' : '支持从空系统直接初始化公司分析档案'}
            </div>
            {submitMessage && (
              <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${
                submitMessage.startsWith('✅')
                  ? 'border border-green-200 bg-green-50 text-green-700'
                  : submitMessage.startsWith('❌')
                    ? 'border border-red-200 bg-red-50 text-red-700'
                    : 'border border-blue-200 bg-blue-50 text-blue-700'
              }`}>
                {submitMessage}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!isValidSymbol || submitting}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isValidSymbol && !submitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting ? '分析中...' : '添加并立即分析'}
            </button>
          </div>
        </form>
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-600 mb-1">总数</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-600 mb-1">已分析</div>
          <div className="text-3xl font-bold text-green-600">{stats.analyzed}</div>
          <div className="text-sm text-gray-500 mt-1">{stats.total > 0 ? ((stats.analyzed / stats.total) * 100).toFixed(0) : 0}%</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-600 mb-1">平均评分</div>
          <div className="text-3xl font-bold text-blue-600">{stats.avgScore}</div>
          <div className="text-sm text-gray-500 mt-1">/100（v2.2）</div>
        </div>
      </div>

      {/* 待处理队列 */}
      {(needsReviewList.length > 0 || staleList.length > 0 || highPriorityList.length > 0 || actionableList.length > 0) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">📋 待处理队列</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 待复核 */}
            {needsReviewList.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm font-medium text-yellow-800 mb-2">⏳ 待复核 ({needsReviewList.length})</div>
                <div className="space-y-1">
                  {needsReviewList.map(c => (
                    <Link key={c.code} to={`/company/${c.code}`} className="flex justify-between text-xs text-yellow-900 hover:underline">
                      <span>{c.name}</span>
                      <span>{actionLabels[c.decision_action] || '-'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* 已过期 */}
            {staleList.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm font-medium text-red-800 mb-2">⚠️ 已过期 ({staleList.length})</div>
                <div className="space-y-1">
                  {staleList.map(c => (
                    <Link key={c.code} to={`/company/${c.code}`} className="flex justify-between text-xs text-red-900 hover:underline">
                      <span>{c.name}</span>
                      <span>{c.v22_signal_age_days}天</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* 高优先级 */}
            {highPriorityList.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-sm font-medium text-orange-800 mb-2">🔴 高优先级 ({highPriorityList.length})</div>
                <div className="space-y-1">
                  {highPriorityList.map(c => (
                    <Link key={c.code} to={`/company/${c.code}`} className="flex justify-between text-xs text-orange-900 hover:underline">
                      <span>{c.name}</span>
                      <span>{c.v22_review_priority}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* 可执行 */}
            {actionableList.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-800 mb-2">✅ 可执行 ({actionableList.length})</div>
                <div className="space-y-1">
                  {actionableList.map(c => (
                    <Link key={c.code} to={`/company/${c.code}`} className="flex justify-between text-xs text-green-900 hover:underline">
                      <span>{c.name}</span>
                      <span>{actionLabels[c.decision_action] || '-'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 筛选栏 */}
      <FilterBar
        filters={filtersWithCount}
        onFilterChange={handleFilterChange}
        swIndustries={swIndustries}
        grades={grades}
      />

      {/* 各维度评分明细表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          各维度评分明细
          <span className="text-sm font-normal text-gray-500 ml-2">（v2.2 六维度模型）</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('rank')}>
                  排名 {getSortIcon('rank')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">公司</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">申万行业</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">评级</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">决策</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('score')}>
                  总分 {getSortIcon('score')}
                </th>
                {dimColumns.map(col => (
                  <th key={col.key} className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort(col.key)}>
                    {col.label} {getSortIcon(col.key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analyzedCompanies.map((company, idx) => (
                <tr
                  key={company.code}
                  className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/company/${company.code}`}
                >
                  <td className="px-3 py-2 text-center font-semibold text-gray-700">{company.isA50 && company.rank ? company.rank : '-'}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-xs text-gray-500">{company.code}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{company.swIndustry}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`${getGradeColor(getGrade(company))} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                      {getGrade(company)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {company.decision_action ? (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        company.decision_action === 'buy' ? 'bg-green-100 text-green-800' :
                        company.decision_action === 'add' ? 'bg-lime-100 text-lime-800' :
                        company.decision_action === 'hold' ? 'bg-blue-100 text-blue-800' :
                        company.decision_action === 'watch' ? 'bg-yellow-100 text-yellow-800' :
                        company.decision_action === 'sell' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {actionLabels[company.decision_action] || company.decision_action}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(getTotalScore(company), 100)}>{getTotalScore(company)}</span>
                  </td>
                  {dimColumns.map(col => {
                    const val = getScore(company, col.key)
                    const isRisk = col.key === 'risk'
                    return (
                      <td key={col.key} className="px-3 py-2 text-center">
                        <span className={isRisk && val < 0 ? 'text-red-600 font-semibold' : (isRisk ? 'text-green-600' : getScoreColor(val, col.max))}>
                          {isRisk ? (val < 0 ? val : (val > 0 ? `+${val}` : '0')) : (val || '-')}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          * v2.2原始分（非百分制），护城河/估值满分25，成长/盈利满分20，催化满分10，风险为扣分项。点击表头排序，点击行跳转详情
        </div>
      </div>

      {/* 底部统计：评级分布 + Top5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">评级分布</h3>
          <div className="space-y-3">
            {grades.map(grade => {
              const count = stats.gradeDistribution[grade] || 0
              const percentage = stats.analyzed > 0 ? (count / stats.analyzed) * 100 : 0
              return (
                <div key={grade} className="flex items-center">
                  <div className="w-12 text-sm font-medium text-gray-700">{grade}</div>
                  <div className="flex-1 ml-4">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className={`h-4 rounded-full ${getGradeColor(grade)}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                  <div className="ml-4 text-sm text-gray-600">{count}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 评分</h3>
          <div className="space-y-3">
            {stats.topCompanies.map((company, index) => (
              <Link key={company.code} to={`/company/${company.code}`} className="flex items-center hover:bg-gray-50 rounded px-2 py-1 -mx-2">
                <div className="w-8 text-sm text-gray-500">{index + 1}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{company.name}</div>
                  <div className="text-xs text-gray-500">{company.code}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${getGradeColor(getGrade(company))} text-white px-1.5 py-0.5 rounded text-xs font-bold`}>
                    {getGrade(company)}
                  </span>
                  <div className="text-lg font-bold text-gray-900">{getTotalScore(company)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
