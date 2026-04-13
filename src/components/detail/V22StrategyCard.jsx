// v2.2 评级到操作建议的映射
const GRADE_STRATEGY = {
  'S': { action: '极度低估', desc: '安全边际极高，可重仓布局', position: '重仓（15-20%）', holding: '长期持有（3-5年）', color: 'red' },
  'A+': { action: '强烈买入', desc: '显著低估，建议积极建仓', position: '加重仓（10-15%）', holding: '中长期持有（2-3年）', color: 'rose' },
  'A': { action: '买入', desc: '合理偏低，可标准建仓', position: '标准仓位（8-10%）', holding: '中期持有（1-2年）', color: 'orange' },
  'B+': { action: '偏强持有', desc: '估值适中偏合理，持有为主', position: '标准仓位（5-8%）', holding: '持有等待催化剂', color: 'lime' },
  'B': { action: '持有', desc: '估值合理，持有等待催化', position: '轻仓（3-5%）', holding: '持有观察', color: 'green' },
  'C': { action: '观望', desc: '估值偏高或不确定性大，等待更好时机', position: '观望或极轻仓（0-3%）', holding: '等待回调', color: 'yellow' },
  'D': { action: '规避', desc: '估值过高或风险较大，不建议介入', position: '不建议建仓', holding: '—', color: 'gray' },
}

const colorMap = {
  red: { bg: 'bg-red-50', border: 'border-red-200', title: 'text-red-900', desc: 'text-red-800', badge: 'bg-red-500 text-white' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', title: 'text-rose-900', desc: 'text-rose-800', badge: 'bg-rose-500 text-white' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', title: 'text-orange-900', desc: 'text-orange-800', badge: 'bg-orange-500 text-white' },
  lime: { bg: 'bg-lime-50', border: 'border-lime-200', title: 'text-lime-900', desc: 'text-lime-800', badge: 'bg-lime-500 text-white' },
  green: { bg: 'bg-green-50', border: 'border-green-200', title: 'text-green-900', desc: 'text-green-800', badge: 'bg-green-500 text-white' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', title: 'text-yellow-900', desc: 'text-yellow-800', badge: 'bg-yellow-500 text-white' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', title: 'text-gray-700', desc: 'text-gray-600', badge: 'bg-gray-500 text-white' },
}

export default function V22StrategyCard({ grade, score, v22Details }) {
  const strategy = GRADE_STRATEGY[grade] || GRADE_STRATEGY['D']
  const c = colorMap[strategy.color]

  // 解析单个子项（兼容对象和字符串格式）
  const parseDetailItem = (item) => {
    if (!item) return null
    if (typeof item === 'object' && item.name !== undefined) {
      return { name: item.name, score: item.score ?? 0, max: item.max ?? 5 }
    }
    if (typeof item === 'string') {
      const match = item.match(/^(.+?)(-?\d+)\/(\d+)$/)
      if (!match) return null
      return { name: match[1], score: parseInt(match[2]), max: parseInt(match[3]) }
    }
    return null
  }

  // 从 v22_details 解析出各维度强弱分析
  const getDimSummary = (dimKey, maxScore) => {
    const items = v22Details?.[dimKey]
    if (!items || items.length === 0) return null
    const parsed = items.map(parseDetailItem).filter(Boolean)
    
    const strong = parsed.filter(p => p.score / p.max >= 0.8)
    const weak = parsed.filter(p => p.score / p.max <= 0.3)
    return { strong, weak, parsed }
  }

  const dimAnalysis = {
    moat: getDimSummary('moat', 25),
    growth: getDimSummary('growth', 20),
    profit: getDimSummary('profit', 20),
    valuation: getDimSummary('valuation', 25),
    catalyst: getDimSummary('catalyst', 10),
  }

  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">建仓策略</h2>

      {/* v2.2 操作建议 */}
      <div className={`${c.bg} rounded-lg p-4 border ${c.border} mb-4`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${c.badge}`}>
            {grade}
          </span>
          <span className={`text-xl font-bold ${c.title}`}>{strategy.action}</span>
        </div>
        <p className={`text-sm ${c.desc} mb-3`}>{strategy.desc}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/60 rounded-md p-2">
            <div className="text-xs text-gray-500">建议仓位</div>
            <div className="text-sm font-medium text-gray-900">{strategy.position}</div>
          </div>
          <div className="bg-white/60 rounded-md p-2">
            <div className="text-xs text-gray-500">持有策略</div>
            <div className="text-sm font-medium text-gray-900">{strategy.holding}</div>
          </div>
          <div className="bg-white/60 rounded-md p-2">
            <div className="text-xs text-gray-500">v2.2总分</div>
            <div className="text-sm font-medium text-gray-900">{score}/100</div>
          </div>
        </div>
      </div>

      {/* 维度强弱分析 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">各维度强弱分析</h3>
        {Object.entries(dimAnalysis).map(([key, analysis]) => {
          if (!analysis) return null
          const dimNames = { moat: '护城河', growth: '成长性', profit: '盈利质量', valuation: '估值安全', catalyst: '催化剂' }
          return (
            <div key={key} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-xs font-medium text-gray-600 mb-2">{dimNames[key]}</div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.parsed.map((item, i) => {
                  const ratio = item.score / item.max
                  const isStrong = ratio >= 0.8
                  const isWeak = ratio <= 0.3
                  return (
                    <span
                      key={i}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                        isStrong ? 'bg-green-100 text-green-800' :
                        isWeak ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.name}{item.score}/{item.max}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
