import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import companies from '../data/companies.json'
import FilterBar from '../components/FilterBar'

export default function Home() {
  const [filters, setFilters] = useState({
    scope: 'all',
    search: '',
    grade: '',
    swIndustry: '',
    status: '',
  })
  const [sortField, setSortField] = useState('rank')
  const [sortOrder, setSortOrder] = useState('asc')

  // 申万一级行业列表
  const swIndustries = useMemo(() => {
    return [...new Set(companies.map(c => c.swIndustry).filter(Boolean))].sort()
  }, [])

  const grades = ['S', 'A', 'B', 'C', 'D']

  // 筛选
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      // 范围筛选
      if (filters.scope === 'a50' && !company.isA50) return false
      if (filters.search) {
        const s = filters.search.toLowerCase()
        if (!company.name.toLowerCase().includes(s) && !company.code.includes(s)) return false
      }
      if (filters.grade && company.grade !== filters.grade) return false
      if (filters.swIndustry && company.swIndustry !== filters.swIndustry) return false
      if (filters.status && company.status !== filters.status) return false
      return true
    })
  }, [filters])

  // 排序
  const sortedCompanies = useMemo(() => {
    const sorted = [...filteredCompanies].sort((a, b) => {
      let aVal, bVal
      switch (sortField) {
        case 'rank': aVal = a.rank || 999; bVal = b.rank || 999; break
        case 'score': aVal = a.score || 0; bVal = b.score || 0; break
        case 'moat': aVal = a.moat || 0; bVal = b.moat || 0; break
        case 'growth': aVal = a.growth || 0; bVal = b.growth || 0; break
        case 'profitability': aVal = a.profitability || a.other || 0; bVal = b.profitability || b.other || 0; break
        case 'valuation': aVal = a.valuation || 0; bVal = b.valuation || 0; break
        case 'catalyst': aVal = a.catalyst || a.other || 0; bVal = b.catalyst || b.other || 0; break
        default: aVal = a.score || 0; bVal = b.score || 0
      }
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
    })
    // A50范围按rank asc，全部范围按score desc
    if (sortField === 'rank' && filters.scope === 'all') {
      sorted.sort((a, b) => (b.score || 0) - (a.score || 0))
    }
    return sorted
  }, [filteredCompanies, sortField, sortOrder, filters.scope])

  // 统计数据
  const stats = useMemo(() => {
    const analyzed = filteredCompanies.filter(c => c.status === 'analyzed')
    const pending = filteredCompanies.filter(c => c.status === 'pending')
    const avgScore = analyzed.length > 0
      ? (analyzed.reduce((sum, c) => sum + (c.score || 0), 0) / analyzed.length).toFixed(1)
      : 0
    const gradeDistribution = {}
    analyzed.forEach(c => {
      if (c.grade && c.grade !== '-') {
        gradeDistribution[c.grade] = (gradeDistribution[c.grade] || 0) + 1
      }
    })
    const topCompanies = [...analyzed].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5)
    return { total: filteredCompanies.length, analyzed: analyzed.length, pending: pending.length, avgScore, gradeDistribution, topCompanies }
  }, [filteredCompanies])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return '⇅'
    return sortOrder === 'desc' ? '↓' : '↑'
  }

  const getGradeColor = (grade) => {
    const colors = { 'S': 'bg-red-500', 'A': 'bg-orange-500', 'B': 'bg-green-500', 'C': 'bg-yellow-500', 'D': 'bg-gray-500' }
    return colors[grade] || 'bg-gray-400'
  }

  const getScoreColor = (score, maxScore = 100) => {
    const ratio = score / maxScore
    if (ratio >= 0.9) return 'text-red-600 font-bold'
    if (ratio >= 0.8) return 'text-orange-600 font-semibold'
    if (ratio >= 0.7) return 'text-green-600'
    if (ratio >= 0.6) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const filtersWithCount = { ...filters, count: filteredCompanies.length }

  const analyzedCompanies = sortedCompanies.filter(c => c.status === 'analyzed' && c.score != null)

  return (
    <div>
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
          <div className="text-sm text-gray-600 mb-1">待分析</div>
          <div className="text-3xl font-bold text-gray-500">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="text-sm text-gray-600 mb-1">平均评分</div>
          <div className="text-3xl font-bold text-blue-600">{stats.avgScore}</div>
          <div className="text-sm text-gray-500 mt-1">/100</div>
        </div>
      </div>

      {/* 筛选栏 */}
      <FilterBar
        filters={filtersWithCount}
        onFilterChange={setFilters}
        swIndustries={swIndustries}
        grades={grades}
      />

      {/* 各维度评分明细表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          各维度评分明细
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
                <th className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('moat')}>
                  护城河(25%) {getSortIcon('moat')}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('growth')}>
                  成长性(20%) {getSortIcon('growth')}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('profitability')}>
                  盈利质量(20%) {getSortIcon('profitability')}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('valuation')}>
                  估值(25%) {getSortIcon('valuation')}
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('catalyst')}>
                  催化剂(10%) {getSortIcon('catalyst')}
                </th>
              </tr>
            </thead>
            <tbody>
              {analyzedCompanies.map(company => (
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
                    <span className={`${getGradeColor(company.grade)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                      {company.grade}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.score || 0)}>{company.score || '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.moat || 0)}>{company.moat || '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.growth || 0)}>{company.growth || '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.profitability || company.other || 0)}>{company.profitability || company.other || '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.valuation || 0)}>{company.valuation || '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.catalyst || company.other || 0)}>{company.catalyst || company.other || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          * 加权总分按权重计算（满分100），点击表头可按该维度排序，点击行跳转详情
        </div>
      </div>

      {/* 底部统计：评级分布 + Top5 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">评级分布</h3>
          <div className="space-y-3">
            {['S', 'A', 'B', 'C', 'D'].map(grade => {
              const count = stats.gradeDistribution[grade] || 0
              const percentage = stats.analyzed > 0 ? (count / stats.analyzed) * 100 : 0
              const gradeColors = { 'S': 'bg-red-500', 'A': 'bg-orange-500', 'B': 'bg-green-500', 'C': 'bg-yellow-500', 'D': 'bg-gray-500' }
              return (
                <div key={grade} className="flex items-center">
                  <div className="w-12 text-sm font-medium text-gray-700">{grade}</div>
                  <div className="flex-1 ml-4">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div className={`h-4 rounded-full ${gradeColors[grade] || 'bg-gray-500'}`} style={{ width: `${percentage}%` }}></div>
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
                <div className="text-lg font-bold text-gray-900">{company.score}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}