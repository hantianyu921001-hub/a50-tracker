import { useMemo, useState } from 'react'
import companies from '../data/companies.json'

export default function Dashboard() {
  const [sortField, setSortField] = useState('rank')
  const [sortOrder, setSortOrder] = useState('asc')

  const stats = useMemo(() => {
    const analyzed = companies.filter((c) => c.status === 'analyzed')
    const pending = companies.filter((c) => c.status === 'pending')

    const gradeDistribution = {}
    const industryDistribution = {}

    companies.forEach((c) => {
      if (c.grade && c.grade !== '-') {
        gradeDistribution[c.grade] = (gradeDistribution[c.grade] || 0) + 1
      }
      industryDistribution[c.industry] = (industryDistribution[c.industry] || 0) + 1
    })

    const avgScore = analyzed.length > 0
      ? (analyzed.reduce((sum, c) => sum + c.score, 0) / analyzed.length).toFixed(1)
      : 0

    const topCompanies = [...analyzed]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return {
      total: companies.length,
      analyzed: analyzed.length,
      pending: pending.length,
      avgScore,
      gradeDistribution,
      industryDistribution,
      topCompanies,
    }
  }, [])

  // 计算各维度分数并排序（五维度与评分规则/公司详情一致）
  const scoredCompanies = useMemo(() => {
    return companies
      .filter((c) => c.status === 'analyzed' && c.score != null)
      .map((c) => {
        // 兼容旧数据：优先取新字段，无则取 old 字段（同 CompanyDetail 逻辑）
        const moat = c.moat || 0
        const growth = c.growth || 0
        const profitability = c.profitability || c.other || 0
        const valuation = c.valuation || 0
        const catalyst = c.catalyst || c.other || 0
        const weightedScore = c.score || 0
        return {
          ...c,
          moatScore: moat,
          growthScore: growth,
          profitabilityScore: profitability,
          valuationScore: valuation,
          catalystScore: catalyst,
          weightedScore: weightedScore,
        }
      })
      .sort((a, b) => {
        let aVal, bVal
        switch (sortField) {
          case 'rank':
            aVal = a.rank; bVal = b.rank; break
          case 'moat':
            aVal = a.moatScore; bVal = b.moatScore; break
          case 'growth':
            aVal = a.growthScore; bVal = b.growthScore; break
          case 'profitability':
            aVal = a.profitabilityScore; bVal = b.profitabilityScore; break
          case 'valuation':
            aVal = a.valuationScore; bVal = b.valuationScore; break
          case 'catalyst':
            aVal = a.catalystScore; bVal = b.catalystScore; break
          case 'total':
          default:
            aVal = a.weightedScore; bVal = b.weightedScore
        }
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
      })
  }, [sortField, sortOrder])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
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
    const colors = {
      'S+': 'bg-red-500',
      'S': 'bg-orange-500',
      'A': 'bg-green-500',
      'B': 'bg-yellow-500',
      'C': 'bg-gray-500',
    }
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

  const gradeColors = {
    'S+': 'bg-red-500',
    'S': 'bg-orange-500',
    'A': 'bg-yellow-500',
    'B': 'bg-gray-500',
    'C': 'bg-red-700',
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">统计看板</h2>
        <p className="text-gray-600">中证A50成分股分析进度和分布</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">总数</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">已分析</div>
          <div className="text-3xl font-bold text-green-600">{stats.analyzed}</div>
          <div className="text-sm text-gray-500 mt-1">
            {((stats.analyzed / stats.total) * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">待分析</div>
          <div className="text-3xl font-bold text-gray-500">{stats.pending}</div>
          <div className="text-sm text-gray-500 mt-1">
            {((stats.pending / stats.total) * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">平均评分</div>
          <div className="text-3xl font-bold text-blue-600">{stats.avgScore}</div>
          <div className="text-sm text-gray-500 mt-1">/100</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">评级分布</h3>
          <div className="space-y-3">
            {['S+', 'S', 'A', 'B', 'C'].map((grade) => {
              const count = stats.gradeDistribution[grade] || 0
              const percentage = stats.analyzed > 0 ? (count / stats.analyzed) * 100 : 0
              return (
                <div key={grade} className="flex items-center">
                  <div className="w-12 text-sm font-medium text-gray-700">{grade}</div>
                  <div className="flex-1 ml-4">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full ${gradeColors[grade] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
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
              <div key={company.code} className="flex items-center">
                <div className="w-8 text-sm text-gray-500">{index + 1}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{company.name}</div>
                  <div className="text-xs text-gray-500">{company.code}</div>
                </div>
                <div className="text-lg font-bold text-gray-900">{company.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 各维度评分表格 */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          各维度评分明细（已分析 {scoredCompanies.length} 家）
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th
                  className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('rank')}
                >
                  A50排名 {getSortIcon('rank')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">公司</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">行业</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">评级</th>
                <th
                  className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total')}
                >
                  加权总分 {getSortIcon('total')}
                </th>
                <th
                  className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('moat')}
                >
                  护城河(25%) {getSortIcon('moat')}
                </th>
                <th
                  className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('growth')}
                >
                  成长性(20%) {getSortIcon('growth')}
                </th>
                <th
                  className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('profitability')}
                >
                  盈利质量(20%) {getSortIcon('profitability')}
                </th>
                <th
                  className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('valuation')}
                >
                  估值(25%) {getSortIcon('valuation')}
                </th>
                <th
                  className="px-3 py-2 text-center font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('catalyst')}
                >
                  催化剂(10%) {getSortIcon('catalyst')}
                </th>
              </tr>
            </thead>
            <tbody>
              {scoredCompanies.map((company, index) => (
                <tr
                  key={company.code}
                  className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/company/${company.code}`}
                >
                  <td className="px-3 py-2 text-center">
                    <span className="font-semibold text-gray-700">{company.rank}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-xs text-gray-500">{company.code}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{company.industry}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`${getGradeColor(company.grade)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                      {company.grade}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.weightedScore, 100)}>
                      {company.weightedScore}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.moatScore)}>
                      {company.moatScore}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.growthScore)}>
                      {company.growthScore}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.profitabilityScore)}>
                      {company.profitabilityScore}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.valuationScore)}>
                      {company.valuationScore}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={getScoreColor(company.catalystScore)}>
                      {company.catalystScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          * 加权总分按权重计算（满分100），点击表头可按该维度排序
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">行业分布</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(stats.industryDistribution)
            .sort(([, a], [, b]) => b - a)
            .map(([industry, count]) => (
              <div key={industry} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-600 mb-1">{industry}</div>
                <div className="text-lg font-semibold text-gray-900">{count}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}