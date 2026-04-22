import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useScoring } from '../context/ScoringContext'

// SVG雷达图组件 - 统一使用v2.2六维模型
function RadarChart({ industry, overall }) {
  const dims = [
    { label: '护城河', iKey: 'avgMoat', oKey: 'moat', max: 25 },
    { label: '成长性', iKey: 'avgGrowth', oKey: 'growth', max: 20 },
    { label: '盈利', iKey: 'avgProfit', oKey: 'profit', max: 20 },
    { label: '估值', iKey: 'avgValuation', oKey: 'valuation', max: 25 },
    { label: '催化', iKey: 'avgCatalyst', oKey: 'catalyst', max: 10 },
    { label: '风险', iKey: 'avgRisk', oKey: 'risk', max: 15 },
  ]

  const numDims = dims.length
  const cx = 150, cy = 120, r = 90
  const points = dims.map((d, i) => {
    const angle = (Math.PI * 2 * i) / numDims - Math.PI / 2
    const iVal = Math.max(0, (industry[d.iKey] || 0)) / d.max
    const oVal = Math.max(0, (overall[d.oKey] || 0)) / d.max
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

  const svgH = numDims === 6 ? 300 : 280

  return (
    <svg width="300" height={svgH} viewBox={`0 0 300 ${svgH}`}>
      {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
        <polygon
          key={scale}
          points={dims.map((_, i) => {
            const angle = (Math.PI * 2 * i) / numDims - Math.PI / 2
            return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`
          }).join(' ')}
          fill="none" stroke="#e5e7eb" strokeWidth="0.5"
        />
      ))}
      {dims.map((_, i) => {
        const angle = (Math.PI * 2 * i) / numDims - Math.PI / 2
        return (
          <line key={i} x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
            stroke="#d1d5db" strokeWidth="0.5" />
        )
      })}
      <polygon points={overallPath} fill="rgba(156,163,175,0.15)" stroke="#9ca3af" strokeWidth="1.5" />
      <polygon points={industryPath} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
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
      <rect x="60" y={svgH - 25} width="12" height="12" fill="rgba(59,130,246,0.3)" stroke="#3b82f6" />
      <text x="78" y={svgH - 14} fontSize="10" fill="#374151">{industry.name}均值</text>
      <rect x="170" y={svgH - 25} width="12" height="12" fill="rgba(156,163,175,0.3)" stroke="#9ca3af" />
      <text x="188" y={svgH - 14} fontSize="10" fill="#374151">A50整体</text>
    </svg>
  )
}

export default function IndustryPage() {
  const { companies, getTotalScore, getGrade, getGradeColor, getScoreColor, getScore } = useScoring()
  const [expandedIndustry, setExpandedIndustry] = useState(null)

  // 按申万一级行业分组
  const industryGroups = useMemo(() => {
    const groups = {}
    companies.forEach(c => {
      const sw = c.swIndustry || '其他'
      if (!groups[sw]) groups[sw] = []
      groups[sw].push(c)
    })
    return Object.entries(groups)
      .map(([name, comps]) => {
        const analyzed = comps.filter(c => c.status === 'analyzed')
        const avgScore = analyzed.length > 0
          ? Math.round(analyzed.reduce((s, c) => s + getTotalScore(c), 0) / analyzed.length)
          : 0
        const avgMoat = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + getScore(c, 'moat'), 0) / analyzed.length) : 0
        const avgGrowth = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + getScore(c, 'growth'), 0) / analyzed.length) : 0
        const avgProfit = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + getScore(c, 'profit'), 0) / analyzed.length) : 0
        const avgValuation = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + getScore(c, 'valuation'), 0) / analyzed.length) : 0
        const avgCatalyst = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + getScore(c, 'catalyst'), 0) / analyzed.length) : 0
        const avgRisk = analyzed.length > 0 ? Math.round(analyzed.reduce((s, c) => s + getScore(c, 'risk'), 0) / analyzed.length) : 0
        return {
          name,
          companies: comps.sort((a, b) => getTotalScore(b) - getTotalScore(a)),
          count: comps.length,
          analyzedCount: analyzed.length,
          avgScore,
          avgMoat, avgGrowth, avgProfit, avgValuation, avgCatalyst, avgRisk,
        }
      })
      .sort((a, b) => b.count - a.count || b.avgScore - a.avgScore)
  }, [companies, getTotalScore, getScore])

  // 整体均值
  const overallAvg = useMemo(() => {
    const analyzed = companies.filter(c => c.status === 'analyzed')
    if (analyzed.length === 0) return { moat: 0, growth: 0, profit: 0, valuation: 0, catalyst: 0, risk: 0 }
    return {
      moat: Math.round(analyzed.reduce((s, c) => s + getScore(c, 'moat'), 0) / analyzed.length),
      growth: Math.round(analyzed.reduce((s, c) => s + getScore(c, 'growth'), 0) / analyzed.length),
      profit: Math.round(analyzed.reduce((s, c) => s + getScore(c, 'profit'), 0) / analyzed.length),
      valuation: Math.round(analyzed.reduce((s, c) => s + getScore(c, 'valuation'), 0) / analyzed.length),
      catalyst: Math.round(analyzed.reduce((s, c) => s + getScore(c, 'catalyst'), 0) / analyzed.length),
      risk: Math.round(analyzed.reduce((s, c) => s + getScore(c, 'risk'), 0) / analyzed.length),
    }
  }, [companies, getScore])

  const getIndustryBg = (count) => {
    if (count >= 4) return 'bg-blue-50 border-blue-200 hover:border-blue-400'
    if (count >= 3) return 'bg-indigo-50 border-indigo-200 hover:border-indigo-400'
    if (count >= 2) return 'bg-sky-50 border-sky-200 hover:border-sky-400'
    return 'bg-gray-50 border-gray-200 hover:border-gray-400'
  }

  // 表格列 - v2.2六维模型
  const dimColumns = [
    { key: 'moat', label: '护城河', max: 25 },
    { key: 'growth', label: '成长性', max: 20 },
    { key: 'profit', label: '盈利', max: 20 },
    { key: 'valuation', label: '估值', max: 25 },
    { key: 'catalyst', label: '催化', max: 10 },
    { key: 'risk', label: '风险', max: 0 },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">行业分布</h2>
        <p className="text-gray-600">全部公司按申万一级行业分类对比（共{industryGroups.length}个行业，v2.2评分）</p>
      </div>

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
              <div className="lg:col-span-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 text-left font-medium text-gray-600">公司</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">评级</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">总分</th>
                      {dimColumns.map(col => (
                        <th key={col.key} className="px-3 py-2 text-center font-medium text-gray-600">{col.label}</th>
                      ))}
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
                          <span className={`${getGradeColor(getGrade(company))} text-white px-2 py-0.5 rounded text-xs font-bold`}>
                            {getGrade(company) || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={getScoreColor(getTotalScore(company), 100)}>{getTotalScore(company) || '-'}</span>
                        </td>
                        {dimColumns.map(col => {
                          const val = getScore(company, col.key)
                          const isRisk = col.key === 'risk'
                          return (
                            <td key={col.key} className="px-3 py-2 text-center">
                              <span className={isRisk && val < 0 ? 'text-red-600 font-semibold' : ''}>
                                {isRisk ? (val < 0 ? val : '0') : (val || '-')}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
