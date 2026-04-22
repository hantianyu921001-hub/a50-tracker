import { execFile } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import { validateExternalData } from '../analysis/dataQualityValidator.js'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '../../..')
const FETCH_SCRIPT = join(PROJECT_ROOT, 'scripts/fetch_bank_external_data.py')

function normalizePercent(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value) / 100
}

function deriveDividendYield(officialReport, marketQuote, quote) {
  const per10Shares = officialReport.dividend_per_10_shares
  const price = marketQuote.price ?? quote.price ?? null
  if (per10Shares == null || price == null || Number(price) <= 0) return normalizePercent(quote.dv_ratio)
  return (Number(per10Shares) / 10) / Number(price)
}

function inferIndustryFromTexts(...texts) {
  const content = texts.filter(Boolean).join(' ')
  if (!content) return ''
  if (/银行|金融服务/.test(content)) return '银行'
  if (/卫星|航天|宇航/.test(content)) return '航天装备'
  if (/白酒|酱香|浓香|酒类/.test(content)) return '白酒'
  if (/半导体|芯片|集成电路/.test(content)) return '半导体'
  return ''
}

function inferConceptFromTexts(...texts) {
  const content = texts.filter(Boolean).join(' ')
  if (!content) return ''
  const concepts = []
  const rules = [
    [/卫星/, '卫星应用'],
    [/航天/, '航天装备'],
    [/宇航/, '宇航制造'],
    [/遥感/, '遥感'],
    [/导航/, '卫星导航'],
    [/智慧城市/, '智慧城市'],
    [/云计算/, '云计算'],
    [/金融服务/, '金融服务'],
    [/银行/, '银行'],
  ]
  for (const [pattern, label] of rules) {
    if (pattern.test(content) && !concepts.includes(label)) {
      concepts.push(label)
    }
  }
  return concepts.slice(0, 4).join('、')
}

function normalizeListingDate(value) {
  if (!value) return ''
  const raw = String(value).trim()
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  }
  if (/^\d{4}-\d{2}-\d{2}\s/.test(raw)) {
    return raw.slice(0, 10)
  }
  return raw
}

function normalizeFetchedBankData(raw = {}) {
  const quote = raw.quote || {}
  const marketQuote = raw.market_quote || {}
  const info = raw.info || {}
  const annual = raw.annual || {}
  const financial = raw.financial || {}
  const officialReport = raw.official_report || {}
  const officialCompany = officialReport.company || {}
  const businessProfile = raw.business_profile || {}
  const companySurvey = raw.company_survey || {}
  const isBank = officialCompany.industry === '银行' || info.industry === '银行'
  const inferredIndustry =
    officialCompany.industry ||
    marketQuote.industry ||
    info.industry ||
    companySurvey.industry ||
    inferIndustryFromTexts(
      businessProfile.main_business,
      businessProfile.product_type,
      businessProfile.product_name,
      companySurvey.company_profile,
      companySurvey.business_scope,
    )
  const inferredConcept =
    info.concept ||
    inferConceptFromTexts(
      businessProfile.main_business,
      businessProfile.product_type,
      businessProfile.product_name,
      companySurvey.company_profile,
      companySurvey.business_scope,
    )

  const normalized = {
    company: {
      symbol: raw.code,
      name: officialCompany.name || marketQuote.name || quote.name || '',
      industry: inferredIndustry || '',
      bank_type: isBank ? (officialCompany.bank_type || '') : '',
      concept: inferredConcept || '',
      listing_date: normalizeListingDate(marketQuote.listing_date || info.listing_date || companySurvey.listing_date || ''),
      company_profile: companySurvey.company_profile || '',
      main_business: businessProfile.main_business || '',
      product_type: businessProfile.product_type || '',
      product_name: businessProfile.product_name || '',
      business_scope: businessProfile.business_scope || companySurvey.business_scope || '',
    },
    market_data: {
      price: marketQuote.price ?? quote.price ?? null,
      change: marketQuote.change ?? null,
      change_pct: marketQuote.change_pct ?? quote.change_pct ?? null,
      pe: marketQuote.pe_dynamic ?? quote.pe ?? null,
      pb: marketQuote.pb ?? quote.pb ?? null,
      pe_percentile: marketQuote.valuation_history?.pe?.percentile ?? null,
      pb_percentile: marketQuote.valuation_history?.pb?.percentile ?? null,
      pe_range: marketQuote.valuation_history?.pe ? {
        min: marketQuote.valuation_history.pe.min,
        max: marketQuote.valuation_history.pe.max,
      } : null,
      pb_range: marketQuote.valuation_history?.pb ? {
        min: marketQuote.valuation_history.pb.min,
        max: marketQuote.valuation_history.pb.max,
      } : null,
      dividend_yield: deriveDividendYield(officialReport, marketQuote, quote),
      market_cap: marketQuote.market_cap ?? quote.market_cap ?? null,
      float_market_cap: marketQuote.float_market_cap ?? null,
      volume: marketQuote.volume ?? null,
      amount: marketQuote.amount ?? null,
      turnover: marketQuote.turnover ?? quote.turnover ?? null,
      high: marketQuote.high ?? quote.high ?? null,
      low: marketQuote.low ?? quote.low ?? null,
      open: marketQuote.open ?? null,
      prev_close: marketQuote.prev_close ?? null,
    },
    financial_data: {
      report_date: officialReport.reporting_period || annual.report_date || '',
      revenue: officialReport.revenue_million != null ? officialReport.revenue_million * 1_000_000 : (annual.revenue ?? null),
      revenue_yoy: officialReport.revenue_yoy ?? annual.revenue_yoy ?? null,
      net_profit: officialReport.net_profit_million != null ? officialReport.net_profit_million * 1_000_000 : annual.net_profit ?? null,
      attributable_net_profit: officialReport.attributable_net_profit_million != null ? officialReport.attributable_net_profit_million * 1_000_000 : null,
      cash_dividend_total: officialReport.cash_dividend_total_million != null ? officialReport.cash_dividend_total_million * 1_000_000 : null,
      dividend_per_10_shares: officialReport.dividend_per_10_shares ?? null,
      net_profit_yoy: officialReport.yoy?.net_profit ?? annual.net_profit_yoy ?? null,
      eps: officialReport.eps ?? annual.eps ?? null,
      bvps: officialReport.bvps ?? annual.bvps ?? null,
      roe: normalizePercent(officialReport.roe_percent ?? financial.roe),
      gross_margin: normalizePercent(financial.gross_margin),
      net_margin: normalizePercent(financial.net_margin),
      debt_ratio: normalizePercent(financial.debt_ratio),
      total_assets: officialReport.total_assets_million != null ? officialReport.total_assets_million * 1_000_000 : null,
      total_assets_yoy: officialReport.yoy?.total_assets ?? null,
      customer_loans: officialReport.customer_loans_million != null ? officialReport.customer_loans_million * 1_000_000 : null,
      customer_loans_yoy: officialReport.yoy?.customer_loans ?? null,
      customer_deposits: officialReport.customer_deposits_million != null ? officialReport.customer_deposits_million * 1_000_000 : null,
      customer_deposits_yoy: officialReport.yoy?.customer_deposits ?? null,
      net_interest_margin: normalizePercent(officialReport.net_interest_margin_percent),
      npl_ratio: normalizePercent(officialReport.npl_ratio_percent),
      provision_coverage: normalizePercent(officialReport.provision_coverage_percent),
      core_tier1_ratio: normalizePercent(officialReport.core_tier1_ratio_percent),
      capital_adequacy_ratio: normalizePercent(officialReport.capital_adequacy_ratio_percent),
    },
    events: raw.events || [],
    fetch_meta: {
      fetched_at: raw.timestamp || new Date().toISOString(),
      success: !!raw.success,
      errors: raw.errors || [],
      source: officialReport.pdf_url ? `official_report+${marketQuote.source || 'market_quote'}` : (marketQuote.source || 'market_quote'),
      sources: [
        ...(officialReport.pdf_url ? [{
          type: 'official_annual_report',
          url: officialReport.pdf_url,
          reporting_period: officialReport.reporting_period || '',
        }] : []),
        ...(marketQuote.source ? [{
          type: 'market_quote',
          provider: marketQuote.source,
        }] : []),
      ],
    },
    raw,
  }

  const validation = validateExternalData(normalized)
  return {
    ...normalized,
    validation,
    fetch_meta: {
      ...normalized.fetch_meta,
      errors: validation.blockingIssues.map((issue) => issue.message),
      warnings: validation.warnings.map((issue) => issue.message),
    },
  }
}

export async function fetchBankExternalData(symbol) {
  const { stdout } = await execFileAsync('python3', [FETCH_SCRIPT, symbol, '--include-legacy'], {
    cwd: PROJECT_ROOT,
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 5,
  })
  const raw = JSON.parse(stdout)
  return normalizeFetchedBankData(raw)
}

export default {
  fetchBankExternalData,
  normalizeFetchedBankData,
}
