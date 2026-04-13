export default function CompetitiveAdvantage({ competitiveAdvantage }) {
  if (!competitiveAdvantage || competitiveAdvantage.length === 0) return null
  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">核心竞争优势</h2>
      <div className="space-y-4">
        {competitiveAdvantage.map((item, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900 mb-2">{item.title}</div>
            <ul className="space-y-1">
              {item.points.map((point, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
