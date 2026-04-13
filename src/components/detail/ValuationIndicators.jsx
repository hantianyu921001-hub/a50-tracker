export default function ValuationIndicators({ pe, pb, roe, dy }) {
  const indicators = [
    { name: 'PE', value: pe, unit: '倍', level: pe !== null ? (pe < 15 ? '低' : pe < 30 ? '中' : '高') : null, color: pe !== null ? (pe < 15 ? 'green' : pe < 30 ? 'blue' : 'red') : 'gray' },
    { name: 'PB', value: pb, unit: '倍', level: pb !== null ? (pb < 1 ? '破净' : pb < 3 ? '低' : pb < 5 ? '中' : '高') : null, color: pb !== null ? (pb < 1 ? 'green' : pb < 3 ? 'blue' : pb < 5 ? 'yellow' : 'red') : 'gray' },
    { name: 'ROE', value: roe, unit: '%', level: roe !== null ? (roe >= 15 ? '优' : roe >= 10 ? '良' : roe >= 5 ? '中' : '差') : null, color: roe !== null ? (roe >= 15 ? 'green' : roe >= 10 ? 'blue' : roe >= 5 ? 'yellow' : 'red') : 'gray' },
    { name: '股息率', value: dy, unit: '%', level: dy !== null ? (dy >= 4 ? '高' : dy >= 2 ? '中' : '低') : null, color: dy !== null ? (dy >= 4 ? 'green' : dy >= 2 ? 'blue' : 'yellow') : 'gray' },
  ]

  const levelColors = {
    green: { bg: 'bg-green-50', text: 'text-green-800', badge: 'bg-green-100 text-green-700', border: 'border-green-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200' },
    red: { bg: 'bg-red-50', text: 'text-red-800', badge: 'bg-red-100 text-red-700', border: 'border-red-200' },
    gray: { bg: 'bg-gray-50', text: 'text-gray-400', badge: 'bg-gray-100 text-gray-500', border: 'border-gray-200' },
  }

  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        估值指标
        <span className="text-sm font-normal text-gray-500 ml-2">（v2.2 数据）</span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {indicators.map(ind => {
          const c = levelColors[ind.color]
          const hasData = ind.value !== null && ind.value !== undefined
          return (
            <div key={ind.name} className={`${c.bg} rounded-lg p-4 border ${c.border}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-700">{ind.name}</div>
                {hasData && ind.level && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${c.badge}`}>{ind.level}</span>
                )}
              </div>
              {hasData ? (
                <div className={`text-xl font-bold ${c.text}`}>
                  {ind.value}<span className="text-sm font-normal ml-0.5">{ind.unit}</span>
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">暂无数据</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
