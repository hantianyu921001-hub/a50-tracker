import { useParams, Link } from 'react-router-dom'
import companies from '../data/companies.json'

const gradeColors = {
  'S+': 'bg-red-100 text-red-800 border-red-200',
  'S': 'bg-orange-100 text-orange-800 border-orange-200',
  'A': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'B': 'bg-gray-100 text-gray-800 border-gray-200',
  'C': 'bg-red-100 text-red-800 border-red-200',
  '-': 'bg-gray-100 text-gray-500 border-gray-200',
}

const gradeLabels = {
  'S+': '强烈买入',
  'S': '买入',
  'A': '持有',
  'B': '观望',
  'C': '规避',
  '-': '待评级',
}

export default function CompanyDetail() {
  const { code } = useParams()
  const company = companies.find((c) => c.code === code)

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">未找到该公司</div>
        <Link to="/" className="text-blue-600 hover:text-blue-800">
          返回列表
        </Link>
      </div>
    )
  }

  const dimensions = [
    { name: '估值', score: company.valuation, description: 'PE/PB/股息率相对历史分位' },
    { name: '成长', score: company.growth, description: '营收增速、净利润增速、ROE' },
    { name: '护城河', score: company.moat, description: '品牌、技术、牌照、网络效应' },
    { name: '其他', score: company.other, description: '行业周期、政策风险、管理层' },
  ]

  const hasAnalysis = company.status === 'analyzed' && company.analysis

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-gray-500 mb-1">权重排名 #{company.rank}</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
              <div className="text-gray-600">
                {company.code} · {company.industry}
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                gradeColors[company.grade] || gradeColors['-']
              }`}>
                {company.grade} · {gradeLabels[company.grade] || '待评级'}
              </span>
              {company.score && (
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {company.score}<span className="text-sm text-gray-500">/100</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {company.status === 'pending' ? (
          <div className="p-6 text-center text-gray-500">
            该公司尚未分析
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">评分详情</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {dimensions.map((dim) => (
                  <div key={dim.name} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">{dim.name}</div>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold text-gray-900">
                        {dim.score || '-'}
                      </div>
                      <div className="text-xs text-gray-500">/100</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${dim.score || 0}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{dim.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">投资建议</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-800 mb-1">操作建议</div>
                  <div className="text-lg font-semibold text-green-900">{company.recommendation}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-800 mb-1">理想买点</div>
                  <div className="text-lg font-semibold text-blue-900">{company.idealPrice}</div>
                </div>
              </div>
            </div>

            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">核心观点</h2>
              <p className="text-gray-700">{company.summary}</p>
            </div>

            {/* 深度分析内容 */}
            {hasAnalysis && company.analysis.financials && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">财务数据</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(company.analysis.financials).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">{key}</div>
                      <div className="text-sm font-medium text-gray-900">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasAnalysis && company.analysis.industry && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">行业分析</h2>
                <p className="text-gray-700 leading-relaxed">{company.analysis.industry}</p>
              </div>
            )}

            {hasAnalysis && company.analysis.moat && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">竞争优势</h2>
                <p className="text-gray-700 leading-relaxed">{company.analysis.moat}</p>
              </div>
            )}

            {hasAnalysis && company.analysis.risks && company.analysis.risks.length > 0 && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">风险因素</h2>
                <ul className="space-y-2">
                  {company.analysis.risks.map((risk, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span className="text-gray-700">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasAnalysis && company.analysis.highlights && company.analysis.highlights.length > 0 && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">核心亮点</h2>
                <ul className="space-y-2">
                  {company.analysis.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {company.tags && company.tags.length > 0 && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">标签</h2>
                <div className="flex flex-wrap gap-2">
                  {company.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-6">
              <div className="text-sm text-gray-500">
                最后更新：{company.lastUpdate || '未更新'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}