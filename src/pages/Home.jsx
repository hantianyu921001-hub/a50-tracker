import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useScoring } from '../context/ScoringContext'
import FilterBar from '../components/FilterBar'

export default function Home() {
  const { companies, grades, isV22, getTotalScore, getGrade, getGradeColor, getScoreColor, getScore, dimensions } = useScoring()

  const [filters, setFilters] = useState({
    scope: 'all',
    search: '',
    grade: '',
    swIndustry: '',
    status: '',
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
      case 'profit': aVal = getScore(a, isV22 ? 'profit' : 'profitability'); bVal = getScore(b, isV22 ? 'profit' : 'profitability'); break
        case 'valuation': aVal = getScore(a, 'valuation'); bVal = getScore(b, 'valuation'); break
        case 'catalyst': aVal = getScore(a, 'catalyst'); bVal = getScore(b, 'catalyst'); break
        case 'risk': aVal = getScore(a, 'risk'); bVal = getScore(b, 'risk'); break
        default: aVal = getTotalScore(a); bVal = getTotalScore(b)
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })
    return sorted
  }, [filteredCompanies, sortField, sortOrder, filters.scope, isV22, getTotalScore, getScore])

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

  // 维度表头：根据版本显示不同列
  const dimColumns = isV22
    ? [
        { key: 'moat', label: '护城河(25%)', max: 25 },
        { key: 'growth', label: '成长性(20%)', max: 20 },
        { key: 'profit', label: '盈利质量(20%)', max: 20 },
        { key: 'valuation', label: '估值(25%)', max: 25 },
        { key: 'catalyst', label: '催化(10%)', max: 10 },
        { key: 'risk', label: '风险扣分', max: 0 },
      ]
    : [
        { key: 'moat', label: '护城河(25%)', max: 100 },
        { key: 'profitability', label: '盈利质量(20%)', max: 100 },
        { key: 'growth', label: '成长性(20%)', max: 100 },
        { key: 'valuation', label: '估值(25%)', max: 100 },
        { key: 'catalyst', label: '催化剂(10%)', max: 100 },
      ]

  return (
    <div>
      {/* 版本提示 */}
      {isV22 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
          ⚠️ v2.2 执行增强版 — 评级门槛大幅提高（S≥90/A+≥85/A≥80），当前均分仅50.5，数据缺失约40%，评分偏保守
        </div>
      )}

      {/* 统计摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          <div className="text-sm text-gray-500 mt-1">/{isV22 ? '100' : '100'}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-600 mb-1">评分版本</div>
          <div className="text-3xl font-bold text-purple-600">{isV22 ? 'v2.2' : 'v2.0'}</div>
          <div className="text-sm text-gray-500 mt-1">{isV22 ? '执行增强版' : '修正版'}</div>
        </div>
      </div>

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
          <span className="text-sm font-normal text-gray-500 ml-2">（{isV22 ? 'v2.2 六维度' : 'v2.0 五维度'}模型）</span>
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
          {isV22
            ? '* v2.2原始分（非百分制），护城河/估值满分25，成长/盈利满分20，催化满分10，风险为扣分项。点击表头排序，点击行跳转详情'
            : '* 加权总分按权重计算（满分100），点击表头可按该维度排序，点击行跳转详情'
          }
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
