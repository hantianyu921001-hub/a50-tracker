export default function RiskDeduction({ riskScore, riskDetails, constraint }) {
  const hasRisk = riskScore < 0 || (riskDetails && riskDetails.length > 0)
  const hasConstraint = !!constraint

  if (!hasRisk && !hasConstraint) return null

  // 解析单个风险项（兼容对象和字符串格式）
  const parseRiskItem = (item) => {
    if (!item) return null
    if (typeof item === 'object' && item.name !== undefined) {
      return { name: item.name, score: item.score ?? 0, rationale: item.rationale || '' }
    }
    if (typeof item === 'string') {
      return { name: item, score: 0, rationale: '' }
    }
    return null
  }

  const parsedRisks = riskDetails?.map(parseRiskItem).filter(Boolean) || []

  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">风险与约束</h2>

      {/* 风险扣分 */}
      <div className="bg-red-50 rounded-lg p-4 border border-red-100 mb-4">
        <div className="flex items-center mb-2">
          <span className="text-red-600 mr-2">🔴</span>
          <span className="font-medium text-red-900">风险扣分</span>
          <span className="ml-auto text-lg font-bold text-red-700">{riskScore}分</span>
        </div>
        {parsedRisks.length > 0 ? (
          <div className="space-y-1">
            {parsedRisks.map((item, i) => (
              <div key={i} className="text-sm text-red-800 flex items-start">
                <span className="mr-2">•</span>
                <div>
                  <span className="font-medium">{item.name}</span>
                  {item.score < 0 && <span className="ml-1 text-red-600">({item.score}分)</span>}
                  {item.rationale && <div className="text-xs text-red-600 mt-0.5">{item.rationale}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-red-600">无特定风险扣分项</div>
        )}
      </div>

      {/* 约束规则 */}
      {hasConstraint && (
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center mb-2">
            <span className="text-amber-600 mr-2">⚠️</span>
            <span className="font-medium text-amber-900">评级约束触发</span>
          </div>
          <div className="text-sm text-amber-800">
            <div className="mb-1">触发规则：<strong>{constraint}</strong></div>
            <div className="text-amber-600">
              该约束可能导致评级下调，实际评级可能与原始评分不直接对应。
            </div>
          </div>
          <div className="mt-3 text-xs text-amber-600 bg-amber-100 rounded p-2">
            💡 v2.2 约束规则：①护城河≤8→评级不超B ②估值≤8→评级不超B+ ③风险≤-5→评级不超B ④ROE＜5%→评级不超B+ ⑤现金流3年负→评级降一档 ⑥分红率＜20%且ROE＜15%→评级不超B+ ⑦两年营收下滑且PE＞25→评级不超B+
          </div>
        </div>
      )}
    </div>
  )
}
