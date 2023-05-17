import { TokenAmount } from '@raydium-io/raydium-sdk'

import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTokenPrice from '@/functions/format/toTokenPrice'
import toUsdCurrency from '@/functions/format/toUsdCurrency'

import { LpToken } from '../token/type'

import computeUserLedgerInfo from './infoCalculater'
import { HydratedPairItemInfo, JsonPairItemInfo } from './type'

export function hydratedPairInfo(
  pair: JsonPairItemInfo,
  payload: {
    lpToken?: LpToken
    lpBalance?: TokenAmount
    isStable?: boolean
    isOpenBook?: boolean
    userCustomTokenSymbol: { [x: string]: { symbol: string; name: string } }
  }
): HydratedPairItemInfo {
  const lp = payload.lpToken
  const base = lp?.base
  const quote = lp?.quote

  const tokenAmountBase = base ? toTokenAmount(base, pair.tokenAmountCoin, { alreadyDecimaled: true }) ?? null : null
  const tokenAmountQuote = quote ? toTokenAmount(quote, pair.tokenAmountPc, { alreadyDecimaled: true }) ?? null : null
  const tokenAmountLp = lp ? toTokenAmount(lp, pair.tokenAmountLp, { alreadyDecimaled: true }) ?? null : null

  const lpBalance = payload.lpBalance
  const calcLpUserLedgerInfoResult = computeUserLedgerInfo(
    { tokenAmountBase, tokenAmountQuote, tokenAmountLp },
    { lpToken: lp, baseToken: base, quoteToken: quote, lpBalance }
  )

  return {
    ...pair,
    ...{
      fee7d: toUsdCurrency(pair.fee7d),
      fee7dQuote: toUsdCurrency(pair.fee7dQuote),
      fee24h: toUsdCurrency(pair.fee24h),
      fee24hQuote: toUsdCurrency(pair.fee24hQuote),
      fee30d: toUsdCurrency(pair.fee30d),
      fee30dQuote: toUsdCurrency(pair.fee30dQuote),
      volume24h: toUsdCurrency(pair.volume24h),
      volume24hQuote: toUsdCurrency(pair.volume24hQuote),
      volume7d: toUsdCurrency(pair.volume7d),
      volume7dQuote: toUsdCurrency(pair.volume7dQuote),
      volume30d: toUsdCurrency(pair.volume30d),
      volume30dQuote: toUsdCurrency(pair.volume30dQuote),
      tokenAmountBase,
      tokenAmountQuote,
      tokenAmountLp,
      liquidity: toUsdCurrency(Math.round(pair.liquidity)),
      lpPrice: lp && pair.lpPrice ? toTokenPrice(lp, pair.lpPrice) : null,
      // customized
      lp,
      base,
      quote,
      basePooled: calcLpUserLedgerInfoResult?.basePooled,
      quotePooled: calcLpUserLedgerInfoResult?.quotePooled,
      sharePercent: calcLpUserLedgerInfoResult?.sharePercent,
      price: base ? toTokenPrice(base, pair.price) : null,
      isStablePool: Boolean(payload.isStable),
      isOpenBook: Boolean(payload.isOpenBook)
    }
  }
}
