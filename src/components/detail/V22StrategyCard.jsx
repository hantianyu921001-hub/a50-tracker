// v2.2 评级到操作建议的映射（仅作 fallback）
const GRADE_STRATEGY = {
  'S': { action: '极度低估', desc: '安全边际极高，可重仓布局', position: '重仓（15-20%）', holding: '长期持有3-5年', color: 'red' },
  'A+': { action: '强烈买入', desc: '显著低估，建议积极建仓', position: '加重仓（10-15%）', holding: '中长期持有2-3年', color: 'rose' },
  'A': { action: '买入', desc: '合理偏低，可标准建仓', position: '标准仓位（8-10%）', holding: '中期持有1-2年', color: 'orange' },
  'B+': { action: '偏强持有', desc: '估值适中偏合理，持有为主', position: '标准仓位（8-10%）', holding: '中期持有2-3年，等待催化剂', color: 'lime' },
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

// 动作标签映射
const ACTION_LABELS = {
  buy: { text: '买入', color: 'bg-green-500 text-white' },
  add: { text: '加仓', color: 'bg-blue-500 text-white' },
  hold: { text: '持有', color: 'bg-lime-500 text-white' },
  trim: { text: '减仓', color: 'bg-yellow-500 text-white' },
  watch: { text: '观察', color: 'bg-gray-500 text-white' },
  avoid: { text: '规避', color: 'bg-red-500 text-white' },
}

export default function V22StrategyCard({ company, grade, score }) {
  const strategy = GRADE_STRATEGY[grade] || GRADE_STRATEGY['D']
  const c = colorMap[strategy.color]

  // 人工决策优先逻辑
  const hasDecision = company.decision_action && company.decision_action !== ''
  const isStale = company.v22_signal_status === 'stale'
  const hasDataGaps = company.v22_data_gaps?.length > 0
  const hasConstraint = company.v22_constraint

  // 获取动作标签
  const getActionInfo = (action) => ACTION_LABELS[action] || { text: action, color: 'bg-gray-500 text-white' }

  return (
    <div>
      {/* 执行状态警告 */}
      {(isStale || hasDataGaps || hasConstraint) && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <span>⚠️</span>
            <span className="font-medium">风险提示：</span>
            {isStale && <span>信号已过期（{company.v22_signal_age_days}天），建议复核</span>}
            {hasDataGaps && <span>关键数据缺失</span>}
            {hasConstraint && <span>评级受约束规则限制</span>}
          </div>
        </div>
      )}

      {/* v2.2 操作建议 */}
      <div className={`${c.bg} rounded-lg p-4 border ${c.border} mb-4`}>
        <div className="flex items-center gap-3 mb-2">
          {/* 优先显示人工决策 */}
          {hasDecision ? (
            <>
              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${getActionInfo(company.decision_action).color}`}>
                {getActionInfo(company.decision_action).text}
              </span>
              <span className={`text-xl font-bold ${c.title}`}>{company.decision_reason || strategy.action}</span>
            </>
          ) : (
            <>
              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold ${c.badge}`}>
                {grade}
              </span>
              <span className={`text-xl font-bold ${c.title}`}>{strategy.action}</span>
            </>
          )}
        </div>
        
        <p className={`text-sm ${c.desc}`}>{hasDecision ? '' : strategy.desc}</p>
        
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white/60 rounded-md p-2">
            <div className="text-xs text-gray-500">建议仓位</div>
            <div className="text-sm font-medium text-gray-900">
              {company.decision_target_position || strategy.position}
            </div>
          </div>
          <div className="bg-white/60 rounded-md p-2">
            <div className="text-xs text-gray-500">持有周期</div>
            <div className="text-sm font-medium text-gray-900">{strategy.holding}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
