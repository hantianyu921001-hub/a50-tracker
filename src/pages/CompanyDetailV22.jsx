import { useParams, Link } from 'react-router-dom'
import { useScoring } from '../context/ScoringContext'
import RadarChart6D from '../components/detail/RadarChart6D'
import ScoreDetailPanel from '../components/detail/ScoreDetailPanel'
import ValuationIndicators from '../components/detail/ValuationIndicators'
import RiskDeduction from '../components/detail/RiskDeduction'
import V22StrategyCard from '../components/detail/V22StrategyCard'

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

const gradeLabels = {
  'S': '极度低估',
  'A+': '强烈买入',
  'A': '买入',
  'B+': '偏强持有',
  'B': '持有',
  'C': '观望',
  'D': '规避',
}

// 各维度满分
const DIM_MAX = { moat: 25, growth: 20, profit: 20, valuation: 25, catalyst: 10, risk: 15 }
const DIM_NAMES = { moat: '护城河', growth: '成长性', profit: '盈利质量', valuation: '估值安全边际', catalyst: '催化剂', risk: '风险扣分' }

// 解析单个子项（兼容对象和字符串格式）
function parseDetailItem(item) {
  if (!item) return null
  if (typeof item === 'object' && item.name !== undefined) {
    return { name: item.name, score: item.score ?? 0, max: item.max ?? 5 }
  }
  if (typeof item === 'string') {
    const match = item.match(/^(.+?)(-?\d+)\/(\d+)$/)
    if (!match) return null
    return { name: match[1], score: parseInt(match[2]), max: parseInt(match[3]) }
  }
  return null
}

// 根据细项得分生成维度解读
function generateDimInsight(dimKey, score, details) {
  const items = details?.[dimKey]
  if (!items || items.length === 0) return null

  const parsed = items.map(parseDetailItem).filter(Boolean)

  if (parsed.length === 0) return null

  const strong = parsed.filter(p => p.score / p.max >= 0.8)
  const weak = parsed.filter(p => p.score / p.max <= 0.3)

  const parts = []
  if (strong.length > 0) {
    parts.push(`强项：${strong.map(s => `${s.name}(${s.score}/${s.max})`).join('、')}`)
  }
  if (weak.length > 0) {
    parts.push(`弱项：${weak.map(s => `${s.name}(${s.score}/${s.max})`).join('、')}`)
  }
  if (parts.length === 0) {
    parts.push('各项均衡，无明显短板')
  }
  return parts.join('；')
}

export default function CompanyDetailV22() {
  const { code } = useParams()
  const { companies, getTotalScore, getGrade } = useScoring()

  const company = companies.find((c) => c.code === code)

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">未找到该公司</div>
        <Link to="/" className="text-blue-600 hover:text-blue-800">返回列表</Link>
      </div>
    )
  }

  if (!company.v22Available) {
    return (
      <div>
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回列表
        </Link>
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="text-gray-500 mb-2">⚠️ 该公司暂无 v2.2 评分数据</div>
          <div className="text-sm text-gray-400">请切换到 v2.0 模式查看详情</div>
        </div>
      </div>
    )
  }

  const grade = getGrade(company)
  const totalScore = getTotalScore(company)

  // v2.2 评分数据
  const v22Scores = {
    moat: company.v22_moat || 0,
    growth: company.v22_growth || 0,
    profit: company.v22_profit || 0,
    valuation: company.v22_valuation || 0,
    catalyst: company.v22_catalyst || 0,
    risk: company.v22_risk || 0,
  }

  return (
    <div>
      <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* 1. 顶部信息栏 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-gray-500 mb-1">
                {company.isA50 && company.rank ? `权重排名 #${company.rank}` : '非A50成分股'}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
              <div className="text-gray-600">{company.code} · {company.industry}</div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${gradeColors[grade] || gradeColors['-']}`}>
                {grade} · {gradeLabels[grade] || grade}
              </span>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {totalScore}<span className="text-sm text-gray-500">/100</span>
              </div>
              <div className="text-xs text-blue-500 mt-1">v2.2 评分</div>
            </div>
          </div>
        </div>

        {/* 2. 六维雷达图 + 维度评分摘要 */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            六维评分概览
            <span className="text-sm font-normal text-gray-500 ml-2">（v2.2 六维度模型）</span>
          </h2>
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* 雷达图 */}
            <div className="flex-shrink-0">
              <RadarChart6D scores={v22Scores} />
            </div>
            {/* 维度评分摘要 */}
            <div className="flex-1 w-full">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: '护城河', key: 'moat', max: 25 },
                  { name: '成长性', key: 'growth', max: 20 },
                  { name: '盈利质量', key: 'profit', max: 20 },
                  { name: '估值安全边际', key: 'valuation', max: 25 },
                  { name: '催化剂', key: 'catalyst', max: 10 },
                  { name: '风险扣分', key: 'risk', max: 15 },
                ].map(dim => {
                  const val = v22Scores[dim.key]
                  const pct = dim.key === 'risk' ? Math.abs(val) / dim.max : val / dim.max
                  const isRisk = dim.key === 'risk'
                  return (
                    <div key={dim.key} className={`rounded-lg p-3 border ${isRisk && val < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{dim.name}</span>
                        <span className="text-xs text-gray-400">{isRisk ? '扣分' : `${dim.max}分`}</span>
                      </div>
                      <div className={`text-lg font-bold ${isRisk && val < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {isRisk ? (val < 0 ? val : '0') : val}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            isRisk
                              ? (val < 0 ? 'bg-red-500' : 'bg-green-500')
                              : (pct >= 0.8 ? 'bg-green-500' : pct >= 0.6 ? 'bg-blue-500' : pct >= 0.4 ? 'bg-yellow-500' : 'bg-red-500')
                          }`}
                          style={{ width: `${Math.max(pct * 100, 2)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. 细项得分解读 */}
        <ScoreDetailPanel
          v22Details={company.v22_details}
          dataGaps={company.v22_data_gaps}
        />

        {/* 4. 维度分析解读 */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">维度分析解读</h2>
          <div className="space-y-3">
            {['moat', 'growth', 'profit', 'valuation', 'catalyst'].map(dimKey => {
              const insight = generateDimInsight(dimKey, v22Scores[dimKey], company.v22_details)
              if (!insight) return null
              const scorePct = v22Scores[dimKey] / DIM_MAX[dimKey]
              const level = scorePct >= 0.8 ? '优' : scorePct >= 0.6 ? '良' : scorePct >= 0.4 ? '中' : '弱'
              const levelColor = scorePct >= 0.8 ? 'bg-green-100 text-green-800' : scorePct >= 0.6 ? 'bg-blue-100 text-blue-800' : scorePct >= 0.4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              return (
                <div key={dimKey} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${levelColor}`}>
                      {level}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-800">{DIM_NAMES[dimKey]} {v22Scores[dimKey]}/{DIM_MAX[dimKey]}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{insight}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 5. 建仓策略 */}
        <V22StrategyCard
          grade={grade}
          score={totalScore}
          v22Details={company.v22_details}
        />

        {/* 6. 投资结论（纯v2.2） */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">投资结论</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${gradeColors[grade] || gradeColors['-']}`}>
                {grade}
              </span>
              <span className="text-sm font-semibold text-blue-900">{gradeLabels[grade]}</span>
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">
              v2.2 评分 {totalScore}/100，评级 {grade}（{gradeLabels[grade]}）。
              {grade === 'D' && '当前估值过高或风险较大，不建议介入。'}
              {grade === 'C' && '估值偏高或存在不确定性，建议观望等待更优价格。'}
              {grade === 'B' && '估值合理，可持有等待催化剂兑现。'}
              {grade === 'B+' && '估值适中偏合理，持有为主。'}
              {grade === 'A' && '估值合理偏低，具备建仓价值。'}
              {grade === 'A+' && '显著低估，建议积极建仓。'}
              {grade === 'S' && '极度低估，安全边际极高。'}
            </p>
            {/* 各维度得分一览 */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {Object.entries(DIM_NAMES).filter(([k]) => k !== 'risk').map(([key, name]) => (
                <div key={key} className="bg-white/60 rounded p-2 text-center">
                  <div className="text-[10px] text-gray-500">{name}</div>
                  <div className="text-sm font-semibold text-gray-800">{v22Scores[key]}/{DIM_MAX[key]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. 估值指标 */}
        <ValuationIndicators
          pe={company.v22_pe}
          pb={company.v22_pb}
          roe={company.v22_roe}
          dy={company.v22_dy}
        />

        {/* 8. 风险与约束 */}
        <RiskDeduction
          riskScore={company.v22_risk || 0}
          riskDetails={company.v22_details?.risk || []}
          constraint={company.v22_constraint}
        />

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
            最后更新：{company.lastUpdate || '未更新'} | v2.2 评分模型
          </div>
        </div>
      </div>
    </div>
  )
}
