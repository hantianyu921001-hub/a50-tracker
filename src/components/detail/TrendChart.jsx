// 净利润与分红趋势图组件
// 支持纯 SVG 渲染，无需图表库

export default function TrendChart({ data, years, labels }) {
  if (!data || data.length === 0 || !years || years.length !== data.length) {
    return null
  }

  const width = 500
  const height = 220
  const padding = { top: 20, right: 60, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // 计算数据范围
  const maxVal = Math.max(...data) * 1.15
  const minVal = Math.min(...data) * 0.85
  const range = maxVal - minVal

  // 坐标转换函数
  const xScale = (i) => padding.left + (i / (years.length - 1)) * chartWidth
  const yScale = (val) => padding.top + chartHeight - ((val - minVal) / range) * chartHeight

  // 生成折线路径
  const linePath = data.map((val, i) => {
    const x = xScale(i)
    const y = yScale(val)
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
  }).join(' ')

  // 生成数据点
  const points = data.map((val, i) => ({
    x: xScale(i),
    y: yScale(val),
    val: val,
    year: years[i]
  }))

  // Y轴刻度（5个）
  const yTicks = Array.from({ length: 5 }, (_, i) => minVal + (range / 4) * i)

  // 格式化数值
  const formatValue = (val) => {
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K'
    return val.toFixed(2)
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]">
        {/* 背景网格 */}
        {yTicks.map((tick, i) => (
          <g key={`grid-${i}`}>
            <line
              x1={padding.left}
              y1={yScale(tick)}
              x2={width - padding.right}
              y2={yScale(tick)}
              stroke="#e5e7eb"
              strokeDasharray="4,4"
            />
            <text
              x={padding.left - 8}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="text-xs fill-gray-500"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}

        {/* X轴年份 */}
        {years.map((year, i) => (
          <text
            key={`year-${i}`}
            x={xScale(i)}
            y={height - 10}
            textAnchor="middle"
            className="text-xs fill-gray-600"
          >
            {year}
          </text>
        ))}

        {/* 折线 */}
        <path
          d={linePath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 数据点和数值 */}
        {points.map((point, i) => (
          <g key={`point-${i}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#ef4444"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer hover:r-6 transition-all"
            />
            <text
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              className="text-xs fill-red-600 font-medium"
            >
              {formatValue(point.val)}
            </text>
          </g>
        ))}

        {/* 标签（如果有） */}
        {labels && (
          <text
            x={width / 2}
            y={12}
            textAnchor="middle"
            className="text-sm fill-gray-700 font-medium"
          >
            {labels}
          </text>
        )}
      </svg>
    </div>
  )
}