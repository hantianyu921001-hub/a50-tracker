import { useParams, Link } from 'react-router-dom'
import { useScoring } from '../context/ScoringContext'
import CompanyOverview from '../components/detail/CompanyOverview'
import AnnualReport from '../components/detail/AnnualReport'
import CompetitiveAdvantage from '../components/detail/CompetitiveAdvantage'
import ValuationTable from '../components/detail/ValuationTable'
import RiskList from '../components/detail/RiskList'

export default function CompanyDetailV20() {
  const { code } = useParams()
  const { companies, getTotalScore, getGrade, getGradeColor, getGradeLabel, getScore, getScoreColor, dimensions } = useScoring()

  const company = companies.find((c) => c.code === code)

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">未找到该公司</div>
        <Link to="/" className="text-blue-600 hover:text-blue-800">返回列表</Link>
      </div>
    )
  }

  const gradeColors = {
    'S': 'bg-red-100 text-red-800 border-red-200',
    'A+': 'bg-rose-100 text-rose-800 border-rose-200',
    'A': 'bg-orange-100 text-orange-800 border-orange-200',
    'B+': 'bg-lime-100 text-lime-800 border-lime-200',
    'B': 'bg-green-100 text-green-800 border-green-200',
    'C': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'D': 'bg-gray-100 text-gray-800 border-gray-200',
    '-': 'bg-gray-100 text-gray-500 border-gray-200',
  }

  const grade = getGrade(company)
  const totalScore = getTotalScore(company)

  const dimDefs = [
    { name: '护城河', key: 'moat', weight: '25%', maxScore: 100, rationale: company.scoringRationale?.moat },
    { name: '成长性', key: 'growth', weight: '20%', maxScore: 100, rationale: company.scoringRationale?.growth },
    { name: '盈利质量', key: 'profitability', weight: '20%', maxScore: 100, rationale: company.scoringRationale?.profitability },
    { name: '估值安全边际', key: 'valuation', weight: '25%', maxScore: 100, rationale: company.scoringRationale?.valuation },
    { name: '催化剂', key: 'catalyst', weight: '10%', maxScore: 100, rationale: company.scoringRationale?.catalyst },
  ]

  const hasAnalysis = company.status === 'analyzed' && company.analysis

  return (
    <div>
      <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* 顶部信息栏 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-gray-500 mb-1">{company.isA50 && company.rank ? `权重排名 #${company.rank}` : '非A50成分股'}</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
              <div className="text-gray-600">{company.code} · {company.industry}</div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${gradeColors[grade] || gradeColors['-']}`}>
                {grade} · {getGradeLabel(grade)}
              </span>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {totalScore}<span className="text-sm text-gray-500">/100</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">v2.0 评分</div>
            </div>
          </div>
        </div>

        {company.status === 'pending' ? (
          <div className="p-6 text-center text-gray-500">该公司尚未分析</div>
        ) : (
          <>
            {/* 1. 量化评分详情 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                量化评分详情
                <span className="text-sm font-normal text-gray-500 ml-2">（v2.0 五维度模型）</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {dimDefs.map((dim) => {
                  const score = getScore(company, dim.key)
                  const scoreNum = typeof score === 'number' ? score : 0
                  return (
                    <div key={dim.key} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-sm font-medium text-gray-700">{dim.name}</div>
                        <div className="text-xs text-gray-400">{dim.weight}</div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div className="text-xl font-bold text-gray-900">{score}</div>
                        <div className="text-xs text-gray-500">/{dim.maxScore}</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div
                          className={`h-1.5 rounded-full ${
                            scoreNum / dim.maxScore >= 0.8 ? 'bg-green-500' : scoreNum / dim.maxScore >= 0.6 ? 'bg-blue-500' : scoreNum / dim.maxScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(scoreNum / dim.maxScore) * 100}%` }}
                        ></div>
                      </div>
                      {dim.rationale?.summary && (
                        <div className="text-xs text-gray-500 mt-2 line-clamp-2" title={dim.rationale.summary}>
                          {dim.rationale.summary}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. 建仓策略 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">建仓策略</h2>
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

              {company.analysis?.investmentStrategy?.dividendReinvestment && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <h3 className="text-sm font-medium text-green-900 mb-2">💰 分红策略</h3>
                  <p className="text-sm text-green-800">{company.analysis.investmentStrategy.dividendReinvestment}</p>
                </div>
              )}

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

            {/* 4-8. 共享组件 */}
            {hasAnalysis && <CompanyOverview overview={company.analysis.companyOverview} />}
            {hasAnalysis && <AnnualReport annualReport={company.analysis.annualReport} />}
            {hasAnalysis && <CompetitiveAdvantage competitiveAdvantage={company.analysis.competitiveAdvantage} />}
            {hasAnalysis && <ValuationTable valuationAnalysis={company.analysis.valuationAnalysis} />}
            {hasAnalysis && <RiskList riskWarning={company.analysis.riskWarning} />}

            {/* 标签 */}
            {company.tags && company.tags.length > 0 && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">标签</h2>
                <div className="flex flex-wrap gap-2">
                  {company.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
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
