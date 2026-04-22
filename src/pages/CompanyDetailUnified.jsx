import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useScoring } from '../context/ScoringContext'
import {
  getCompanyArchive,
  getCompanyArchiveHistory,
  updateDecision,
  discoverCompanyEvents as apiDiscoverCompanyEvents,
  refreshCompany as apiRefreshCompany,
} from '../services/api'
import RadarChart6D from '../components/detail/RadarChart6D'
import ScoreDetailPanel from '../components/detail/ScoreDetailPanel'
import ValuationIndicators from '../components/detail/ValuationIndicators'
import RiskDeduction from '../components/detail/RiskDeduction'
import V22StrategyCard from '../components/detail/V22StrategyCard'
import CompanyOverview from '../components/detail/CompanyOverview'
import AnnualReport from '../components/detail/AnnualReport'
import CompetitiveAdvantage from '../components/detail/CompetitiveAdvantage'
import ValuationTable from '../components/detail/ValuationTable'
import RiskList from '../components/detail/RiskList'
import TrendChart from '../components/detail/TrendChart'
import VersionHistory from '../components/detail/VersionHistory'
import ChecklistPanel from '../components/detail/ChecklistPanel'
import DecisionReviewPanel from '../components/detail/DecisionReviewPanel'

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

// 各维度满分（v2.2 原始分）
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

// V2.0 风格评分颜色
function getV20ScoreColor(ratio) {
  if (ratio >= 0.9) return 'text-red-600 font-bold'
  if (ratio >= 0.8) return 'text-orange-600 font-semibold'
  if (ratio >= 0.7) return 'text-green-600'
  if (ratio >= 0.6) return 'text-yellow-600'
  return 'text-gray-600'
}

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${(Number(value) * 100).toFixed(2)}%`
}

function formatLargeNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  return `${(num / 1e12).toFixed(2)}万亿`
}

function formatPrice(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(2)
}

function formatSigned(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}`
}

function formatPctFromPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${(Number(value) * 100).toFixed(2)}%`
}

function formatScoreGrade(score = {}) {
  if (score.total == null) return '—'
  return `${score.total} / ${score.grade || '-'}`
}

function isBankExternalValidation(externalValidation) {
  const company = externalValidation?.externalData?.company || {}
  return company.industry === '银行' || !!company.bank_type
}

function buildExternalAnnualReport(externalValidation) {
  const financial = externalValidation?.externalData?.financial_data || {}
  if (!isBankExternalValidation(externalValidation)) {
    const rows = [
      ['营业总收入', formatLargeNumber(financial.revenue), financial.revenue_yoy != null ? formatPct(financial.revenue_yoy) : '待补充'],
      ['归母净利润', formatLargeNumber(financial.attributable_net_profit || financial.net_profit), formatPct(financial.net_profit_yoy)],
      ['ROE', formatPct(financial.roe), '已获取'],
      ['毛利率', formatPct(financial.gross_margin), financial.gross_margin != null ? '已获取' : '待补充'],
      ['净利率', formatPct(financial.net_margin), financial.net_margin != null ? '已获取' : '待补充'],
      ['资产负债率', formatPct(financial.debt_ratio), financial.debt_ratio != null ? '已获取' : '待补充'],
      ['每股收益(EPS)', financial.eps != null ? formatPrice(financial.eps) : '待补充', financial.eps != null ? '已获取' : '未接稳定来源'],
      ['每股净资产(BVPS)', financial.bvps != null ? formatPrice(financial.bvps) : '待补充', financial.bvps != null ? '已获取' : '未接稳定来源'],
      ['每10股分红', financial.dividend_per_10_shares != null ? `${formatPrice(financial.dividend_per_10_shares)} 元` : '待补充', financial.dividend_per_10_shares != null ? '已获取' : '待补充'],
      ['现金分红总额', formatLargeNumber(financial.cash_dividend_total), financial.cash_dividend_total != null ? '已获取' : '待补充'],
    ]
    return rows.map(([metric, value, change]) => ({ metric, value, change }))
  }

  const rows = [
    ['营业总收入', formatLargeNumber(financial.revenue), financial.revenue_yoy != null ? formatPct(financial.revenue_yoy) : '待补充'],
    ['总资产', formatLargeNumber(financial.total_assets), formatPct(financial.total_assets_yoy)],
    ['客户贷款', formatLargeNumber(financial.customer_loans), formatPct(financial.customer_loans_yoy)],
    ['客户存款', formatLargeNumber(financial.customer_deposits), formatPct(financial.customer_deposits_yoy)],
    ['归母净利润', formatLargeNumber(financial.attributable_net_profit || financial.net_profit), formatPct(financial.net_profit_yoy)],
    ['ROE', formatPct(financial.roe), '已获取'],
    ['净息差', formatPct(financial.net_interest_margin), '已获取'],
    ['不良率', formatPct(financial.npl_ratio), '已获取'],
    ['拨备覆盖率', formatPct(financial.provision_coverage), '已获取'],
    ['核心一级资本充足率', formatPct(financial.core_tier1_ratio), '已获取'],
    ['资本充足率', formatPct(financial.capital_adequacy_ratio), '已获取'],
    ['每10股分红', financial.dividend_per_10_shares != null ? `${formatPrice(financial.dividend_per_10_shares)} 元` : '待补充', financial.dividend_per_10_shares != null ? '已获取' : '待补充'],
    ['现金分红总额', formatLargeNumber(financial.cash_dividend_total), financial.cash_dividend_total != null ? '已获取' : '待补充'],
    ['每股收益(EPS)', financial.eps != null ? formatPrice(financial.eps) : '待补充', financial.eps != null ? '已获取' : '未接稳定来源'],
    ['每股净资产(BVPS)', financial.bvps != null ? formatPrice(financial.bvps) : '待补充', financial.bvps != null ? '已获取' : '未接稳定来源'],
  ]

  return rows.map(([metric, value, change]) => ({ metric, value, change }))
}

function buildExternalValuationAnalysis(externalValidation) {
  const market = externalValidation?.externalData?.market_data || {}
  if (!isBankExternalValidation(externalValidation)) {
    return {
      current: `当前外部抓取已拿到最新价 ${formatPrice(market.price)} 元、PE ${formatPrice(market.pe)}、PB ${formatPrice(market.pb)}、总市值 ${formatLargeNumber(market.market_cap)}。这足以先做一版通用估值分析，但同业估值带和更完整的行业口径仍待补充。`,
      comparison: [
        { 指标: '最新价', 数值: `${formatPrice(market.price)} 元`, 口径: '腾讯财经' },
        { 指标: 'PE', 数值: formatPrice(market.pe), 口径: '腾讯口径（候选）' },
        { 指标: 'PB', 数值: formatPrice(market.pb), 口径: '腾讯口径（候选）' },
        { 指标: '股息率', 数值: formatPct(market.dividend_yield), 口径: '分红与现价推算' },
        { 指标: 'PE历史分位', 数值: market.pe_percentile != null ? formatPct(market.pe_percentile) : '待补充', 口径: market.pe_percentile != null ? '百度估值近十年' : '尚未接入稳定免费来源' },
        { 指标: 'PB历史分位', 数值: market.pb_percentile != null ? formatPct(market.pb_percentile) : '待补充', 口径: market.pb_percentile != null ? '百度估值近十年' : '尚未接入稳定免费来源' },
        { 指标: '总市值', 数值: formatLargeNumber(market.market_cap), 口径: '腾讯财经' },
        { 指标: '流通市值', 数值: formatLargeNumber(market.float_market_cap), 口径: '腾讯财经' },
      ],
    }
  }

  return {
    current: `当前外部抓取已拿到最新价 ${formatPrice(market.price)} 元、PE ${formatPrice(market.pe)}、PB ${formatPrice(market.pb)}、股息率 ${formatPct(market.dividend_yield)}。其中 PE/PB 为腾讯行情口径，股息率为官方年报分红推算；若近十年分位已接通，则可进一步判断当前位置处于历史高位还是低位。`,
    comparison: [
      { 指标: '最新价', 数值: `${formatPrice(market.price)} 元`, 口径: '腾讯财经' },
      { 指标: 'PE', 数值: formatPrice(market.pe), 口径: '腾讯口径（候选）' },
      { 指标: 'PB', 数值: formatPrice(market.pb), 口径: '腾讯口径（候选）' },
      { 指标: '股息率', 数值: formatPct(market.dividend_yield), 口径: '官方年报分红推算' },
      { 指标: 'PE历史分位', 数值: market.pe_percentile != null ? formatPct(market.pe_percentile) : '待补充', 口径: market.pe_percentile != null ? '百度估值近十年' : '尚未接入稳定免费来源' },
      { 指标: 'PB历史分位', 数值: market.pb_percentile != null ? formatPct(market.pb_percentile) : '待补充', 口径: market.pb_percentile != null ? '百度估值近十年' : '尚未接入稳定免费来源' },
      { 指标: '总市值', 数值: formatLargeNumber(market.market_cap), 口径: '腾讯财经' },
      { 指标: '流通市值', 数值: formatLargeNumber(market.float_market_cap), 口径: '腾讯财经' },
      { 指标: '同业估值对比', 数值: '待补充', 口径: '尚未自动生成' },
    ],
  }
}

function buildPeerComparisonRows(externalValidation) {
  const peers = externalValidation?.peerComparison || []
  return peers.map((peer) => ({
    银行: peer.name || peer.symbol,
    代码: peer.symbol,
    PE: peer.pe != null ? formatPrice(peer.pe) : '待补充',
    PB: peer.pb != null ? formatPrice(peer.pb) : '待补充',
    股息率: peer.dividend_yield != null ? formatPct(peer.dividend_yield) : '待补充',
    总市值: peer.market_cap != null ? formatLargeNumber(peer.market_cap) : '待补充',
    换手率: peer.turnover != null ? formatPct(peer.turnover) : '待补充',
  }))
}

function buildExternalEventRows(externalValidation) {
  const events = externalValidation?.externalData?.events || []
  return events.map((event) => ({
    日期: event.date || '—',
    事件: event.title || event.type || '—',
    类型: event.type || '—',
    影响: `${event.impact_level || 'unknown'} / ${event.impact_direction || 'neutral'}`,
    刷新: event.requires_refresh ? '需要' : '否',
  }))
}

function getDisplayIndustry(externalValidation) {
  return externalValidation?.externalData?.company?.industry || '待识别行业'
}

function buildExternalRiskWarning(financial = {}, market = {}) {
  const medium = []
  const low = []

  if (financial.net_interest_margin != null && financial.net_interest_margin < 0.015) {
    medium.push(`净息差为 ${formatPct(financial.net_interest_margin)}，盈利弹性仍受压制。`)
  }
  if (market.pe == null || market.pb == null) {
    medium.push('估值字段尚未形成多源交叉验证，当前仍以单一腾讯口径为主。')
  }
  if (market.pe_percentile == null || market.pb_percentile == null) {
    medium.push('历史估值分位、完整事件流、业务结构拆分仍待补充，当前页面更适合作为验证版研究底稿。')
  }

  if (financial.npl_ratio != null) {
    low.push(`不良率 ${formatPct(financial.npl_ratio)}，当前资产质量总体稳健。`)
  }
  if (financial.provision_coverage != null) {
    low.push(`拨备覆盖率 ${formatPct(financial.provision_coverage)}，风险缓冲较厚。`)
  }
  if (market.dividend_yield != null) {
    low.push(`按年报分红推算，当前股息率约 ${formatPct(market.dividend_yield)}。`)
  }
  low.push('官方年报与腾讯行情两条免费数据源已接通，可支撑银行验证版评分。')

  return { medium, low }
}

function buildGenericRiskWarning(financial = {}, market = {}, events = []) {
  const medium = []
  const low = []

  if (financial.revenue_yoy != null && financial.revenue_yoy < 0) {
    medium.push(`营收同比为 ${formatPct(financial.revenue_yoy)}，需要关注订单与需求是否走弱。`)
  }
  if (financial.debt_ratio != null && financial.debt_ratio > 0.6) {
    medium.push(`资产负债率为 ${formatPct(financial.debt_ratio)}，杠杆水平偏高。`)
  }
  if (market.pe_percentile != null && market.pe_percentile > 0.8) {
    medium.push(`PE 历史分位为 ${formatPct(market.pe_percentile)}，估值回撤风险需要留意。`)
  }

  if (financial.roe != null) low.push(`ROE ${formatPct(financial.roe)}，已具备基础盈利质量判断。`)
  if (events.length > 0) low.push(`当前已结构化 ${(events || []).length} 条事件，可作为后续复核起点。`)
  low.push('当前详情页已切换到通用分析模板，不再套用银行字段。')

  return { medium, low }
}

function buildExternalCompetitiveAdvantage(financial = {}, market = {}) {
  return [
    {
      title: '当前已接通的数据',
      points: [
        '官方年报核心财务字段：总资产、客户贷款、客户存款、净利润、ROE、净息差、不良率、拨备覆盖率、资本充足率。',
        `腾讯行情字段：最新价 ${formatPrice(market.price)} 元、PE ${formatPrice(market.pe)}、PB ${formatPrice(market.pb)}、总市值 ${formatLargeNumber(market.market_cap)}。`,
        financial.dividend_per_10_shares != null ? `红利字段：每10股分红 ${formatPrice(financial.dividend_per_10_shares)} 元，现金分红总额 ${formatLargeNumber(financial.cash_dividend_total)}。` : '红利字段：已部分接通。',
      ],
    },
    {
      title: '仍待补充的数据',
      points: [
        market.pe_percentile != null && market.pb_percentile != null ? `近十年 PE 分位 ${formatPct(market.pe_percentile)}、PB 分位 ${formatPct(market.pb_percentile)} 已接通。` : '历史估值分位与同业估值带。',
        '更完整的业务结构拆分，如零售/对公、县域/涉农、息差分部来源。',
        '结构化事件流：业绩预告、分红方案变动、监管处罚、回购增发等。',
        'EPS、BVPS 等可直接复用到更多估值模型的字段。',
      ],
    },
  ]
}

function buildGenericCompetitiveAdvantage(company = {}, financial = {}, market = {}) {
  return [
    {
      title: '当前已接通的数据',
      points: [
        `基础识别：${company.name || '该公司'} / ${company.industry || '行业待识别'}。`,
        company.main_business ? `主营业务：${company.main_business}` : '主营业务：待补充。',
        `行情估值：最新价 ${formatPrice(market.price)} 元、PE ${formatPrice(market.pe)}、PB ${formatPrice(market.pb)}、总市值 ${formatLargeNumber(market.market_cap)}。`,
        `通用财务：营收 ${formatLargeNumber(financial.revenue)}、净利润 ${formatLargeNumber(financial.net_profit)}、ROE ${formatPct(financial.roe)}。`,
      ],
    },
    {
      title: '仍待补强的证据',
      points: [
        '行业竞争格局、订单能见度、产品结构和客户壁垒仍需行业插件补充。',
        '通用分析器已能输出基础评分，但尚未覆盖军工/卫星等行业专属字段。',
        '后续若接入行业插件，可进一步提升护城河、催化和风险维度解释质量。',
      ],
    },
  ]
}

function buildExternalInvestmentStrategy(market = {}) {
  const price = Number(market.price || 0)
  const firstBatch = price > 0 ? `${(price * 0.98).toFixed(2)}-${(price * 1.00).toFixed(2)}元（现价附近验证口径）` : '待补充'
  const secondBatch = price > 0 ? `${(price * 0.94).toFixed(2)}-${(price * 0.97).toFixed(2)}元（回调后再看）` : '待补充'
  const thirdBatch = price > 0 ? `${(price * 0.90).toFixed(2)}-${(price * 0.93).toFixed(2)}元（需结合事件复核）` : '待补充'

  return {
    targetPrice: market.pb_percentile != null ? '可结合 PB 历史分位进一步估算（当前仍为验证版）' : '待补充（需补历史估值分位与同业比较）',
    positionSize: '验证版建议 3-5% 观察仓',
    entryStrategy: {
      firstBatch,
      secondBatch,
      thirdBatch,
    },
    exitStrategy: {
      partial: '待补充（缺完整估值带）',
      major: '待补充（缺完整估值带）',
      full: '若核心逻辑证伪则退出',
    },
  }
}

function buildExternalAnalysis(externalValidation) {
  const data = externalValidation?.externalData || {}
  const company = data.company || {}
  const market = data.market_data || {}
  const financial = data.financial_data || {}
  const peerComparison = buildPeerComparisonRows(externalValidation)
  const isBank = isBankExternalValidation(externalValidation)
  const valuationAnalysis = buildExternalValuationAnalysis(externalValidation)
  if (peerComparison.length > 0) {
    valuationAnalysis.comparison = [...valuationAnalysis.comparison, ...peerComparison]
  }

  return {
    companyOverview: isBank
      ? `${company.name || '该公司'}当前详情页已切换到“外部数据映射版”结构。现阶段已接通官方年报核心财务、腾讯行情、腾讯候选估值、年报推算股息率，以及近十年历史估值分位，因此这份详情页已经可以用于验证自动分析链条的核心估值能力；结构化事件流和更细的业务拆分仍待补齐。`
      : `${company.name || '该公司'}当前详情页已切换到“通用主干分析”结构。${company.main_business ? `主营业务为：${company.main_business}。` : ''}现阶段已接通通用行情、基础财务、估值分位和结构化事件，因此已经能做一版不失真的通用分析；后续可按行业继续叠加军工、消费、周期等专属插件。`,
    annualReport: buildExternalAnnualReport(externalValidation),
    valuationAnalysis,
    riskWarning: isBank ? buildExternalRiskWarning(financial, market) : buildGenericRiskWarning(financial, market, data.events || []),
    competitiveAdvantage: isBank ? buildExternalCompetitiveAdvantage(financial, market) : buildGenericCompetitiveAdvantage(company, financial, market),
    investmentStrategy: buildExternalInvestmentStrategy(market),
    conclusion: isBank
      ? `${company.name || '该公司'}的验证版详情页已具备“财务 + 行情 + 估值 + 红利”四个基础层次。当前足够支持银行股最小评分与页面展示，但仍不是最终正式投研档案。`
      : `${company.name || '该公司'}当前已具备“通用财务 + 行情 + 估值 + 事件”四个基础层次。当前足够支持跨行业通用评分与页面展示，后续可再叠加行业插件提升精度。`,
  }
}

function buildCoverageSections(externalValidation) {
  const data = externalValidation?.externalData || {}
  const company = data.company || {}
  const market = data.market_data || {}
  const financial = data.financial_data || {}
  const score = externalValidation?.score || {}
  const isBank = isBankExternalValidation(externalValidation)

  const mark = (label, status, note) => ({ label, status, note })

  return [
    {
      title: '基础信息',
      items: [
        mark('股票代码 / 名称', company.symbol && company.name ? 'ready' : 'missing', company.symbol && company.name ? `${company.symbol} / ${company.name}` : '待补充'),
        mark('行业 / 银行类型', company.industry && company.bank_type ? 'ready' : 'partial', `${company.industry || '待补充'} / ${company.bank_type || '待补充'}`),
        mark('上市日期', company.listing_date ? 'ready' : 'missing', company.listing_date || '未接稳定来源'),
        mark('标签 / 推荐语 / 摘要', 'partial', '页面可生成验证版文案，但非正式主档字段'),
      ],
    },
    {
      title: '年报核心数据',
      items: isBank ? [
        mark('总资产 / 同比', financial.total_assets != null && financial.total_assets_yoy != null ? 'ready' : 'missing', `${formatLargeNumber(financial.total_assets)} / ${formatPct(financial.total_assets_yoy)}`),
        mark('客户贷款 / 同比', financial.customer_loans != null && financial.customer_loans_yoy != null ? 'ready' : 'missing', `${formatLargeNumber(financial.customer_loans)} / ${formatPct(financial.customer_loans_yoy)}`),
        mark('客户存款 / 同比', financial.customer_deposits != null && financial.customer_deposits_yoy != null ? 'ready' : 'missing', `${formatLargeNumber(financial.customer_deposits)} / ${formatPct(financial.customer_deposits_yoy)}`),
        mark('净利润 / 同比', financial.net_profit != null && financial.net_profit_yoy != null ? 'ready' : 'missing', `${formatLargeNumber(financial.net_profit)} / ${formatPct(financial.net_profit_yoy)}`),
        mark('ROE / 净息差 / 不良率', financial.roe != null && financial.net_interest_margin != null && financial.npl_ratio != null ? 'ready' : 'missing', `${formatPct(financial.roe)} / ${formatPct(financial.net_interest_margin)} / ${formatPct(financial.npl_ratio)}`),
        mark('拨备覆盖率 / 资本充足率', financial.provision_coverage != null && financial.core_tier1_ratio != null && financial.capital_adequacy_ratio != null ? 'ready' : 'missing', `${formatPct(financial.provision_coverage)} / ${formatPct(financial.core_tier1_ratio)} / ${formatPct(financial.capital_adequacy_ratio)}`),
        mark('每10股分红 / 现金分红总额', financial.dividend_per_10_shares != null && financial.cash_dividend_total != null ? 'ready' : 'partial', `${financial.dividend_per_10_shares != null ? `${formatPrice(financial.dividend_per_10_shares)} 元` : '待补充'} / ${formatLargeNumber(financial.cash_dividend_total)}`),
        mark('营业收入 / 收入同比', financial.revenue != null && financial.revenue_yoy != null ? 'ready' : 'missing', financial.revenue != null ? `${formatLargeNumber(financial.revenue)} / ${formatPct(financial.revenue_yoy)}` : '当前未从官方免费链路稳定提取'),
        mark('EPS / BVPS', financial.eps != null && financial.bvps != null ? 'ready' : 'missing', financial.eps != null && financial.bvps != null ? `${formatPrice(financial.eps)} / ${formatPrice(financial.bvps)}` : '当前未接稳定来源'),
        mark('利润 / 分红趋势图', 'missing', '当前没有 5 年 trend 序列'),
      ] : [
        mark('营业收入 / 收入同比', financial.revenue != null && financial.revenue_yoy != null ? 'ready' : 'missing', financial.revenue != null ? `${formatLargeNumber(financial.revenue)} / ${formatPct(financial.revenue_yoy)}` : '当前未从免费链路稳定提取'),
        mark('净利润 / 同比', financial.net_profit != null && financial.net_profit_yoy != null ? 'ready' : 'missing', `${formatLargeNumber(financial.net_profit)} / ${formatPct(financial.net_profit_yoy)}`),
        mark('ROE / 毛利率 / 净利率', financial.roe != null && financial.gross_margin != null && financial.net_margin != null ? 'ready' : 'partial', `${formatPct(financial.roe)} / ${formatPct(financial.gross_margin)} / ${formatPct(financial.net_margin)}`),
        mark('资产负债率', financial.debt_ratio != null ? 'ready' : 'missing', formatPct(financial.debt_ratio)),
        mark('EPS / BVPS', financial.eps != null && financial.bvps != null ? 'ready' : 'missing', financial.eps != null && financial.bvps != null ? `${formatPrice(financial.eps)} / ${formatPrice(financial.bvps)}` : '当前未接稳定来源'),
        mark('每10股分红 / 现金分红总额', financial.dividend_per_10_shares != null && financial.cash_dividend_total != null ? 'ready' : 'partial', `${financial.dividend_per_10_shares != null ? `${formatPrice(financial.dividend_per_10_shares)} 元` : '待补充'} / ${formatLargeNumber(financial.cash_dividend_total)}`),
        mark('资产规模 / 固定资产 / 在手订单', 'partial', '通用链已能抓到基础财务，但行业专属经营指标仍待插件补充'),
      ],
    },
    {
      title: '行情与估值',
      items: [
        mark('最新价 / 涨跌 / OHLC', market.price != null && market.change != null && market.open != null && market.high != null && market.low != null && market.prev_close != null ? 'ready' : 'missing', `${formatPrice(market.price)} / ${formatSigned(market.change)} / ${formatPrice(market.open)}-${formatPrice(market.high)}-${formatPrice(market.low)}`),
        mark('成交量 / 成交额', market.volume != null && market.amount != null ? 'ready' : 'missing', `${market.volume?.toLocaleString?.() || '—'} / ${market.amount ? `${(market.amount / 1e8).toFixed(2)}亿` : '—'}`),
        mark('PE / PB', market.pe != null && market.pb != null ? 'candidate' : 'missing', `${formatPrice(market.pe)} / ${formatPrice(market.pb)}（腾讯口径）`),
        mark('股息率', market.dividend_yield != null ? 'candidate' : 'missing', market.dividend_yield != null ? `${formatPct(market.dividend_yield)}（年报推算）` : '待补充'),
        mark('总市值 / 流通市值', market.market_cap != null && market.float_market_cap != null ? 'ready' : 'missing', `${formatLargeNumber(market.market_cap)} / ${formatLargeNumber(market.float_market_cap)}`),
        mark('换手率', market.turnover != null ? 'ready' : 'missing', market.turnover != null ? formatPct(market.turnover) : '当前未接稳定来源'),
        mark(
          '历史估值分位 / fair value',
          market.pe_percentile != null && market.pb_percentile != null ? 'ready' : 'missing',
          market.pe_percentile != null && market.pb_percentile != null
            ? `PE分位 ${formatPct(market.pe_percentile)} / PB分位 ${formatPct(market.pb_percentile)}`
            : '当前未接入历史估值分位和合理价值区间'
        ),
        mark('同业估值对比', (externalValidation?.peerComparison || []).length > 1 ? 'ready' : 'missing', (externalValidation?.peerComparison || []).length > 1 ? `已生成 ${(externalValidation?.peerComparison || []).length} 家银行横向估值对照` : '当前未自动生成招行/工行/建行等横向对比'),
      ],
    },
    {
      title: '策略与结论',
      items: [
        mark('公司概况 / 投资结论', 'ready', '已生成验证版文案'),
        mark('目标价 / 仓位 / 时间维度', 'partial', '仓位与建仓区间可生成，目标价和时间维度仍待补充'),
        mark('分批建仓 / 分级退出', 'partial', '已生成验证版区间，但非正式策略模型'),
        mark('分红再投资策略', 'missing', '当前未生成'),
      ],
    },
    {
      title: '风险与事件',
      items: [
        mark('基础风险提示', 'ready', '已根据净息差、估值口径完整度等生成'),
        mark('结构化事件流', (externalValidation?.externalData?.events || []).length > 0 ? 'ready' : 'missing', (externalValidation?.externalData?.events || []).length > 0 ? `已生成 ${(externalValidation?.externalData?.events || []).length} 条结构化事件` : '分红、业绩预告、监管处罚、回购增发尚未接入事件列表'),
        mark('催化剂分析支撑', score.dimensions?.catalyst != null ? 'partial' : 'missing', score.dimensions?.catalyst != null ? `当前只有“最新年报已发布”这一层` : '待补充'),
      ],
    },
    {
      title: '评分支撑',
      items: [
        mark('总分 / 六维总分', score.total != null && score.dimensions ? 'ready' : 'missing', score.total != null ? `${score.total} / ${score.grade || '-'}` : '待补充'),
        mark('六维子项明细', score.details ? 'ready' : 'missing', score.details ? '已生成兼容 ScoreDetailPanel 的子项结构' : '当前 bankScorer 仅输出六维总分，未输出子项明细'),
        mark('子项分析支撑文本', score.details ? 'ready' : 'missing', score.details ? '每个子项已附 rationale，可在评分面板中展开查看' : '当前没有 v22_details 风格的解释结构'),
        mark('数据缺口 / 约束命中', score.data_gaps?.length ? 'partial' : 'missing', score.data_gaps?.length ? `已识别 ${score.data_gaps.length} 项数据缺口，constraint_hit 仍未接入` : '外部验证链尚未输出 data_gaps / constraint_hit'),
        mark('正式归档版本链', 'partial', '当前以验证页兜底展示，尚未写入正式 current.json'),
      ],
    },
  ]
}

function CoverageBadge({ status }) {
  const styles = {
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    candidate: 'bg-amber-50 text-amber-700 border-amber-200',
    partial: 'bg-blue-50 text-blue-700 border-blue-200',
    missing: 'bg-rose-50 text-rose-700 border-rose-200',
  }
  const labels = {
    ready: '已获取',
    candidate: '候选口径',
    partial: '部分具备',
    missing: '待补充',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] || styles.missing}`}>
      {labels[status] || '待补充'}
    </span>
  )
}

export default function CompanyDetailUnified() {
  const { code } = useParams()
  const { companies, getTotalScore, getGrade } = useScoring()
  const contextCompany = companies.find((c) => c.code === code)
  const [activeTab, setActiveTab] = useState('analysis') // 'analysis' | 'trend'
  const [refreshing, setRefreshing] = useState(false)
  const [discoveringEvents, setDiscoveringEvents] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [archiveBundle, setArchiveBundle] = useState(null)
  const [archiveLoading, setArchiveLoading] = useState(true)
  const [archiveError, setArchiveError] = useState('')
  const [decisionSubmitting, setDecisionSubmitting] = useState(false)

  async function loadArchiveBundle(targetCode) {
    const [archiveResult, historyResult] = await Promise.all([
      getCompanyArchive(targetCode),
      getCompanyArchiveHistory(targetCode, 20),
    ])
    return {
      current: archiveResult.data?.current || null,
      decision: archiveResult.data?.decision || null,
      events: archiveResult.data?.events || [],
      history: historyResult?.data?.history || [],
      changes: historyResult?.data?.changes || [],
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadArchive() {
      try {
        setArchiveLoading(true)
        setArchiveError('')
        const nextBundle = await loadArchiveBundle(code)
        if (!cancelled && nextBundle?.current) {
          setArchiveBundle(nextBundle)
        }
      } catch (error) {
        if (!cancelled) {
          setArchiveError(error.message || '单公司档案接口不可用')
        }
      } finally {
        if (!cancelled) {
          setArchiveLoading(false)
        }
      }
    }

    loadArchive()
    return () => {
      cancelled = true
    }
  }, [code])

  const handleDecisionSubmit = async (payload) => {
    if (!company) return
    setDecisionSubmitting(true)
    setRefreshMsg('保存人工确认中...')
    try {
      const result = await updateDecision(company.code, payload)
      if (result.success) {
        const nextBundle = await loadArchiveBundle(company.code)
        setArchiveBundle(nextBundle)
        setRefreshMsg('✅ 人工确认已保存')
      } else {
        setRefreshMsg(`⚠️ ${result.message || '保存失败'}`)
      }
    } catch (error) {
      setRefreshMsg(`❌ ${error.message}`)
    } finally {
      setDecisionSubmitting(false)
      setTimeout(() => setRefreshMsg(''), 3000)
    }
  }

  const currentRecord = archiveBundle?.current || null
  const decisionState = archiveBundle?.decision || contextCompany?.decisionState || null
  const archiveHistory = archiveBundle?.history || []
  const archiveChanges = archiveBundle?.changes || []
  const externalValidation = currentRecord?.external_validation || null
  const usingArchiveData = !!currentRecord

  const company = useMemo(() => {
    if (!currentRecord) {
      if (!contextCompany) {
        return {
          code,
          name: code,
          industry: '待分析',
          swIndustry: '待分析',
          status: 'pending_analysis',
          tags: ['待触发自动分析'],
          decisionState,
          lastUpdate: '',
          summary: '当前暂无归档，请点击“手动刷新”触发自动分析。',
          recommendation: '待分析',
          v22Available: false,
          v22_data_gaps: [],
          v22_signal_status: 'needs_review',
          v22_signal_age_days: 0,
          v22_stale_reason: '尚未建立单公司归档',
          v22_review_priority: 'medium',
          decision_review_deadline: decisionState?.meta?.reviewDeadline || '',
          decision_last_reviewed_at: decisionState?.meta?.lastReviewedAt || '',
          decision_action: decisionState?.review?.decisionAction || '',
          decision_reason: decisionState?.review?.decisionReason || '',
        }
      }
      return {
        ...contextCompany,
        decisionState,
      }
    }

    const legacy = currentRecord.legacy || {}
    const v22 = currentRecord.v22 || {}
    const archivedExternal = currentRecord.external_validation || {}
    const externalFinancial = archivedExternal.externalData?.financial_data || {}
    const externalMarket = archivedExternal.externalData?.market_data || {}
    const externalScore = archivedExternal.score || {}
    const externalAnalysis = archivedExternal.externalData ? buildExternalAnalysis(archivedExternal) : null

    return {
      ...contextCompany,
      ...legacy,
      code: currentRecord.meta?.code || legacy.code || contextCompany?.code || code,
      name: currentRecord.meta?.name || legacy.name || contextCompany?.name || code,
      industry: currentRecord.meta?.industry || legacy.industry || legacy.swIndustry || contextCompany?.industry || contextCompany?.swIndustry || '未知行业',
      swIndustry: legacy.swIndustry || contextCompany?.swIndustry || currentRecord.meta?.industry || '',
      lastUpdate: currentRecord.meta?.last_update || legacy.lastUpdate || contextCompany?.lastUpdate || '',
      analysis: legacy.analysis || contextCompany?.analysis || externalAnalysis,
      summary: legacy.summary || contextCompany?.summary || externalAnalysis?.conclusion,
      recommendation: legacy.recommendation || contextCompany?.recommendation || '验证版详情页',
      tags: legacy.tags || contextCompany?.tags || [],
      status: legacy.status || contextCompany?.status || 'analyzed',
      rank: legacy.rank || contextCompany?.rank,
      isA50: legacy.isA50 ?? contextCompany?.isA50 ?? true,
      v22Available: !!currentRecord.v22 || !!archivedExternal.score || contextCompany?.v22Available,
      v22_score: v22.v22_total ?? externalScore.total ?? contextCompany?.v22_score,
      v22_grade: v22.v22_grade ?? externalScore.grade ?? contextCompany?.v22_grade,
      v22_base_grade: v22.v22_base_grade ?? contextCompany?.v22_base_grade,
      v22_main: v22.v22_main ?? contextCompany?.v22_main,
      v22_moat: v22.v22_moat ?? externalScore.dimensions?.moat ?? contextCompany?.v22_moat,
      v22_growth: v22.v22_growth ?? externalScore.dimensions?.growth ?? contextCompany?.v22_growth,
      v22_profit: v22.v22_profit ?? externalScore.dimensions?.profit ?? contextCompany?.v22_profit,
      v22_valuation: v22.v22_valuation ?? externalScore.dimensions?.valuation ?? contextCompany?.v22_valuation,
      v22_catalyst: v22.v22_catalyst ?? externalScore.dimensions?.catalyst ?? contextCompany?.v22_catalyst,
      v22_risk: v22.v22_risk ?? externalScore.dimensions?.risk ?? contextCompany?.v22_risk,
      v22_details: v22.v22_details || externalScore.details || contextCompany?.v22_details,
      v22_constraint: currentRecord.signal?.constraint_hit ?? v22.constraint_hit ?? contextCompany?.v22_constraint,
      v22_pe: v22.pe ?? externalMarket.pe ?? contextCompany?.v22_pe,
      v22_pb: v22.pb ?? externalMarket.pb ?? contextCompany?.v22_pb,
      v22_roe: v22.roe ?? externalFinancial.roe ?? contextCompany?.v22_roe,
      v22_dy: v22.dy ?? externalMarket.dividend_yield ?? contextCompany?.v22_dy,
      v22_data_gaps: currentRecord.signal?.data_gaps || externalScore.data_gaps || v22.data_gaps || contextCompany?.v22_data_gaps || [],
      v22_signal_status: currentRecord.signal?.signal_status || contextCompany?.v22_signal_status,
      v22_signal_age_days: currentRecord.signal?.signal_age_days ?? contextCompany?.v22_signal_age_days,
      v22_stale_reason: currentRecord.signal?.stale_reason || contextCompany?.v22_stale_reason || '',
      v22_review_priority: currentRecord.signal?.review_priority || contextCompany?.v22_review_priority || 'low',
      v22_checklist_auto_status: currentRecord.checklist_auto?.status || contextCompany?.v22_checklist_auto_status || 'unknown',
      v22_checklist_auto_score: currentRecord.checklist_auto?.score ?? contextCompany?.v22_checklist_auto_score ?? null,
      v22_checklist_auto_reasons: currentRecord.checklist_auto?.reasons || contextCompany?.v22_checklist_auto_reasons || [],
      decision_review_deadline: decisionState?.meta?.reviewDeadline || contextCompany?.decision_review_deadline || '',
      decision_last_reviewed_at: decisionState?.meta?.lastReviewedAt || contextCompany?.decision_last_reviewed_at || '',
      decision_action: decisionState?.review?.decisionAction || contextCompany?.decision_action || '',
      decision_reason: decisionState?.review?.decisionReason || contextCompany?.decision_reason || '',
      decisionState,
      archiveCurrent: currentRecord,
      archiveEvents: archiveBundle?.events || [],
      externalValidation: archivedExternal,
    }
  }, [archiveBundle?.events, code, contextCompany, currentRecord, decisionState, externalValidation])

  const externalCoverageSections = useMemo(
    () => (externalValidation ? buildCoverageSections(externalValidation) : []),
    [externalValidation]
  )

  const handleRefresh = async () => {
    if (!company) return
    setRefreshing(true)
    setRefreshMsg('正在执行自动分析...')
    try {
      const result = await apiRefreshCompany(company.code, {
        analysisType: 'external',
        trigger: 'manual',
        triggerReason: `手动刷新 ${company.code}`,
      })
      if (result.success) {
        const nextBundle = await loadArchiveBundle(company.code)
        setArchiveBundle(nextBundle)
        setRefreshMsg('✅ ' + result.message)
      } else {
        setRefreshMsg('⚠️ ' + result.message)
      }
    } catch (e) {
      setRefreshMsg('❌ ' + e.message)
    } finally {
      setRefreshing(false)
      setTimeout(() => setRefreshMsg(''), 3000)
    }
  }

  const handleDiscoverEvents = async () => {
    if (!company) return
    setDiscoveringEvents(true)
    setRefreshMsg('正在扫描最近公告...')
    try {
      const result = await apiDiscoverCompanyEvents(company.code)
      if (result.success) {
        const nextBundle = await loadArchiveBundle(company.code)
        setArchiveBundle(nextBundle)
        setRefreshMsg(`✅ ${result.message}`)
      } else {
        setRefreshMsg(`⚠️ ${result.message || '公告扫描失败'}`)
      }
    } catch (error) {
      setRefreshMsg(`❌ ${error.message}`)
    } finally {
      setDiscoveringEvents(false)
      setTimeout(() => setRefreshMsg(''), 4000)
    }
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">未找到该公司</div>
        <Link to="/" className="text-blue-600 hover:text-blue-800">返回列表</Link>
      </div>
    )
  }

  const grade = getGrade(company)
  const totalScore = getTotalScore(company)
  const hasV22 = company.v22Available
  const hasAnalysis = company.status === 'analyzed' && company.analysis

  // v2.2 评分数据
  const v22Scores = hasV22 ? {
    moat: company.v22_moat || 0,
    growth: company.v22_growth || 0,
    profit: company.v22_profit || 0,
    valuation: company.v22_valuation || 0,
    catalyst: company.v22_catalyst || 0,
    risk: company.v22_risk || 0,
  } : null

  // V2.0 风格总分（当无v22时使用）
  const getV20Score = (c, key) => {
    const scores = c.score?.[key] || c[key] || 0
    return typeof scores === 'object' ? scores.summary || 0 : scores
  }
  const v20TotalScore = typeof company.score === 'number'
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

  return (
    <div>
      <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回列表
      </Link>

      {/* Tab 切换（有财务趋势数据时显示） */}
      {(profitTrend.length > 0 || dividendTrend.length > 0) && (
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
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* 基本面分析 Tab */}
        {activeTab === 'analysis' && (
          <>
            {/* 1. 顶部信息栏 */}
            <div className="p-6 border-b border-gray-200">
              <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                archiveLoading
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : usingArchiveData
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-yellow-200 bg-yellow-50 text-yellow-700'
              }`}>
                {archiveLoading && '正在连接单公司档案服务...'}
                {!archiveLoading && usingArchiveData && `当前详情页使用单公司归档数据：${company.code}/current.json + decision.json`}
                {!archiveLoading && !usingArchiveData && `当前暂无归档，点击“手动刷新”可触发自动分析并写入单公司档案${archiveError ? `；原因：${archiveError}` : ''}`}
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    {company.isA50 && company.rank ? `权重排名 #${company.rank}` : '非A50成分股'}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{company.name}</h1>
                  <div className="text-gray-600">{company.code} · {company.industry || company.swIndustry || '未知行业'}</div>
                </div>
                {/* 手动刷新按钮 */}
                <div className="flex items-center gap-2">
                  {refreshMsg && (
                    <span className={`text-xs ${refreshMsg.includes('失败') ? 'text-red-600' : 'text-green-600'}`}>
                      {refreshMsg}
                    </span>
                  )}
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                      refreshing
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {refreshing ? '🔄 分析中...' : '🔄 手动刷新'}
                  </button>
                  <button
                    onClick={handleDiscoverEvents}
                    disabled={discoveringEvents || refreshing}
                    className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                      discoveringEvents || refreshing
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
                    }`}
                  >
                    {discoveringEvents ? '📢 扫描中...' : '📢 扫描最近公告'}
                  </button>
                </div>
                <div className="text-right">
                  {/* v2.2 信号状态 */}
                  {hasV22 && (
                    <div className="text-xs text-gray-500 mb-1">
                      {company.v22_signal_status === 'stale' ? (
                        <span className="text-red-600">⚠️ 已过期（{company.v22_signal_age_days}天）</span>
                      ) : company.v22_signal_status === 'needs_review' ? (
                        <span className="text-yellow-600">⏳ 待复核（{company.v22_signal_age_days}天）</span>
                      ) : (
                        <span className="text-green-600">✅ 有效</span>
                      )}
                    </div>
                  )}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${gradeColors[grade] || gradeColors['-']}`}>
                    {grade} · {gradeLabels[grade] || grade}
                  </span>
                  <div className="mt-2 text-2xl font-bold text-gray-900">
                    {totalScore}<span className="text-sm text-gray-500">/100</span>
                  </div>
                  <div className="text-xs text-blue-500 mt-1">
                    {hasV22 ? 'v2.2 评分' : 'v2.0 评分'}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. 六维雷达图 + 维度摘要（仅v22可用时） */}
            {hasV22 && v22Scores && (
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  六维评分概览
                  <span className="text-sm font-normal text-gray-500 ml-2">（v2.2 六维度模型）</span>
                </h2>
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="flex-shrink-0">
                    <RadarChart6D scores={v22Scores} />
                  </div>
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
            )}

            {/* 3. 细项得分解读（仅v22可用时） */}
            {hasV22 && (
              <ScoreDetailPanel
                v22Details={company.v22_details}
                dataGaps={company.v22_data_gaps}
              />
            )}

            {/* 4. 建仓策略（两个来源并列） */}
            {(hasV22 || (hasAnalysis && company.analysis?.investmentStrategy)) && (
              <div className="p-6 border-b border-gray-200">
                {/* 建仓策略标题 */}
                <h2 className="text-lg font-semibold text-gray-900 mb-4">建仓策略</h2>

                {/* V2.2 建仓策略（上方） */}
                {hasV22 && (
                  <div className="mb-4">
                    <V22StrategyCard
                      company={company}
                      grade={grade}
                      score={totalScore}
                    />
                  </div>
                )}

                {/* V2.0 建仓策略（下方） */}
                {hasAnalysis && company.analysis?.investmentStrategy && (
                  <div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
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
                    
                    {/* 分批建仓方案 */}
                    {company.analysis?.investmentStrategy?.entryStrategy && (
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 font-medium mb-2">📥 分批建仓方案</div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                            <div className="text-xs text-green-700 mb-1">第一批</div>
                            <div className="text-sm font-medium text-green-900">{company.analysis.investmentStrategy.entryStrategy.firstBatch || '-'}</div>
                          </div>
                          <div className="bg-lime-50 rounded-lg p-3 border border-lime-100">
                            <div className="text-xs text-lime-700 mb-1">第二批</div>
                            <div className="text-sm font-medium text-lime-900">{company.analysis.investmentStrategy.entryStrategy.secondBatch || '-'}</div>
                          </div>
                          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                            <div className="text-xs text-emerald-700 mb-1">第三批</div>
                            <div className="text-sm font-medium text-emerald-900">{company.analysis.investmentStrategy.entryStrategy.thirdBatch || '-'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 分批止盈方案 */}
                    {company.analysis?.investmentStrategy?.exitStrategy && (
                      <div>
                        <div className="text-xs text-gray-500 font-medium mb-2">📤 分批止盈方案</div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                            <div className="text-xs text-yellow-700 mb-1">第一批</div>
                            <div className="text-sm font-medium text-yellow-900">{company.analysis.investmentStrategy.exitStrategy.partial || '-'}</div>
                          </div>
                          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                            <div className="text-xs text-amber-700 mb-1">第二批</div>
                            <div className="text-sm font-medium text-amber-900">{company.analysis.investmentStrategy.exitStrategy.major || '-'}</div>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                            <div className="text-xs text-red-700 mb-1">第三批</div>
                            <div className="text-sm font-medium text-red-900">{company.analysis.investmentStrategy.exitStrategy.full || '-'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5. 投资结论 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">投资结论</h2>

              {/* V2.2 结论模板（上方，有v22数据时） */}
              {hasV22 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${gradeColors[grade] || gradeColors['-']}`}>
                      {grade}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{gradeLabels[grade]}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    v2.2 评分 {totalScore}/100，评级 {grade}（{gradeLabels[grade]}）。
                    {grade === 'D' && '当前估值过高或风险较大，不建议介入。'}
                    {grade === 'C' && '估值偏高或存在不确定性，建议观望等待更优价格。'}
                    {grade === 'B' && '估值合理，可持有等待催化剂兑现。'}
                    {grade === 'B+' && '估值适中偏合理，持有为主。'}
                    {grade === 'A' && '估值合理偏低，具备建仓价值。'}
                    {grade === 'A+' && '显著低估，建议积极建仓。'}
                    {grade === 'S' && '极度低估，安全边际极高。'}
                  </p>
                </div>
              )}

              {/* V2.0 AI 结论文本（下方） */}
              {hasAnalysis && (company.analysis?.conclusion || company.summary) && (
                <div>
                  {!hasV22 && (
                    <div className="text-xs text-gray-500 mb-2">AI 分析摘要</div>
                  )}
                  <p className="text-gray-700 leading-relaxed text-base">
                    {company.analysis?.conclusion || company.summary}
                  </p>
                </div>
              )}
            </div>

            {/* 7. 估值指标 */}
            {hasV22 ? (
              <ValuationIndicators
                pe={company.v22_pe}
                pb={company.v22_pb}
                roe={company.v22_roe}
                dy={company.v22_dy}
              />
            ) : hasAnalysis && company.analysis?.valuationAnalysis ? (
              <ValuationTable valuationAnalysis={company.analysis.valuationAnalysis} />
            ) : null}

            {/* 8. 风险与约束 */}
            {hasV22 ? (
              <RiskDeduction
                riskScore={company.v22_risk || 0}
                riskDetails={company.v22_details?.risk || []}
                constraint={company.v22_constraint}
              />
            ) : hasAnalysis && company.analysis?.riskWarning ? (
              <RiskList riskWarning={company.analysis.riskWarning} />
            ) : null}

            {/* 9. 深度研究区块（V2.0 独有） */}
            {hasAnalysis && (
              <>
                {company.analysis.companyOverview && <CompanyOverview overview={company.analysis.companyOverview} />}
                {company.analysis.annualReport && <AnnualReport annualReport={company.analysis.annualReport} />}
                {company.analysis.competitiveAdvantage && <CompetitiveAdvantage competitiveAdvantage={company.analysis.competitiveAdvantage} />}
              </>
            )}

            {/* 10. 决策Checklist */}
            {decisionState?.checklist && (
              <div className="p-6 border-b border-gray-200">
                <ChecklistPanel
                  checklist={decisionState.checklist}
                  autoScore={company.v22_checklist_auto_score}
                />
              </div>
            )}

            {/* 11. 外部数据验证 */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">行情与估值摘要</h2>
              {externalValidation ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    当前摘要来自最近一次手动刷新或事件触发后的归档结果。财务字段以官方年报为主，行情字段以腾讯财经为主；最新分析时间：{externalValidation.fetched_at || externalValidation.externalData?.fetch_meta?.fetched_at || '—'}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">详情页字段覆盖清单</div>
                          <div className="text-xs text-slate-500">按现有正式详情页结构反推，直接看当前公司有哪些、还缺哪些。</div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <CoverageBadge status="ready" />
                        <CoverageBadge status="candidate" />
                        <CoverageBadge status="partial" />
                        <CoverageBadge status="missing" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      {externalCoverageSections.map((section) => (
                        <div key={section.title} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                          <div className="mb-3 text-sm font-semibold text-slate-900">{section.title}</div>
                          <div className="space-y-2">
                            {section.items.map((item) => (
                              <div key={`${section.title}-${item.label}`} className="flex flex-col gap-2 rounded-lg bg-white px-3 py-2.5 shadow-sm md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-slate-900">{item.label}</div>
                                  <div className="mt-0.5 text-xs text-slate-500">{item.note}</div>
                                </div>
                                <div className="flex-shrink-0">
                                  <CoverageBadge status={item.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">外部价格摘要</div>
                        <div className="mt-2 flex items-end gap-3">
                          <div className="text-4xl font-semibold leading-none">{formatPrice(externalValidation.externalData?.market_data?.price)}</div>
                          <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            Number(externalValidation.externalData?.market_data?.change || 0) >= 0
                              ? 'bg-red-500/15 text-red-100'
                              : 'bg-emerald-500/15 text-emerald-100'
                          }`}>
                            {formatSigned(externalValidation.externalData?.market_data?.change)} / {formatPctFromPercent((externalValidation.externalData?.market_data?.change_pct ?? 0) / 100)}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">今开 {formatPrice(externalValidation.externalData?.market_data?.open)}</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">最高 {formatPrice(externalValidation.externalData?.market_data?.high)}</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">最低 {formatPrice(externalValidation.externalData?.market_data?.low)}</span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">昨收 {formatPrice(externalValidation.externalData?.market_data?.prev_close)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:min-w-[320px]">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">PE（腾讯口径）</div>
                          <div className="mt-2 text-2xl font-semibold">{formatPrice(externalValidation.externalData?.market_data?.pe)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">PB（腾讯口径）</div>
                          <div className="mt-2 text-2xl font-semibold">{formatPrice(externalValidation.externalData?.market_data?.pb)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">股息率（年报推算）</div>
                          <div className="mt-2 text-2xl font-semibold">{formatPct(externalValidation.externalData?.market_data?.dividend_yield)}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">外部验证分</div>
                          <div className="mt-2 text-2xl font-semibold">{formatScoreGrade(externalValidation.score)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">市场口径</div>
                          <div className="text-xs text-slate-500">免费行情源验证结果</div>
                        </div>
                        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {externalValidation.externalData?.fetch_meta?.source || '—'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">总市值</div>
                          <div className="mt-1 font-semibold text-slate-900">{formatLargeNumber(externalValidation.externalData?.market_data?.market_cap)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">流通市值</div>
                          <div className="mt-1 font-semibold text-slate-900">{formatLargeNumber(externalValidation.externalData?.market_data?.float_market_cap)}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">成交量</div>
                          <div className="mt-1 font-semibold text-slate-900">{externalValidation.externalData?.market_data?.volume?.toLocaleString?.() || '—'}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">成交额</div>
                          <div className="mt-1 font-semibold text-slate-900">{externalValidation.externalData?.market_data?.amount ? `${(externalValidation.externalData.market_data.amount / 1e8).toFixed(2)}亿` : '—'}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">每10股分红</div>
                          <div className="mt-1 font-semibold text-slate-900">{externalValidation.externalData?.financial_data?.dividend_per_10_shares != null ? `${formatPrice(externalValidation.externalData.financial_data.dividend_per_10_shares)} 元` : '—'}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">现金分红总额</div>
                          <div className="mt-1 font-semibold text-slate-900">{formatLargeNumber(externalValidation.externalData?.financial_data?.cash_dividend_total)}</div>
                        </div>
                      </div>
                    </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 text-sm font-semibold text-slate-900">
                          {isBankExternalValidation(externalValidation) ? '银行关键财务' : '公司资料与通用财务'}
                        </div>
                        {isBankExternalValidation(externalValidation) ? (
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">ROE</div><div className="mt-1 font-semibold text-slate-900">{formatPct(externalValidation.externalData?.financial_data?.roe)}</div></div>
                            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">净息差</div><div className="mt-1 font-semibold text-slate-900">{formatPct(externalValidation.externalData?.financial_data?.net_interest_margin)}</div></div>
                            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">不良率</div><div className="mt-1 font-semibold text-slate-900">{formatPct(externalValidation.externalData?.financial_data?.npl_ratio)}</div></div>
                            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">拨备覆盖率</div><div className="mt-1 font-semibold text-slate-900">{formatPct(externalValidation.externalData?.financial_data?.provision_coverage)}</div></div>
                            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">核心一级资本充足率</div><div className="mt-1 font-semibold text-slate-900">{formatPct(externalValidation.externalData?.financial_data?.core_tier1_ratio)}</div></div>
                            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">资本充足率</div><div className="mt-1 font-semibold text-slate-900">{formatPct(externalValidation.externalData?.financial_data?.capital_adequacy_ratio)}</div></div>
                          </div>
                        ) : (
                          <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">所属行业</div><div className="mt-1 font-semibold text-slate-900">{getDisplayIndustry(externalValidation)}</div></div>
                              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">上市日期</div><div className="mt-1 font-semibold text-slate-900">{externalValidation.externalData?.company?.listing_date || '待补充'}</div></div>
                              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">概念标签</div><div className="mt-1 font-semibold text-slate-900">{externalValidation.externalData?.company?.concept || '待补充'}</div></div>
                              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">产品类型</div><div className="mt-1 font-semibold text-slate-900">{externalValidation.externalData?.company?.product_type || '待补充'}</div></div>
                              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">ROE</div><div className="mt-1 font-semibold text-slate-900">{formatPct(externalValidation.externalData?.financial_data?.roe)}</div></div>
                              <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">资产负债率</div><div className="mt-1 font-semibold text-slate-900">{formatPct(externalValidation.externalData?.financial_data?.debt_ratio)}</div></div>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <div className="text-xs text-slate-500">主营业务</div>
                              <div className="mt-1 text-slate-900 leading-relaxed">{externalValidation.externalData?.company?.main_business || '待补充'}</div>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                              <div className="text-xs text-slate-500">经营范围</div>
                              <div className="mt-1 text-slate-900 leading-relaxed">{externalValidation.externalData?.company?.business_scope || '待补充'}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 text-sm font-semibold text-slate-900">评分维度</div>
                        <div className="space-y-2 text-sm text-slate-700">
                          {Object.entries(externalValidation.score?.dimensions || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between gap-3">
                              <span>{DIM_NAMES[key] || key}</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 text-xs text-slate-500">
                          估值字段当前来自腾讯行情口径；股息率来自官方年报分红推算。
                        </div>
                      </div>
                    </div>
                  </div>

                  {(externalValidation.externalData?.events || []).length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">结构化事件流</div>
                          <div className="text-xs text-slate-500">当前为最小事件模型，已接通年报与分红类事件</div>
                        </div>
                        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {(externalValidation.externalData?.events || []).length} 条事件
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(buildExternalEventRows(externalValidation)[0] || {}).map((key) => (
                                <th key={key} className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {buildExternalEventRows(externalValidation).map((row, index) => (
                              <tr key={`${row.日期}-${row.事件}-${index}`} className="hover:bg-gray-50">
                                {Object.values(row).map((val, i) => (
                                  <td key={i} className="py-2 px-4 text-sm text-gray-900">{val}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {(externalValidation.externalData?.fetch_meta?.sources || []).length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-900 mb-2">数据来源</div>
                      <div className="space-y-1 text-sm text-gray-700">
                        {externalValidation.externalData.fetch_meta.sources.map((source) => (
                          <div key={`${source.type}-${source.url}`} className="break-all">
                            <span className="font-medium">{source.type}</span>：<a className="text-blue-600 hover:text-blue-800" href={source.url} target="_blank" rel="noreferrer">{source.url}</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  暂无外部分析归档。点击右上角“手动刷新”后，会抓取外部数据、完成自动分析并写入当前详情页。
                </div>
              )}
            </div>

            {/* 12. 人工确认 */}
            {decisionState && (
              <div className="p-6 border-b border-gray-200">
                <DecisionReviewPanel
                  decisionState={decisionState}
                  signalStatus={company.v22_signal_status}
                  submitting={decisionSubmitting}
                  onSubmit={handleDecisionSubmit}
                />
              </div>
            )}

            {/* 13. 版本历史 */}
            {(decisionState || archiveHistory.length > 0) && (
              <div className="p-6 border-b border-gray-200">
                <VersionHistory
                  currentRecord={currentRecord}
                  decisionState={decisionState}
                  history={archiveHistory}
                  changes={archiveChanges}
                  loading={archiveLoading}
                />
              </div>
            )}

            {/* 14. 标签 */}
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

            {/* 15. 底部状态栏 */}
            <div className="p-6">
              <div className="text-sm text-gray-500 space-y-1">
                <div>最后更新：{company.lastUpdate || '未更新'}</div>
                {hasV22 && (
                  <div className="flex gap-4">
                    <span>信号状态：
                      {company.v22_signal_status === 'stale' ? (
                        <span className="text-red-600">{company.v22_signal_status}（{company.v22_stale_reason}）</span>
                      ) : company.v22_signal_status === 'needs_review' ? (
                        <span className="text-yellow-600">{company.v22_signal_status}</span>
                      ) : (
                        <span className="text-green-600">{company.v22_signal_status}</span>
                      )}
                    </span>
                    <span>复核优先级：<span className={company.v22_review_priority === 'high' ? 'text-red-600' : company.v22_review_priority === 'medium' ? 'text-yellow-600' : 'text-green-600'}>{company.v22_review_priority}</span></span>
                    {company.decision_review_deadline && <span>复核截止：{company.decision_review_deadline}</span>}
                  </div>
                )}
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
