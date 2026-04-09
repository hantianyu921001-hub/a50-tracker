import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import companies from '../data/companies.json'

// SVG雷达图组件
function RadarChart({ industry, overall }) {
  const dims = [
    { label: '护城河', iKey: 'avgMoat', oKey: 'moat' },
    { label: '成长性', iKey: 'avgGrowth', oKey: 'growth' },
    { label: '盈利质量', iKey: 'avgProfit', oKey: 'profit' },
    { label: '估值', iKey: 'avgValuation', oKey: 'valuation' },
    { label: '催化剂', iKey: 'avgCatalyst', oKey: 'catalyst' },
  ]
  const cx = 150, cy = 120, r = 90
  const points = dims.map((d, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
    const iVal = (industry[d.iKey] || 0) / 100
    const oVal = (overall[d.oKey] || 0) / 100
    return {
      label: d.label,
      ix: cx + r * iVal * Math.cos(angle),
      iy: cy + r * iVal * Math.sin(angle),
      ox: cx + r * oVal * Math.cos(angle),
      oy: cy + r * oVal * Math.sin(angle),
      lx: cx + (r + 25) * Math.cos(angle),
      ly: cy + (r + 25) * Math.sin(angle),
      iVal: industry[d.iKey] || 0,
      oVal: overall[d.oKey] || 0,
    }
  })
  const industryPath = points.map(p => `${p.ix},${p.iy}`).join(' ')
  const overallPath = points.map(p => `${p.ox},${p.oy}`).join(' ')

  return (
    <svg width="300" height="280" viewBox="0 0 300 280">
      {/* 背景环 */}
      {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
        <polygon
          key={scale}
          points={dims.map((_, i) => {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
            return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`
          }).join(' ')}
          fill="none" stroke="#e5e7eb" strokeWidth="0.5"
        />
      ))}
      {/* 轴线 */}
      {dims.map((_, i) => {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
        return (
          <line key={i} x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
            stroke="#d1d5db" strokeWidth="0.5" />
        )
      })}
      {/* A50整体（灰色填充） */}
      <polygon points={overallPath} fill="rgba(156,163,175,0.15)" stroke="#9ca3af" strokeWidth="1.5" />
      {/* 行业（蓝色填充） */}
      <polygon points={industryPath} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
      {/* 标签+数值 */}
      {points.map((p, i) => (
        <g key={i}>
          <text x={p.lx} y={p.ly}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="11" fill="#374151" fontWeight="500">
            {p.label}
          </text>
          <text x={p.lx} y={p.ly + 13}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="9" fill="#6b7280">
            {p.iVal} / {p.oVal}
          </text>
        </g>
      ))}
      {/* 图例 */}
      <rect x="60" y="255" width="12" height="12" fill="rgba(59,130,246,0.3)" stroke="#3b82f6" />
      <text x="78" y="266" fontSize="10" fill="#374151">{industry.name}均值</text>
      <rect x="170" y="255" width="12" height="12" fill="rgba(156,163,175,0.3)" stroke="#9ca3af" />
      <text x="188" y="266" fontSize="10" fill="#374151">A50整体</text>
    </svg>
  )
}

export default function IndustryPage() {
  const [expandedIndustry, setExpandedIndustry] = useState(null)

  // 按申万一级行业分组（包含所有公司）
  const industryGroups = useMemo(() => {
    const allCompanies = companies
    const groups = {}
    allCompanies.forEach(c => {
      const sw = c.swIndustry || '其他'
      if (!groups[sw]) groups[sw] = []
      groups[sw].push(c)
    })
    return Object.entries(groups)
      .map(([name, comps]) => {
        const analyzed = comps.filter(c => c.status === 'analyzed')
        const avgScore = analyzed.length > 0
          ? Math.round(analyzed.reduce((s, c) => s + (c.score || 0), 0) / analyzed.length)
          : 0
        const avgMoat = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + (c.moat || 0), 0) / analyzed.length) : 0
        const avgGrowth = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + (c.growth || 0), 0) / analyzed.length) : 0
        const avgProfit = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + (c.profitability || c.other || 0), 0) / analyzed.length) : 0
        const avgValuation = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + (c.valuation || 0), 0) / analyzed.length) : 0
        const avgCatalyst = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + (c.catalyst || c.other || 0), 0) / analyzed.length) : 0
        return {
          name,
          companies: comps.sort((a, b) => (b.score || 0) - (a.score || 0)),
          count: comps.length,
          analyzedCount: analyzed.length,
          avgScore,
          avgMoat, avgGrowth, avgProfit, avgValuation, avgCatalyst,
        }
      })
      .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore)
  }, [])

  // 整体均值（包含所有已分析公司）
  const overallAvg = useMemo(() => {
    const analyzed = companies.filter(c => c.status === 'analyzed')
    if (analyzed.length === 0) return { moat: 0, growth: 0, profit: 0, valuation: 0, catalyst: 0 }
    return {
      moat: Math.round(analyzed.reduce((s, c) => s + (c.moat || 0), 0) / analyzed.length),
      growth: Math.round(analyzed.reduce((s, c) => s + (c.growth || 0), 0) / analyzed.length),
      profit: Math.round(analyzed.reduce((s, c) => s + (c.profitability || c.other || 0), 0) / analyzed.length),
      valuation: Math.round(analyzed.reduce((s, c) => s + (c.valuation || 0), 0) / analyzed.length),
      catalyst: Math.round(analyzed.reduce((s, c) => s + (c.catalyst || c.other || 0), 0) / analyzed.length),
    }
  }, [])

  const getGradeColor = (grade) => {
    const colors = { 'S': 'bg-red-500', 'A': 'bg-orange-500', 'B': 'bg-green-500', 'C': 'bg-yellow-500', 'D': 'bg-gray-500' }
    return colors[grade] || 'bg-gray-400'
  }

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-red-600 font-bold'
    if (score >= 80) return 'text-orange-600 font-semibold'
    if (score >= 70) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-gray-600'
  }

  // 行业卡片背景色（按公司数量深浅）
  const getIndustryBg = (count) => {
    if (count >= 4) return 'bg-blue-50 border-blue-200 hover:border-blue-400'
    if (count >= 3) return 'bg-indigo-50 border-indigo-200 hover:border-indigo-400'
    if (count >= 2) return 'bg-sky-50 border-sky-200 hover:border-sky-400'
    return 'bg-gray-50 border-gray-200 hover:border-gray-400'
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">行业分布</h2>
        <p className="text-gray-600">全部公司按申万一级行业分类对比（共{industryGroups.length}个行业）</p>
      </div>

      {/* 行业卡片网格 - 紧凑布局 */}
      <div className="grid grid-cols-15 gap-1.5 mb-6">
        {industryGroups.map(group => (
          <div
            key={group.name}
            onClick={() => setExpandedIndustry(expandedIndustry === group.name ? null : group.name)}
            className={`cursor-pointer rounded-md px-1 py-1.5 border transition-all hover:shadow-sm text-center ${
              expandedIndustry === group.name
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : getIndustryBg(group.count)
            }`}
          >
            <div className="text-[11px] font-bold text-gray-900 truncate leading-tight" title={group.name}>{group.name}</div>
            <div className="flex items-baseline justify-center gap-0.5 mt-0.5">
              <span className="text-sm font-bold text-blue-600">{group.count}</span>
              <span className="text-[9px] text-gray-500">家</span>
            </div>
            <div className="text-[9px] text-gray-500 leading-tight">
              均分<span className="font-semibold text-gray-700 ml-0.5">{group.avgScore || '-'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 展开的行业详情 */}
      {expandedIndustry && (() => {
        const group = industryGroups.find(g => g.name === expandedIndustry)
        if (!group) return null
        return (
          <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {group.name}（{group.count}家，已分析{group.analyzedCount}家）
              </h3>
              <button
                onClick={() => setExpandedIndustry(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 公司对比表 */}
              <div className="lg:col-span-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 text-left font-medium text-gray-600">公司</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">评级</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">总分</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">护城河</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">成长性</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">盈利质量</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">估值</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">催化剂</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.companies.map(company => (
                      <tr
                        key={company.code}
                        className="border-b hover:bg-blue-50 cursor-pointer"
                        onClick={() => window.location.href = `/company/${company.code}`}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{company.name}</div>
                          <div className="text-xs text-gray-500">{company.code}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`${getGradeColor(company.grade)} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                            {company.grade || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={getScoreColor(company.score || 0)}>{company.score || '-'}</span>
                        </td>
                        <td className="px-3 py-2 text-center">{company.moat || '-'}</td>
                        <td className="px-3 py-2 text-center">{company.growth || '-'}</td>
                        <td className="px-3 py-2 text-center">{company.profitability || company.other || '-'}</td>
                        <td className="px-3 py-2 text-center">{company.valuation || '-'}</td>
                        <td className="px-3 py-2 text-center">{company.catalyst || company.other || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 雷达图 */}
              <div className="flex justify-center items-start">
                <RadarChart industry={group} overall={overallAvg} />
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}