import { useMemo } from 'react'
import companies from '../data/companies.json'

export default function Dashboard() {
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