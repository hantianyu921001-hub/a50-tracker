import { useState } from 'react'

// 细项得分解析：支持对象格式和字符串格式
// 对象格式: { name: "品牌壁垒", score: 4, max: 5, rationale: "分析说明..." }
// 字符串格式: "品牌5/5" 或 "⚠风险项-1/5"
function parseDetailItem(item) {
  if (!item) return null
  
  // 对象格式（新格式，带 rationale）
  if (typeof item === 'object' && item.name !== undefined) {
    return {
      name: item.name,
      score: item.score ?? 0,
      max: item.max ?? 5,
      isWarning: item.isWarning ?? (item.score < 0),
      rationale: item.rationale || ''
    }
  }
  
  // 字符串格式（旧格式，兼容）
  if (typeof item === 'string') {
    const isWarning = item.startsWith('⚠')
    const cleanStr = isWarning ? item.slice(1) : item
    const match = cleanStr.match(/^(.+?)(-?\d+)\/(\d+)$/)
    if (!match) return { name: item, score: 0, max: 0, isWarning, rationale: '' }
    return { name: match[1], score: parseInt(match[2]), max: parseInt(match[3]), isWarning, rationale: '' }
  }
  
  return null
}

function DetailBar({ name, score, max, isWarning, rationale }) {
  const [expanded, setExpanded] = useState(false)
  const pct = max > 0 ? (score / max * 100) : 0
  const color = isWarning
    ? 'bg-amber-400'
    : pct >= 80 ? 'bg-green-500'
    : pct >= 60 ? 'bg-blue-500'
    : pct >= 40 ? 'bg-yellow-500'
    : 'bg-red-500'

  const hasRationale = rationale && rationale.trim().length > 0

  return (
    <div className={`py-1 px-2 rounded ${isWarning ? 'bg-amber-50' : ''}`}>
      <div
        className={`group relative flex items-center gap-2 ${hasRationale ? 'cursor-pointer' : ''}`}
        onClick={() => hasRationale && setExpanded(!expanded)}
      >
        <div className="w-16 text-xs text-gray-600 truncate" title={rationale || name}>
          {name}
          {hasRationale && <span className="ml-0.5 text-gray-300">▼</span>}
        </div>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
        </div>
        <div className="w-10 text-xs text-gray-500 text-right">
          {isWarning ? '⚠' : `${score}/${max}`}
        </div>
        
        {/* 桌面端 Hover tooltip */}
        {hasRationale && !expanded && (
          <div className="absolute left-0 right-0 top-full mt-1 z-10 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200
                          pointer-events-none hidden md:block">
            <div className="bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg leading-relaxed">
              {rationale}
            </div>
          </div>
        )}
      </div>
      
      {/* 点击展开（移动端 + 桌面端通用） */}
      {hasRationale && expanded && (
        <div className="mt-1 ml-0 text-xs text-gray-500 bg-gray-100 rounded px-2 py-1.5 leading-relaxed">
          {rationale}
        </div>
      )}
    </div>
  )
}

export default function ScoreDetailPanel({ v22Details, dataGaps }) {
  if (!v22Details) return null

  const dimConfigs = [
    { key: 'moat', name: '护城河', max: 25, color: 'blue' },
    { key: 'growth', name: '成长性', max: 20, color: 'indigo' },
    { key: 'profit', name: '盈利质量', max: 20, color: 'green' },
    { key: 'valuation', name: '估值安全边际', max: 25, color: 'orange' },
    { key: 'catalyst', name: '催化剂', max: 10, color: 'purple' },
    { key: 'risk', name: '风险扣分', max: 15, color: 'red' },
  ]

  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">细项得分解读</h2>
      <p className="text-xs text-gray-500 mb-3">💡 点击子项名称可展开评分依据</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dimConfigs.map(dim => {
          const items = v22Details[dim.key] || []
          if (items.length === 0 && dim.key !== 'risk') return null
          return (
            <div key={dim.key} className={`bg-gray-50 rounded-lg p-3 border ${
              dim.key === 'risk' ? 'border-red-100' : 'border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800">{dim.name}</span>
                <span className="text-xs text-gray-400">满分{dim.max}</span>
              </div>
              {items.length > 0 ? (
                <div className="space-y-0.5">
                  {items.map((item, i) => {
                    const parsed = parseDetailItem(item)
                    if (!parsed) return null
                    return <DetailBar key={i} {...parsed} />
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-400 py-1">无扣分项</div>
              )}
            </div>
          )
        })}
      </div>

      {/* 数据缺失提示 */}
      {dataGaps && dataGaps.length > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center text-amber-800 text-sm">
            <span className="mr-2">⚠️</span>
            <span className="font-medium">数据缺失项：</span>
            <span className="ml-1">{dataGaps.join('、')}</span>
          </div>
        </div>
      )}
    </div>
  )
}