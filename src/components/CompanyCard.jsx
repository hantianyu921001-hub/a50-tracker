import { Link } from 'react-router-dom'

const gradeColors = {
  'S+': 'bg-red-100 text-red-800 border-red-200',
  'S': 'bg-orange-100 text-orange-800 border-orange-200',
  'A': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'B': 'bg-gray-100 text-gray-800 border-gray-200',
  'C': 'bg-red-100 text-red-800 border-red-200',
  '-': 'bg-gray-100 text-gray-500 border-gray-200',
}

const statusColors = {
  analyzed: 'bg-green-100 text-green-800',
  pending: 'bg-gray-100 text-gray-600',
}

export default function CompanyCard({ company }) {
  const isPending = company.status === 'pending'

  return (
    <Link
      to={`/company/${company.code}`}
      className={`block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow ${
        isPending ? 'opacity-75' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">#{company.rank}</div>
          <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
          <div className="text-sm text-gray-500">{company.code} · {company.industry}</div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            gradeColors[company.grade] || gradeColors['-']
          }`}>
            {company.grade}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
            statusColors[company.status] || statusColors.pending
          }`}>
            {company.status === 'analyzed' ? '已分析' : '待分析'}
          </span>
        </div>
      </div>

      {company.status === 'analyzed' && (
        <>
          <div className="mb-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>综合评分</span>
              <span className="font-semibold">{company.score}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${company.score}%` }}
              ></div>
            </div>
          </div>

          <div className="text-sm text-gray-600 line-clamp-2">
            {company.summary}
          </div>

          {company.tags && company.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {company.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {company.status === 'pending' && (
        <div className="text-sm text-gray-400 italic">
          {company.summary}
        </div>
      )}
    </Link>
  )
}