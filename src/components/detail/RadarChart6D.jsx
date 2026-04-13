export default function RadarChart6D({ scores }) {
  // scores: { moat, growth, profit, valuation, catalyst, risk }
  const dims = [
    { label: '护城河', key: 'moat', max: 25 },
    { label: '成长性', key: 'growth', max: 20 },
    { label: '盈利质量', key: 'profit', max: 20 },
    { label: '估值', key: 'valuation', max: 25 },
    { label: '催化剂', key: 'catalyst', max: 10 },
    { label: '风险', key: 'risk', max: 15 },
  ]

  const numDims = dims.length
  const cx = 150, cy = 120, r = 90

  const points = dims.map((d, i) => {
    const angle = (Math.PI * 2 * i) / numDims - Math.PI / 2
    // 风险维度：0分=满格（好），负分=按比例缩放
    const rawVal = scores[d.key] || 0
    const normalizedVal = d.key === 'risk'
      ? Math.max(0, 1 - Math.abs(rawVal) / d.max)
      : Math.max(0, rawVal / d.max)
    return {
      label: d.label,
      x: cx + r * normalizedVal * Math.cos(angle),
      y: cy + r * normalizedVal * Math.sin(angle),
      lx: cx + (r + 25) * Math.cos(angle),
      ly: cy + (r + 25) * Math.sin(angle),
      rawVal,
      maxVal: d.max,
    }
  })

  const dataPath = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg width="300" height="300" viewBox="0 0 300 300">
      {/* 背景网格 */}
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
      {/* 轴线 */}
      {dims.map((_, i) => {
        const angle = (Math.PI * 2 * i) / numDims - Math.PI / 2
        return (
          <line key={i} x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)}
            stroke="#d1d5db" strokeWidth="0.5" />
        )
      })}
      {/* 数据区域 */}
      <polygon points={dataPath} fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="2" />
      {/* 标签和分数 */}
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
            {dims[i].key === 'risk' ? `${p.rawVal}` : `${p.rawVal}/${p.maxVal}`}
          </text>
        </g>
      ))}
      {/* 图例 */}
      <rect x="100" y="275" width="12" height="12" fill="rgba(59,130,246,0.3)" stroke="#3b82f6" />
      <text x="118" y="286" fontSize="10" fill="#374151">公司得分</text>
    </svg>
  )
}
