export default function CompanyOverview({ overview }) {
  if (!overview) return null
  return (
    <div className="p-6 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">公司概况</h2>
      <p className="text-gray-700 leading-relaxed">{overview}</p>
    </div>
  )
}
