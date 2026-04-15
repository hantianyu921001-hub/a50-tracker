import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useScoring } from '../context/ScoringContext'
import CompanyOverview from '../components/detail/CompanyOverview'
import AnnualReport from '../components/detail/AnnualReport'
import CompetitiveAdvantage from '../components/detail/CompetitiveAdvantage'
import ValuationTable from '../components/detail/ValuationTable'
import RiskList from '../components/detail/RiskList'
import TrendChart from '../components/detail/TrendChart'

export default function CompanyDetailV20() {
  const { code } = useParams()
  const { companies } = useScoring()
  const [activeTab, setActiveTab] = useState('analysis') // 'analysis' | 'trend'

  const company = companies.find((c) => c.code === code)

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">未找到该公司</div>
        <Link to="/" className="text-blue-600 hover:text-blue-800">返回列表</Link>
      </div>
    )
  }

  const getScore = (c, key) => {
    const scores = c.score?.[key] || c[key] || 0
    return typeof scores === 'object' ? scores.summary || 0 : scores
  }

  // score 可能是整数（v2.0总分）或对象（v2.2各维度分）
  const totalScore = typeof company.score === 'number' 
    ? company.score 
    : Object.values(company.score || {}).reduce((sum, s) => {
        return sum + (typeof s === 'object' ? (s.summary || 0) : (s || 0))
      }, 0)

  // 提取趋势数据
  const annualReport = company.analysis?.annualReport || []
  const profitData = annualReport.find(a => a.metric === '归母净利润')
  const dividendData = annualReport.find(a => a.metric === '每股分红')
  
  const years = [2021, 2022, 2023, 2024, 2025]
  const profitTrend = profitData?.trend || []
  const dividendTrend = dividendData?.trend || []

  const hasAnalysis = company.status === 'analyzed' && company.analysis

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

  const grade = company.grade || '-'
  const gradeColor = gradeColors[grade] || gradeColors['-']

  return (
    <div>
      <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </Link>

      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'analysis'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          📊 基本面分析
        </button>
        <button
          onClick={() => setActiveTab('trend')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'trend'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          📈 财务趋势
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* 基本面分析 Tab */}
        {activeTab === 'analysis' && (
          <>
            {/* 顶部信息栏 - 和V2.2一致 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    {company.isA50 && company.rank ? `权重排名 #${company.rank}` : (company.rank ? `A50排名 #${company.rank}` : '非A50成分股')}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
                  <div className="text-gray-600">{company.code} · {company.industry || company.swIndustry || '未知行业'}</div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${gradeColor}`}>
                    {grade}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">
                    {totalScore}<span className="text-sm text-gray-500">/100</span>
                  </div>
                  <div className="text-xs text-blue-500 mt-1">v2.0 评分</div>
                </div>
              </div>
            </div>

            {/* 投资结论 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">投资结论</h2>
              <p className="text-gray-700 leading-relaxed text-base">
                {company.analysis?.conclusion || company.summary}
              </p>
            </div>

            {/* 建仓策略 - 精简版 */}
            {hasAnalysis && company.analysis?.investmentStrategy && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">建仓策略</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="text-xs text-green-800 mb-1">操作建议</div>
                    <div className="text-sm font-medium text-green-900">{company.analysis?.investmentStrategy?.positionSize || '待分析'}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-blue-800 mb-1">理想买点</div>
                    <div className="text-sm font-medium text-blue-900">{company.analysis?.investmentStrategy?.entryStrategy?.firstBatch?.split('（')[0] || '待分析'}</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                    <div className="text-xs text-orange-800 mb-1">目标价</div>
                    <div className="text-sm font-medium text-orange-900">
                      {company.analysis?.investmentStrategy?.targetPrice || '待分析'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 共享组件 */}
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

        {/* 财务趋势 Tab */}
        {activeTab === 'trend' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">📈 净利润与分红趋势</h2>
            
            {/* 净利润趋势图 */}
            {profitTrend.length > 0 && (
              <div className="mb-8">
                <h3 className="text-base font-medium text-gray-800 mb-3 flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  归母净利润（亿元）
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <TrendChart 
                    data={profitTrend} 
                    years={years} 
                    labels="净利润趋势 (2021-2025)"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>2025: <strong className="text-red-600">{profitTrend[4]}亿</strong></span>
                  <span>2021: <strong>{profitTrend[0]}亿</strong></span>
                  <span>5年增长: <strong className="text-green-600">+{((profitTrend[4] - profitTrend[0]) / profitTrend[0] * 100).toFixed(1)}%</strong></span>
                  <span>CAGR: <strong className="text-blue-600">{((Math.pow(profitTrend[4] / profitTrend[0], 1/4) - 1) * 100).toFixed(1)}%</strong></span>
                </div>
              </div>
            )}

            {/* 分红趋势图 */}
            {dividendTrend.length > 0 && (
              <div className="mb-8">
                <h3 className="text-base font-medium text-gray-800 mb-3 flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  每股分红（元）
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <TrendChart 
                    data={dividendTrend} 
                    years={years} 
                    labels="每股分红趋势 (2021-2025)"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>2025: <strong className="text-blue-600">{dividendTrend[4]}元</strong></span>
                  <span>2021: <strong>{dividendTrend[0]}元</strong></span>
                  <span>5年增长: <strong className="text-green-600">+{((dividendTrend[4] - dividendTrend[0]) / dividendTrend[0] * 100).toFixed(1)}%</strong></span>
                </div>
              </div>
            )}

            {/* 数据表格 */}
            {(profitTrend.length > 0 || dividendTrend.length > 0) && (
              <div className="mt-8">
                <h3 className="text-base font-medium text-gray-800 mb-3">📋 历史数据汇总</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">年份</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">净利润（亿）</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">同比增长</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">每股分红（元）</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">分红增长</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {years.map((year, i) => {
                        const profit = profitTrend[i]
                        const prevProfit = i > 0 ? profitTrend[i-1] : null
                        const profitChange = prevProfit ? ((profit - prevProfit) / prevProfit * 100).toFixed(1) : '-'
                        
                        const dividend = dividendTrend[i]
                        const prevDividend = i > 0 ? dividendTrend[i-1] : null
                        const dividendChange = prevDividend ? ((dividend - prevDividend) / prevDividend * 100).toFixed(1) : '-'
                        
                        return (
                          <tr key={year} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{year}年</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{profit}</td>
                            <td className="px-4 py-2 text-sm text-gray-500 text-right">
                              {prevProfit ? (profitChange > 0 ? `+${profitChange}%` : `${profitChange}%`) : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">{dividend}</td>
                            <td className="px-4 py-2 text-sm text-gray-500 text-right">
                              {prevDividend ? (dividendChange > 0 ? `+${dividendChange}%` : `${dividendChange}%`) : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 无数据提示 */}
            {profitTrend.length === 0 && dividendTrend.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-2">暂无趋势数据</p>
                <p className="text-sm">该公司尚未添加历史财务数据</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}