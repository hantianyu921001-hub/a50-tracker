function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function round2(value) {
  return Math.round(value * 100) / 100
}

function pct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${(Number(value) * 100).toFixed(2)}%`
}

function numberOrNull(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value)
}

function item(name, score, max, rationale) {
  return { name, score, max, rationale }
}

function isBankData(data) {
  const company = data.company || {}
  return company.industry === '银行' || !!company.bank_type
}

function getDataGaps(data, options = {}) {
  const financial = data.financial_data || {}
  const market = data.market_data || {}
  const events = data.events || []
  const gaps = []

  if (financial.revenue == null || financial.revenue_yoy == null) gaps.push('营收与收入同比')
  if (financial.eps == null) gaps.push('EPS')
  if (financial.bvps == null) gaps.push('BVPS')
  if (market.turnover == null) gaps.push('换手率')
  if (market.pe_percentile == null || market.pb_percentile == null) gaps.push('历史估值分位')
  if (options.requiresPeerComparison && !options.hasPeerComparison) gaps.push('同业估值对比')
  if (!options.hasStructuredEvents && events.length === 0) gaps.push('结构化事件流')

  return Array.from(new Set(gaps))
}

function getGrade(total) {
  if (total >= 90) return 'S'
  if (total >= 82) return 'A+'
  if (total >= 74) return 'A'
  if (total >= 66) return 'B+'
  if (total >= 58) return 'B'
  if (total >= 48) return 'C'
  return 'D'
}

function scoreBankMoat(data) {
  const company = data.company || {}
  const financial = data.financial_data || {}
  const industryScore = company.industry === '银行' ? 5 : 3
  const assetsScore = (financial.total_assets || 0) >= 45_000_000_000_000 ? 5 : (financial.total_assets || 0) >= 30_000_000_000_000 ? 4 : 2
  const depositScore = (financial.customer_deposits || 0) >= 30_000_000_000_000 ? 5 : (financial.customer_deposits || 0) >= 20_000_000_000_000 ? 4 : 2
  const franchiseScore = company.bank_type === '国有大行' ? 4 : 3
  const balanceSheetScore = (financial.core_tier1_ratio || 0) >= 0.105 ? 4 : (financial.core_tier1_ratio || 0) >= 0.095 ? 3 : 2
  const details = [
    item('牌照与行业地位', industryScore, 5, company.industry === '银行' ? '银行牌照稀缺，属于高度监管且进入门槛极高的行业。' : '行业地位未完全确认，按保守口径计分。'),
    item('规模基础', assetsScore, 5, `总资产 ${financial.total_assets ? `${round2(financial.total_assets / 1e12)}万亿` : '待补充'}，大行规模优势明显。`),
    item('存款基础', depositScore, 5, `客户存款 ${financial.customer_deposits ? `${round2(financial.customer_deposits / 1e12)}万亿` : '待补充'}，负债端稳定性较强。`),
    item('客户与渠道壁垒', franchiseScore, 5, company.bank_type === '国有大行' ? '国有大行在县域网点、客户覆盖和政策资源上具备天然优势。' : '非国有大行，按一般银行壁垒计分。'),
    item('资本与信用背书', balanceSheetScore, 5, `核心一级资本充足率 ${pct(financial.core_tier1_ratio)}，资本安全垫支持长期经营韧性。`),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreBankGrowth(data) {
  const financial = data.financial_data || {}
  const profitYoy = Number(financial.net_profit_yoy || 0)
  const assetYoy = Number(financial.total_assets_yoy || 0)
  const loanYoy = Number(financial.customer_loans_yoy || 0)
  const depositYoy = Number(financial.customer_deposits_yoy || 0)
  const revenueYoy = financial.revenue_yoy == null ? null : Number(financial.revenue_yoy || 0)
  let historyScore = 1
  if (revenueYoy != null) {
    if (revenueYoy >= 0.05 && profitYoy >= 0.05) historyScore = 7
    else if (revenueYoy >= 0 && profitYoy >= 0) historyScore = 5
    else if (profitYoy > 0) historyScore = 4
  } else if (profitYoy > 0.03) historyScore = 4
  else if (profitYoy > 0) historyScore = 3

  let trendScore = 2
  if (assetYoy >= 0.1 && loanYoy >= 0.08 && depositYoy >= 0.07) trendScore = 5
  else if (assetYoy >= 0.06 && loanYoy >= 0.05 && depositYoy >= 0.05) trendScore = 4
  else if (assetYoy > 0 || loanYoy > 0 || depositYoy > 0) trendScore = 3

  const spaceScore = data.company?.bank_type === '国有大行' ? 2 : 3
  const industryScore = 1
  const details = [
    item('历史增速', historyScore, 8, revenueYoy == null ? `收入同比缺失，当前主要依据净利润同比 ${pct(profitYoy)} 做保守评分。` : `收入同比 ${pct(revenueYoy)}，净利润同比 ${pct(profitYoy)}。`),
    item('增长趋势', trendScore, 6, `总资产同比 ${pct(assetYoy)}、贷款同比 ${pct(loanYoy)}、存款同比 ${pct(depositYoy)}。`),
    item('成长空间', spaceScore, 4, data.company?.bank_type === '国有大行' ? '国有大行成长性更多来自稳健扩表与红利属性，弹性不如高成长行业。' : '成长空间存在，但仍属于成熟金融行业。'),
    item('行业景气', industryScore, 2, '银行板块整体景气度偏平稳，目前主要看息差与资产质量边际变化。'),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreBankProfit(data) {
  const financial = data.financial_data || {}
  const roe = Number(financial.roe || 0)
  const nplRatio = Number(financial.npl_ratio || 0)
  const provisionCoverage = Number(financial.provision_coverage || 0)
  const nim = Number(financial.net_interest_margin || 0)
  const profitYoy = Number(financial.net_profit_yoy || 0)
  const roeScore = roe >= 0.13 ? 5 : roe >= 0.11 ? 4 : roe >= 0.10 ? 4 : roe >= 0.08 ? 3 : 2
  const assetQualityScore = nplRatio > 0 && nplRatio <= 0.012 ? 5 : nplRatio <= 0.015 ? 4 : nplRatio <= 0.02 ? 3 : 2
  const bufferScore = provisionCoverage >= 3.0 ? 5 : provisionCoverage >= 2.5 ? 4 : provisionCoverage >= 2.0 ? 3 : 2
  let stabilityScore = 3
  if (nim >= 0.015 && profitYoy >= 0.03) stabilityScore = 5
  else if (nim >= 0.013 && profitYoy >= 0) stabilityScore = 4
  else if (nim >= 0.012 && profitYoy >= 0) stabilityScore = 3
  else if (nim > 0) stabilityScore = 2
  const details = [
    item('ROE水平', roeScore, 5, `ROE 为 ${pct(roe)}，决定银行股长期回报中枢。`),
    item('资产质量', assetQualityScore, 5, `不良率 ${pct(nplRatio)}，反映资产端稳定性。`),
    item('风险缓冲', bufferScore, 5, `拨备覆盖率 ${pct(provisionCoverage)}，资本与拨备安全垫较厚。`),
    item('盈利稳定性', stabilityScore, 5, `净息差 ${pct(nim)}，净利润同比 ${pct(profitYoy)}。`),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreBankValuation(data) {
  const market = data.market_data || {}
  const financial = data.financial_data || {}
  const pb = Number(market.pb || 0)
  const pe = Number(market.pe || 0)
  const dividendYield = Number(market.dividend_yield || 0)
  const marketCap = Number(market.market_cap || 0)
  const pePercentile = Number.isFinite(Number(market.pe_percentile)) ? Number(market.pe_percentile) : null
  const pbPercentile = Number.isFinite(Number(market.pb_percentile)) ? Number(market.pb_percentile) : null
  const pbScore = pb > 0 && pb <= 0.75 ? 5 : pb <= 0.9 ? 4 : pb <= 1.0 ? 3 : pb <= 1.2 ? 2 : 1
  const peScore = pe > 0 && pe <= 6 ? 5 : pe <= 8 ? 4 : pe <= 10 ? 3 : pe <= 12 ? 2 : 1
  const dyScore = dividendYield >= 0.045 ? 5 : dividendYield >= 0.035 ? 4 : dividendYield >= 0.03 ? 3 : dividendYield > 0 ? 2 : 1
  const liquidityScore = marketCap >= 1_000_000_000_000 ? 4 : marketCap > 0 ? 3 : 1
  const completenessScore = financial.bvps != null && pePercentile != null && pbPercentile != null ? ((pePercentile <= 0.3 || pbPercentile <= 0.3) ? 5 : 4) : 2
  const details = [
    item('PB水平', pbScore, 5, `PB 为 ${pb ? pb.toFixed(2) : '—'}，当前仍属于银行股可接受区间。`),
    item('PE水平', peScore, 5, `PE 为 ${pe ? pe.toFixed(2) : '—'}，当前口径来自腾讯行情候选字段。`),
    item('股息率吸引力', dyScore, 5, `股息率约 ${pct(dividendYield)}，按官方年报分红与现价推算。`),
    item('市值与流动性', liquidityScore, 5, `总市值 ${marketCap ? `${round2(marketCap / 1e12)}万亿` : '—'}，流动性足以支撑底仓配置。`),
    item('历史估值位置', completenessScore, 5, pePercentile != null && pbPercentile != null ? `近十年 PE 分位 ${pct(pePercentile)}、PB 分位 ${pct(pbPercentile)}，可用于判断当前估值所处历史位置。` : '历史估值分位或 BVPS 仍未完全接通，因此按保守口径评分。'),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreBankCatalyst(data) {
  const financial = data.financial_data || {}
  const market = data.market_data || {}
  const hasOfficialReport = (data.fetch_meta?.sources || []).some((source) => source.type === 'official_annual_report')
  const reportScore = hasOfficialReport && financial.report_date ? 4 : 2
  const dividendScore = financial.cash_dividend_total != null ? 3 : 1
  const styleScore = market.dividend_yield >= 0.03 ? 2 : 1
  const details = [
    item('最新财报催化', reportScore, 4, hasOfficialReport ? `已接通 ${financial.report_date || '最新'} 年官方年报，基础面验证已刷新。` : '尚未接通最新官方年报。'),
    item('分红催化', dividendScore, 3, financial.cash_dividend_total != null ? `现金分红总额 ${round2(financial.cash_dividend_total / 1e8)} 亿，红利逻辑成立。` : '分红方案未完成结构化。'),
    item('风格与估值修复', styleScore, 3, market.dividend_yield >= 0.03 ? '高股息银行在红利风格延续时具备一定估值支撑。' : '当前更偏基础持有逻辑，缺少明确风格催化。'),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreBankRisk(data) {
  const financial = data.financial_data || {}
  const blockingErrors = data.validation?.blockingIssues || []
  const warningErrors = data.validation?.warnings || []
  const details = []
  let industryRisk = 0
  if ((financial.net_interest_margin || 0) < 0.013) industryRisk = -2
  else if ((financial.net_interest_margin || 0) < 0.015) industryRisk = -1
  details.push(item('息差压力', industryRisk, 5, `净息差 ${pct(financial.net_interest_margin)}，银行盈利弹性仍受息差收窄影响。`))
  let dataRisk = 0
  const missingFields = []
  if (blockingErrors.length > 0) dataRisk -= 1
  else if (warningErrors.length > 0) dataRisk -= 0.5
  if (financial.revenue == null) missingFields.push('营收')
  if (financial.eps == null) missingFields.push('EPS')
  if (financial.bvps == null) missingFields.push('BVPS')
  if (missingFields.length > 0) dataRisk -= 1
  const dataRiskParts = []
  if (blockingErrors.length > 0) dataRiskParts.push(`阻断性问题：${blockingErrors.map((issue) => issue.message).join('、')}`)
  if (warningErrors.length > 0) dataRiskParts.push(`告警：${warningErrors.map((issue) => issue.message).join('、')}`)
  if (missingFields.length > 0) dataRiskParts.push(`缺少字段：${missingFields.join('、')}`)
  details.push(item('数据完整性', dataRisk, 5, dataRiskParts.length > 0 ? dataRiskParts.join('；') : '核心行情、估值与银行关键财务字段已接通。'))
  let macroRisk = -1
  if ((financial.npl_ratio || 0) > 0.015) macroRisk = -2
  details.push(item('宏观与资产质量', macroRisk, 5, `不良率 ${pct(financial.npl_ratio)}，当前整体可控，但银行仍受宏观信用周期影响。`))
  return { score: clamp(details.reduce((sum, detail) => sum + detail.score, 0), -15, 0), details }
}

function scoreGenericMoat(data) {
  const company = data.company || {}
  const market = data.market_data || {}
  const marketCap = Number(market.market_cap || 0)
  const industryScore = company.industry ? 4 : 2
  const scaleScore = marketCap >= 100_000_000_000 ? 4 : marketCap >= 30_000_000_000 ? 3 : marketCap > 0 ? 2 : 1
  const listingScore = company.listing_date ? 3 : 2
  const conceptScore = company.concept ? 3 : 2
  const franchiseScore = company.name ? 3 : 2
  const details = [
    item('行业地位与属性', industryScore, 5, company.industry ? `已识别所属行业为 ${company.industry}。` : '行业字段未完整识别，按保守口径计分。'),
    item('规模基础', scaleScore, 5, `总市值 ${marketCap ? `${round2(marketCap / 1e8)}亿` : '待补充'}，用于衡量规模与资源配置能力。`),
    item('上市与经营资历', listingScore, 5, company.listing_date ? `上市日期 ${company.listing_date}，具备较长二级市场经营样本。` : '上市日期未获取，经营资历按保守口径计分。'),
    item('业务标签清晰度', conceptScore, 5, company.concept ? `概念标签：${company.concept}` : '业务标签暂未补齐。'),
    item('品牌与客户认知', franchiseScore, 5, company.name ? `${company.name} 已建立基础品牌识别，但仍缺少竞争格局原始证据。` : '品牌与客户认知仍待补充。'),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreGenericGrowth(data) {
  const financial = data.financial_data || {}
  const revenueYoy = financial.revenue_yoy == null ? null : Number(financial.revenue_yoy || 0)
  const profitYoy = financial.net_profit_yoy == null ? null : Number(financial.net_profit_yoy || 0)
  let historyScore = 2
  if (revenueYoy != null && profitYoy != null) {
    if (revenueYoy >= 0.15 && profitYoy >= 0.15) historyScore = 8
    else if (revenueYoy >= 0.08 && profitYoy >= 0.08) historyScore = 6
    else if (revenueYoy >= 0 && profitYoy >= 0) historyScore = 4
    else historyScore = 2
  }
  const profitabilityTrendScore = profitYoy == null ? 2 : profitYoy >= 0.2 ? 5 : profitYoy >= 0.08 ? 4 : profitYoy >= 0 ? 3 : 1
  const spaceScore = data.company?.concept ? 3 : 2
  const demandScore = (data.events || []).length > 0 ? 2 : 1
  const details = [
    item('收入与利润增速', historyScore, 8, revenueYoy != null && profitYoy != null ? `营收同比 ${pct(revenueYoy)}，净利润同比 ${pct(profitYoy)}。` : '营收或利润同比字段不完整，按保守口径评分。'),
    item('利润趋势', profitabilityTrendScore, 5, profitYoy != null ? `净利润同比 ${pct(profitYoy)}，反映近期业绩弹性。` : '净利润同比暂缺，利润趋势无法完整判断。'),
    item('成长空间', spaceScore, 4, data.company?.concept ? `已识别业务概念：${data.company.concept}。` : '缺少行业景气与产品结构信息，成长空间按保守口径计分。'),
    item('催化基础', demandScore, 3, (data.events || []).length > 0 ? `当前已生成 ${(data.events || []).length} 条结构化事件。` : '尚未形成清晰催化链条。'),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreGenericProfit(data) {
  const financial = data.financial_data || {}
  const notApplicable = new Set(data.validation?.notApplicableFields || [])
  const roe = numberOrNull(financial.roe)
  const grossMargin = numberOrNull(financial.gross_margin)
  const netMargin = numberOrNull(financial.net_margin)
  const debtRatio = numberOrNull(financial.debt_ratio)
  const roeScore = roe == null ? 2 : roe >= 0.15 ? 5 : roe >= 0.10 ? 4 : roe >= 0.06 ? 3 : roe > 0 ? 2 : 1
  const grossScore = grossMargin == null ? 2 : grossMargin >= 0.35 ? 5 : grossMargin >= 0.25 ? 4 : grossMargin >= 0.15 ? 3 : grossMargin > 0 ? 2 : 1
  const netScore = netMargin == null ? 2 : netMargin >= 0.15 ? 5 : netMargin >= 0.08 ? 4 : netMargin >= 0.03 ? 3 : netMargin > 0 ? 2 : 1
  const balanceScore = debtRatio == null ? 2 : debtRatio > 0 && debtRatio <= 0.4 ? 5 : debtRatio <= 0.6 ? 4 : debtRatio <= 0.75 ? 3 : debtRatio > 0 ? 2 : 2
  const details = [
    item('ROE水平', roeScore, 5, roe == null ? 'ROE 字段未接通，按保守口径评分。' : `ROE 为 ${pct(roe)}，衡量股东回报能力。`),
    item('毛利率', grossScore, 5, notApplicable.has('gross_margin') ? '该行业不以毛利率作为核心分析口径，按通用占位解释处理。' : grossMargin == null ? '毛利率字段未接通或行业适用性有限。' : `毛利率 ${pct(grossMargin)}，反映产品与业务附加值。`),
    item('净利率', netScore, 5, notApplicable.has('net_margin') ? '该行业不以净利率作为核心分析口径，按通用占位解释处理。' : netMargin == null ? '净利率字段未接通或行业适用性有限。' : `净利率 ${pct(netMargin)}，反映利润兑现质量。`),
    item('资产负债结构', balanceScore, 5, debtRatio == null ? '资产负债率字段未接通或行业适用性有限。' : `资产负债率 ${pct(debtRatio)}，用于判断杠杆与财务风险。`),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreGenericValuation(data) {
  const market = data.market_data || {}
  const financial = data.financial_data || {}
  const pe = Number(market.pe || 0)
  const pb = Number(market.pb || 0)
  const dividendYield = Number(market.dividend_yield || 0)
  const marketCap = Number(market.market_cap || 0)
  const pePercentile = Number.isFinite(Number(market.pe_percentile)) ? Number(market.pe_percentile) : null
  const pbPercentile = Number.isFinite(Number(market.pb_percentile)) ? Number(market.pb_percentile) : null
  const peScore = pe > 0 && pe <= 20 ? 5 : pe <= 35 ? 4 : pe <= 60 ? 3 : pe <= 100 ? 2 : 1
  const pbScore = pb > 0 && pb <= 2 ? 5 : pb <= 4 ? 4 : pb <= 8 ? 3 : pb <= 12 ? 2 : 1
  const dividendScore = dividendYield >= 0.03 ? 4 : dividendYield > 0 ? 2 : 1
  const liquidityScore = marketCap >= 50_000_000_000 ? 4 : marketCap > 0 ? 3 : 1
  const percentileScore = pePercentile != null && pbPercentile != null
    ? ((pePercentile <= 0.3 || pbPercentile <= 0.3) ? 5 : (pePercentile <= 0.6 || pbPercentile <= 0.6) ? 4 : 2)
    : 2
  const details = [
    item('PE水平', peScore, 5, `PE 为 ${pe ? pe.toFixed(2) : '—'}，反映当前盈利估值水平。`),
    item('PB水平', pbScore, 5, `PB 为 ${pb ? pb.toFixed(2) : '—'}，反映当前净资产估值水平。`),
    item('股息率与回报', dividendScore, 5, financial.cash_dividend_total != null ? `股息率约 ${pct(dividendYield)}，已结合分红推算。` : '分红字段不完整，股东回报信息仍偏弱。'),
    item('市值与流动性', liquidityScore, 5, `总市值 ${marketCap ? `${round2(marketCap / 1e8)}亿` : '—'}，流动性对交易执行较友好。`),
    item('历史估值位置', percentileScore, 5, pePercentile != null && pbPercentile != null ? `PE 分位 ${pct(pePercentile)}、PB 分位 ${pct(pbPercentile)}。` : '历史估值分位仍未接齐，按保守口径评分。'),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreGenericCatalyst(data) {
  const financial = data.financial_data || {}
  const events = data.events || []
  const hasAnnual = financial.report_date || financial.revenue != null
  const reportScore = hasAnnual ? 4 : 2
  const eventScore = events.length >= 2 ? 3 : events.length === 1 ? 2 : 1
  const marketScore = data.market_data?.turnover != null ? 2 : 1
  const details = [
    item('最新财务更新', reportScore, 4, hasAnnual ? `已抓到 ${financial.report_date || '最新'} 财务快照。` : '最新财务快照仍不完整。'),
    item('结构化事件', eventScore, 3, events.length > 0 ? `当前已生成 ${events.length} 条结构化事件。` : '事件流尚未成形。'),
    item('市场关注度', marketScore, 3, data.market_data?.turnover != null ? `换手率 ${pct(data.market_data.turnover)}，可辅助判断关注度。` : '换手率未接通，关注度难以判断。'),
  ]
  return { score: details.reduce((sum, detail) => sum + detail.score, 0), details }
}

function scoreGenericRisk(data) {
  const financial = data.financial_data || {}
  const market = data.market_data || {}
  const blockingErrors = data.validation?.blockingIssues || []
  const warningErrors = data.validation?.warnings || []
  const details = []
  const debtRatio = numberOrNull(financial.debt_ratio)
  let leverageRisk = 0
  if ((debtRatio || 0) > 0.75) leverageRisk = -2
  else if ((debtRatio || 0) > 0.6) leverageRisk = -1
  details.push(item('财务杠杆', leverageRisk, 5, debtRatio == null ? '资产负债率字段未接通或行业适用性有限。' : `资产负债率 ${pct(debtRatio)}，用于衡量资产负债结构风险。`))
  let dataRisk = 0
  if (blockingErrors.length > 0) dataRisk -= 1
  else if (warningErrors.length > 0) dataRisk -= 0.5
  if (financial.revenue == null || financial.eps == null || financial.bvps == null) dataRisk -= 1
  details.push(item('数据完整性', dataRisk, 5, blockingErrors.length > 0 ? `当前存在阻断性数据问题：${blockingErrors.map((issue) => issue.message).join('、')}` : warningErrors.length > 0 ? `当前存在数据告警：${warningErrors.map((issue) => issue.message).join('、')}` : '核心行情与通用财务字段已基本接通。'))
  let valuationRisk = -1
  if ((market.pe_percentile || 0) >= 0.8 || (market.pb_percentile || 0) >= 0.8) valuationRisk = -2
  details.push(item('估值波动', valuationRisk, 5, `PE 分位 ${pct(market.pe_percentile)}、PB 分位 ${pct(market.pb_percentile)}，高位估值需要留意回撤。`))
  return { score: clamp(details.reduce((sum, detail) => sum + detail.score, 0), -15, 0), details }
}

function prefixDetails(details, prefix) {
  return (details || []).map((detail) => ({
    ...detail,
    name: `${prefix}${detail.name}`,
  }))
}

function buildGenericCoreSegments(data) {
  return {
    moat: scoreGenericMoat(data),
    growth: scoreGenericGrowth(data),
    profit: scoreGenericProfit(data),
    valuation: scoreGenericValuation(data),
    catalyst: scoreGenericCatalyst(data),
    risk: scoreGenericRisk(data),
  }
}

function buildBankEnhancementSegments(data) {
  return {
    moat: scoreBankMoat(data),
    growth: scoreBankGrowth(data),
    profit: scoreBankProfit(data),
    valuation: scoreBankValuation(data),
    catalyst: scoreBankCatalyst(data),
    risk: scoreBankRisk(data),
  }
}

function blendPositiveDimension(core, enhancement, max) {
  return clamp(Math.round((core * 0.4 + enhancement * 0.6) * 100) / 100, 0, max)
}

function blendRiskDimension(core, enhancement) {
  return clamp(Math.round((core * 0.35 + enhancement * 0.65) * 100) / 100, -15, 0)
}

function buildScorePayload(segments, dataGaps) {
  const total = segments.moat.score + segments.growth.score + segments.profit.score + segments.valuation.score + segments.catalyst.score + segments.risk.score
  return {
    total,
    grade: getGrade(total),
    dimensions: {
      moat: segments.moat.score,
      growth: segments.growth.score,
      profit: segments.profit.score,
      valuation: segments.valuation.score,
      catalyst: segments.catalyst.score,
      risk: segments.risk.score,
    },
    details: {
      moat: segments.moat.details,
      growth: segments.growth.details,
      profit: segments.profit.details,
      valuation: segments.valuation.details,
      catalyst: segments.catalyst.details,
      risk: segments.risk.details,
    },
    data_gaps: dataGaps,
  }
}

export function scoreBankData(data, options = {}) {
  const coreSegments = buildGenericCoreSegments(data)
  const bankSegments = buildBankEnhancementSegments(data)
  const segments = {
    moat: {
      score: blendPositiveDimension(coreSegments.moat.score, bankSegments.moat.score, 25),
      details: [...prefixDetails(coreSegments.moat.details, '通用：'), ...prefixDetails(bankSegments.moat.details, '银行增强：')],
    },
    growth: {
      score: blendPositiveDimension(coreSegments.growth.score, bankSegments.growth.score, 20),
      details: [...prefixDetails(coreSegments.growth.details, '通用：'), ...prefixDetails(bankSegments.growth.details, '银行增强：')],
    },
    profit: {
      score: blendPositiveDimension(coreSegments.profit.score, bankSegments.profit.score, 20),
      details: [...prefixDetails(coreSegments.profit.details, '通用：'), ...prefixDetails(bankSegments.profit.details, '银行增强：')],
    },
    valuation: {
      score: blendPositiveDimension(coreSegments.valuation.score, bankSegments.valuation.score, 25),
      details: [...prefixDetails(coreSegments.valuation.details, '通用：'), ...prefixDetails(bankSegments.valuation.details, '银行增强：')],
    },
    catalyst: {
      score: blendPositiveDimension(coreSegments.catalyst.score, bankSegments.catalyst.score, 10),
      details: [...prefixDetails(coreSegments.catalyst.details, '通用：'), ...prefixDetails(bankSegments.catalyst.details, '银行增强：')],
    },
    risk: {
      score: blendRiskDimension(coreSegments.risk.score, bankSegments.risk.score),
      details: [...prefixDetails(coreSegments.risk.details, '通用：'), ...prefixDetails(bankSegments.risk.details, '银行增强：')],
    },
  }
  const dataGaps = getDataGaps(data, {
    hasStructuredEvents: (data.events || []).length > 0,
    hasPeerComparison: options.hasPeerComparison,
    requiresPeerComparison: true,
  })
  return buildScorePayload(segments, dataGaps)
}

export function scoreGenericData(data, options = {}) {
  const segments = buildGenericCoreSegments(data)
  const dataGaps = getDataGaps(data, {
    hasStructuredEvents: (data.events || []).length > 0,
    hasPeerComparison: options.hasPeerComparison,
    requiresPeerComparison: false,
  })
  return buildScorePayload(segments, dataGaps)
}

export function scoreExternalData(data, options = {}) {
  if (isBankData(data)) {
    return scoreBankData(data, options)
  }
  return scoreGenericData(data, options)
}

export function refineScoreWithContext(score, options = {}) {
  if (!score) return score
  const nextGaps = (score.data_gaps || []).filter((gap) => {
    if (gap === '同业估值对比' && options.hasPeerComparison) return false
    return true
  })
  return {
    ...score,
    data_gaps: nextGaps,
  }
}

export default {
  scoreBankData,
  scoreGenericData,
  scoreExternalData,
  refineScoreWithContext,
}
