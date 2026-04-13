export default function ScoreComparison({ company, getGrade, getTotalScore, getScore }) {
  const v20Grade = company.v22_orig_grade || company.grade || '-'
  const v22Grade = company.v22_grade || '-'
  const v20Score = company.v22_orig_score || company.score || 0
  const v22Score = company.v22_score || 0
  const scoreDiff = v22Score - v20Score

  const gradeColors = {
    'S': 'bg-red-500 text-white',
    'A+': 'bg-rose-500 text-white',
    'A': 'bg-orange-500 text-white',
    'B+': 'bg-lime-500 text-white',
    'B': 'bg-green-500 text-white',
    'C': 'bg-yellow-500 text-white',
    'D': 'bg-gray-500 text-white',
    '-': 'bg-gray-300 text-gray-600',
  }

  // 各维度差异
  const dimDiffs = [
    { name: '护城河', v20: company.moat || 0, v22: company.v22_moat || 0 },
    { name: '成长性', v20: company.growth || 0, v22: company.v22_growth || 0 },
    { name: '盈利质量', v20: company.profitability || company.other || 0, v22: company.v22_profit || 0 },
    { name: '估值', v20: company.valuation || 0, v22: company.v22_valuation || 0 },
    { name: '催化剂', v20: company.catalyst || 0, v22: company.v22_catalyst || 0 },
  ]

  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">v2.0 vs v2.2 评分对比</h2>

      {/* 总分对比 */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {/* v2.0 */}
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-2">v2.0</div>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${gradeColors[v20Grade] || gradeColors['-']}`}>
            {v20Grade}
          </span>
          <div className="text-2xl font-bold text-gray-900 mt-2">{v20Score}</div>
          <div className="text-xs text-gray-400">/100</div>
        </div>

        {/* 箭头 */}
        <div className="flex flex-col items-center">
          <span className={`text-lg font-bold ${scoreDiff > 0 ? 'text-green-600' : scoreDiff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {scoreDiff > 0 ? '+' : ''}{scoreDiff}
          </span>
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>

        {/* v2.2 */}
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-2">v2.2</div>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${gradeColors[v22Grade] || gradeColors['-']}`}>
            {v22Grade}
          </span>
          <div className="text-2xl font-bold text-gray-900 mt-2">{v22Score}</div>
          <div className="text-xs text-gray-400">/100</div>
        </div>
      </div>

      {/* 各维度差异 */}
      <div className="space-y-2">
        {dimDiffs.map(dim => {
          const diff = dim.v22 - dim.v20
          const maxDiff = 100 // v2.0百分制 vs v2.2原始分，差异范围大
          const barWidth = Math.min(Math.abs(diff) / maxDiff * 100, 100)
          return (
            <div key={dim.name} className="flex items-center gap-3 text-sm">
              <div className="w-16 text-gray-600 text-right">{dim.name}</div>
              <div className="w-10 text-gray-900 font-medium text-right">{dim.v20}</div>
              <div className="flex-1 h-4 bg-gray-100 rounded relative overflow-hidden">
                {diff !== 0 && (
                  <div
                    className={`absolute top-0 h-full rounded ${diff < 0 ? 'bg-red-400 right-1/2' : 'bg-green-400 left-1/2'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-medium ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </span>
                </div>
              </div>
              <div className="w-10 text-blue-600 font-medium">{dim.v22}</div>
            </div>
          )
        })}
      </div>

      {/* 约束触发 */}
      {company.v22_constraint && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center text-amber-800">
            <span className="mr-2">⚠️</span>
            <span className="font-medium">评级约束触发：</span>
            <span className="ml-1 text-amber-700">{company.v22_constraint}</span>
          </div>
        </div>
      )}

      {/* 说明 */}
      <div className="mt-4 text-xs text-gray-400">
        💡 v2.2 采用原始分制（满分100=25+20+20+25+10-0）+ 风险扣分（0~-15）+ 7档评级 + 约束规则，评分标准更严格
      </div>
    </div>
  )
}
