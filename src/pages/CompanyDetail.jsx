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

  // 五维度评分模型
  const dimensions = [
    { 
      name: '护城河', 
      key: 'moat', 
      weight: '25%',
      description: '品牌、技术、牌照、成本、网络效应等竞争优势',
      rationale: company.scoringRationale?.moat
    },
    { 
      name: '成长性', 
      key: 'growth', 
      weight: '20%',
      description: '营收增速、净利润增速、扩张能力',
      rationale: company.scoringRationale?.growth
    },
    { 
      name: '盈利质量', 
      key: 'profitability', 
      weight: '20%',
      description: 'ROE、毛利率、现金流、分红率',
      rationale: company.scoringRationale?.profitability
    },
    { 
      name: '估值安全边际', 
      key: 'valuation', 
      weight: '25%',
      description: 'PE/PB历史分位、股息率、相对价值',
      rationale: company.scoringRationale?.valuation
    },
    { 
      name: '催化剂', 
      key: 'catalyst', 
      weight: '10%',
      description: '政策利好、业绩拐点、重组并购等',
      rationale: company.scoringRationale?.catalyst
    },
  ]

  // 计算各维度得分（兼容旧数据）
  const getScore = (key) => {
    if (company[key] !== undefined) return company[key]
    const oldMap = { moat: 'moat', growth: 'growth', valuation: 'valuation', profitability: 'other', catalyst: 'other' }
    return company[oldMap[key]] || '-'
  }

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
            {/* 1. 量化评分详情 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                量化评分详情
                <span className="text-sm font-normal text-gray-500 ml-2">（五维度模型）</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {dimensions.map((dim) => {
                  const score = getScore(dim.key)
                  const scoreNum = typeof score === 'number' ? score : 0
                  return (
                    <div key={dim.key} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-sm font-medium text-gray-700">{dim.name}</div>
                        <div className="text-xs text-gray-400">{dim.weight}</div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="text-xl font-bold text-gray-900">{score}</div>
                        <div className="text-xs text-gray-500">/100</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div
                          className={`h-1.5 rounded-full ${
                            scoreNum >= 80 ? 'bg-green-500' : scoreNum >= 60 ? 'bg-blue-500' : scoreNum >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${scoreNum}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 line-clamp-2" title={dim.rationale?.summary || dim.description}>
                        {dim.rationale?.summary || dim.description}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. 建仓策略 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">建仓策略</h2>
              
              {/* 基础信息卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="text-sm text-green-800 mb-1">操作建议</div>
                  <div className="text-lg font-semibold text-green-900">{company.recommendation}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="text-sm text-blue-800 mb-1">理想买点</div>
                  <div className="text-lg font-semibold text-blue-900">{company.idealPrice}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                  <div className="text-sm text-orange-800 mb-1">目标价</div>
                  <div className="text-lg font-semibold text-orange-900">
                    {company.analysis?.investmentStrategy?.targetPrice || '待分析'}
                  </div>
                </div>
              </div>

              {/* 分批建仓策略 */}
              {company.analysis?.investmentStrategy?.entryStrategy && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">📥 分批建仓方案</h3>
                  <div className="space-y-3">
                    {company.analysis.investmentStrategy.entryStrategy.firstBatch && (
                      <div className="flex items-start bg-blue-50 rounded-lg p-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-medium mr-3 mt-0.5">1</span>
                        <div className="text-sm text-gray-700">{company.analysis.investmentStrategy.entryStrategy.firstBatch}</div>
                      </div>
                    )}
                    {company.analysis.investmentStrategy.entryStrategy.secondBatch && (
                      <div className="flex items-start bg-indigo-50 rounded-lg p-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-medium mr-3 mt-0.5">2</span>
                        <div className="text-sm text-gray-700">{company.analysis.investmentStrategy.entryStrategy.secondBatch}</div>
                      </div>
                    )}
                    {company.analysis.investmentStrategy.entryStrategy.thirdBatch && (
                      <div className="flex items-start bg-purple-50 rounded-lg p-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-medium mr-3 mt-0.5">3</span>
                        <div className="text-sm text-gray-700">{company.analysis.investmentStrategy.entryStrategy.thirdBatch}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 分批止盈策略 */}
              {company.analysis?.investmentStrategy?.exitStrategy && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">📤 分批止盈方案</h3>
                  <div className="space-y-3">
                    {company.analysis.investmentStrategy.exitStrategy.partial && (
                      <div className="flex items-start bg-yellow-50 rounded-lg p-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500 text-white text-xs font-medium mr-3 mt-0.5">1</span>
                        <div className="text-sm text-gray-700">{company.analysis.investmentStrategy.exitStrategy.partial}</div>
                      </div>
                    )}
                    {company.analysis.investmentStrategy.exitStrategy.major && (
                      <div className="flex items-start bg-orange-50 rounded-lg p-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-medium mr-3 mt-0.5">2</span>
                        <div className="text-sm text-gray-700">{company.analysis.investmentStrategy.exitStrategy.major}</div>
                      </div>
                    )}
                    {company.analysis.investmentStrategy.exitStrategy.full && (
                      <div className="flex items-start bg-red-50 rounded-lg p-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-medium mr-3 mt-0.5">3</span>
                        <div className="text-sm text-gray-700">{company.analysis.investmentStrategy.exitStrategy.full}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 分红再投资 */}
              {company.analysis?.investmentStrategy?.dividendReinvestment && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <h3 className="text-sm font-medium text-green-900 mb-2">💰 分红策略</h3>
                  <p className="text-sm text-green-800">{company.analysis.investmentStrategy.dividendReinvestment}</p>
                </div>
              )}

              {/* 仓位和时间 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">建议仓位</div>
                  <div className="text-base font-medium text-gray-900">
                    {company.analysis?.investmentStrategy?.positionSize || '待分析'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">持有周期</div>
                  <div className="text-base font-medium text-gray-900">
                    {company.analysis?.investmentStrategy?.timeHorizon || '待分析'}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. 投资结论 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">投资结论</h2>
              <p className="text-gray-700 leading-relaxed text-base">
                {company.analysis?.conclusion || company.summary}
              </p>
            </div>

            {/* 4. 公司概况 */}
            {hasAnalysis && company.analysis.companyOverview && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">公司概况</h2>
                <p className="text-gray-700 leading-relaxed">{company.analysis.companyOverview}</p>
              </div>
            )}

            {/* 5. 2025年年报核心数据 */}
            {hasAnalysis && company.analysis.annualReport && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">2025年年报核心数据</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <tbody className="divide-y divide-gray-100">
                      {company.analysis.annualReport.map((item, index) => (
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
            )}

            {/* 6. 核心竞争优势 */}
            {hasAnalysis && company.analysis.competitiveAdvantage && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">核心竞争优势</h2>
                <div className="space-y-4">
                  {company.analysis.competitiveAdvantage.map((item, index) => (
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
            )}

            {/* 7. 估值分析 */}
            {hasAnalysis && company.analysis.valuationAnalysis && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">估值分析</h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="font-medium text-blue-900 mb-2">当前估值水平</div>
                    <p className="text-sm text-blue-800">{company.analysis.valuationAnalysis.current}</p>
                  </div>
                  {company.analysis.valuationAnalysis.comparison && company.analysis.valuationAnalysis.comparison.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(company.analysis.valuationAnalysis.comparison[0]).map((key) => (
                              <th key={key} className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {company.analysis.valuationAnalysis.comparison.map((row, index) => (
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
            )}

            {/* 8. 风险提示 */}
            {hasAnalysis && company.analysis.riskWarning && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">风险提示</h2>
                <div className="space-y-4">
                  {company.analysis.riskWarning.medium && company.analysis.riskWarning.medium.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                      <div className="flex items-center mb-2">
                        <span className="text-yellow-600 mr-2">🟡</span>
                        <span className="font-medium text-yellow-900">中等风险</span>
                      </div>
                      <ul className="space-y-1">
                        {company.analysis.riskWarning.medium.map((risk, index) => (
                          <li key={index} className="text-sm text-yellow-800 flex items-start">
                            <span className="mr-2">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {company.analysis.riskWarning.low && company.analysis.riskWarning.low.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <div className="flex items-center mb-2">
                        <span className="text-green-600 mr-2">🟢</span>
                        <span className="font-medium text-green-900">低风险/积极因素</span>
                      </div>
                      <ul className="space-y-1">
                        {company.analysis.riskWarning.low.map((item, index) => (
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
            )}

            {/* 标签 */}
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