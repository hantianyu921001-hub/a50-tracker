import { fetchBankExternalData } from './externalData/bankDataFetcher.js'
import { scoreExternalData, refineScoreWithContext } from './scoring/bankScorer.js'

const BANK_PEER_GROUPS = {
  '601288': ['601288', '601398', '601939', '600036'],
  '600036': ['600036', '601398', '601939', '601288'],
  '601398': ['601398', '601939', '601288', '600036'],
  '601939': ['601939', '601398', '601288', '600036'],
}

async function buildBankPeerComparison(symbol, externalData) {
  const peerSymbols = BANK_PEER_GROUPS[symbol] || [symbol]
  const peerResults = await Promise.all(
    peerSymbols.map(async (peerSymbol) => {
      const data = peerSymbol === symbol ? externalData : await fetchBankExternalData(peerSymbol)
      return {
        symbol: peerSymbol,
        name: data.company?.name || peerSymbol,
        bank_type: data.company?.bank_type || '',
        price: data.market_data?.price ?? null,
        pe: data.market_data?.pe ?? null,
        pb: data.market_data?.pb ?? null,
        dividend_yield: data.market_data?.dividend_yield ?? null,
        market_cap: data.market_data?.market_cap ?? null,
        turnover: data.market_data?.turnover ?? null,
      }
    })
  )

  return peerResults
}

export async function runBankAnalysisValidation(symbol) {
  const externalData = await fetchBankExternalData(symbol)
  const isBank = externalData.company?.industry === '银行' || !!externalData.company?.bank_type
  const peerComparison = isBank ? await buildBankPeerComparison(symbol, externalData) : []
  const score = refineScoreWithContext(
    scoreExternalData(externalData, { hasPeerComparison: peerComparison.length > 1 }),
    { hasPeerComparison: peerComparison.length > 1 }
  )

  return {
    symbol,
    analysis_type: isBank ? 'bank' : 'generic',
    fetched_at: externalData.fetch_meta.fetched_at,
    externalData,
    score,
    peerComparison,
  }
}

export default {
  runBankAnalysisValidation,
}
