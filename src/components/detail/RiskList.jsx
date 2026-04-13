export default function RiskList({ riskWarning }) {
  if (!riskWarning) return null
  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">风险提示</h2>
      <div className="space-y-4">
        {riskWarning.medium && riskWarning.medium.length > 0 && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
            <div className="flex items-center mb-2">
              <span className="text-yellow-600 mr-2">🟡</span>
              <span className="font-medium text-yellow-900">中等风险</span>
            </div>
            <ul className="space-y-1">
              {riskWarning.medium.map((risk, index) => (
                <li key={index} className="text-sm text-yellow-800 flex items-start">
                  <span className="mr-2">•</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}
        {riskWarning.low && riskWarning.low.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center mb-2">
              <span className="text-green-600 mr-2">🟢</span>
              <span className="font-medium text-green-900">低风险/积极因素</span>
            </div>
            <ul className="space-y-1">
              {riskWarning.low.map((item, index) => (
                <li key={index} className="text-sm text-green-800 flex items-start">
                  <span className="mr-2">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
