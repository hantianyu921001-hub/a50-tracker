function toNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value)
}

function hasMarketQuote(data = {}) {
  const market = data.market_data || {}
  return ['price', 'open', 'high', 'low', 'prev_close', 'volume', 'amount', 'turnover', 'pe', 'pb']
    .some((key) => market[key] != null)
}

function buildBankNotApplicableFields(data = {}) {
  const company = data.company || {}
  const isBank = company.industry === '银行' || !!company.bank_type
  if (!isBank) return []
  return ['gross_margin', 'net_margin']
}

function validatePercentageRanges(data = {}) {
  const financial = data.financial_data || {}
  const issues = []
  const pctFields = [
    ['roe', 0, 1],
    ['gross_margin', 0, 1],
    ['net_margin', 0, 1],
    ['debt_ratio', 0, 1.2],
    ['net_interest_margin', 0, 1],
    ['npl_ratio', 0, 1],
    ['core_tier1_ratio', 0, 1],
    ['capital_adequacy_ratio', 0, 1],
    ['revenue_yoy', -2, 5],
    ['net_profit_yoy', -2, 5],
    ['total_assets_yoy', -2, 5],
    ['customer_loans_yoy', -2, 5],
    ['customer_deposits_yoy', -2, 5],
  ]

  for (const [field, min, max] of pctFields) {
    const value = toNumber(financial[field])
    if (value == null) continue
    if (value < min || value > max) {
      issues.push({
        type: 'percentage_range',
        severity: 'blocking',
        field,
        message: `${field} 超出预期范围，疑似单位或百分比口径错误`,
      })
    }
  }

  const provisionCoverage = toNumber(financial.provision_coverage)
  if (provisionCoverage != null && (provisionCoverage < 1 || provisionCoverage > 10)) {
    issues.push({
      type: 'percentage_range',
      severity: 'blocking',
      field: 'provision_coverage',
      message: 'provision_coverage 超出银行常见范围，疑似百分比换算错误',
    })
  }

  return issues
}

function validateUnitConsistency(data = {}) {
  const financial = data.financial_data || {}
  const market = data.market_data || {}
  const issues = []

  const revenue = toNumber(financial.revenue)
  const assets = toNumber(financial.total_assets)
  if (revenue != null && assets != null) {
    const ratio = revenue / assets
    if (ratio > 0 && ratio < 0.000001) {
      issues.push({
        type: 'unit_consistency',
        severity: 'blocking',
        field: 'revenue',
        message: '营收相对总资产占比异常偏小，疑似单位未换算到元',
      })
    }
  }

  const marketCap = toNumber(market.market_cap)
  const price = toNumber(market.price)
  if (marketCap != null && price != null && marketCap > 0 && price > 0) {
    const impliedShares = marketCap / price
    if (impliedShares < 1_000_000) {
      issues.push({
        type: 'unit_consistency',
        severity: 'warning',
        field: 'market_cap',
        message: '总市值与股价推导出的股本异常偏小，需留意市值单位口径',
      })
    }
  }

  return issues
}

function validateSourceStatus(data = {}) {
  const rawErrors = data.fetch_meta?.errors || []
  const issues = []
  const marketReady = hasMarketQuote(data)
  const company = data.company || {}
  const profileReady = !!(company.name && (company.industry || company.listing_date || company.main_business || company.company_profile))

  for (const error of rawErrors) {
    if (/行情/.test(error) && marketReady) {
      issues.push({
        type: 'source_status',
        severity: 'warning',
        field: 'market_data',
        message: `主行情源存在失败记录，但 fallback 已补齐：${error}`,
      })
      continue
    }

    if (/基本信息/.test(error) && profileReady) {
      issues.push({
        type: 'source_status',
        severity: 'warning',
        field: 'company',
        message: `主资料源存在失败记录，但 fallback 已补齐：${error}`,
      })
      continue
    }

    issues.push({
      type: 'source_status',
      severity: 'blocking',
      field: 'source',
      message: error,
    })
  }

  return issues
}

export function validateExternalData(data = {}) {
  const company = data.company || {}
  const issues = [
    ...validatePercentageRanges(data),
    ...validateUnitConsistency(data),
    ...validateSourceStatus(data),
  ]

  const notApplicableFields = buildBankNotApplicableFields(data)
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  const blockingIssues = issues.filter((issue) => issue.severity === 'blocking')

  return {
    analysis_type: company.industry === '银行' || company.bank_type ? 'bank' : 'generic',
    is_valid: blockingIssues.length === 0,
    warnings,
    blockingIssues,
    notApplicableFields,
    summary: {
      warningCount: warnings.length,
      blockingCount: blockingIssues.length,
    },
  }
}

export default {
  validateExternalData,
}
