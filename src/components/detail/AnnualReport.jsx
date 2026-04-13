export default function AnnualReport({ annualReport }) {
  if (!annualReport || annualReport.length === 0) return null
  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">2025年年报核心数据</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-100">
            {annualReport.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-sm font-medium text-gray-700">{item.metric}</td>
                <td className="py-3 px-4 text-sm text-gray-900">{item.value}</td>
                <td className="py-3 px-4 text-sm text-gray-500">{item.change}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
