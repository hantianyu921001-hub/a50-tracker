export default function ValuationTable({ valuationAnalysis }) {
  if (!valuationAnalysis) return null
  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">估值分析</h2>
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="font-medium text-blue-900 mb-2">当前估值水平</div>
          <p className="text-sm text-blue-800">{valuationAnalysis.current}</p>
        </div>
        {valuationAnalysis.comparison && valuationAnalysis.comparison.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(valuationAnalysis.comparison[0]).map((key) => (
                    <th key={key} className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {valuationAnalysis.comparison.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="py-2 px-4 text-sm text-gray-900">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
