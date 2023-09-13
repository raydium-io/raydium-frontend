import { TokenAmount } from '@raydium-io/raydium-sdk'

import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTokenPrice from '@/functions/format/toTokenPrice'
import toUsdCurrency from '@/functions/format/toUsdCurrency'

import { LpToken } from '../token/type'

import computeUserLedgerInfo from './infoCalculater'
import { HydratedPairItemInfo, JsonPairItemInfo } from './type'
import { mergeObjects } from '@/functions/mergeObjects'
import { createCachedFunction } from '../../functions/createCachedFunction'

export function hydratedPairInfo(
  pair: JsonPairItemInfo,
  payload: {
    lpToken?: LpToken
    lpBalance?: TokenAmount
    isStable?: boolean
    isOpenBook?: boolean
  }
): HydratedPairItemInfo {
  const lp = payload.lpToken
  const base = lp?.base
  const quote = lp?.quote

  const tokenAmountBase = base ? toTokenAmount(base, pair.tokenAmountCoin, { alreadyDecimaled: true }) ?? null : null
  const tokenAmountQuote = quote ? toTokenAmount(quote, pair.tokenAmountPc, { alreadyDecimaled: true }) ?? null : null
  const tokenAmountLp = lp ? toTokenAmount(lp, pair.tokenAmountLp, { alreadyDecimaled: true }) ?? null : null

  const lpBalance = payload.lpBalance
  const calcLpUserLedgerInfoResult = createCachedFunction(() =>
    computeUserLedgerInfo(
      { tokenAmountBase, tokenAmountQuote, tokenAmountLp },
      { lpToken: lp, baseToken: base, quoteToken: quote, lpBalance }
    )
  )

  return mergeObjects(pair, {
    get fee7d() {
      return toUsdCurrency(pair.fee7d)
    },
    get fee7dQuote() {
      return toUsdCurrency(pair.fee7dQuote)
    },
    get fee24h() {
      return toUsdCurrency(pair.fee24h)
    },
    get fee24hQuote() {
      return toUsdCurrency(pair.fee24hQuote)
    },
    get fee30d() {
      return toUsdCurrency(pair.fee30d)
    },
    get fee30dQuote() {
      return toUsdCurrency(pair.fee30dQuote)
    },
    get volume24h() {
      return toUsdCurrency(pair.volume24h)
    },
    get volume24hQuote() {
      return toUsdCurrency(pair.volume24hQuote)
    },
    get volume7d() {
      return toUsdCurrency(pair.volume7d)
    },
    get volume7dQuote() {
      return toUsdCurrency(pair.volume7dQuote)
    },
    get volume30d() {
      return toUsdCurrency(pair.volume30d)
    },
    get volume30dQuote() {
      return toUsdCurrency(pair.volume30dQuote)
    },
    get liquidity() {
      return toUsdCurrency(Math.round(pair.liquidity))
    },
    get lpPrice() {
      return lp && pair.lpPrice ? toTokenPrice(lp, pair.lpPrice) : null
    },
    get basePooled() {
      return calcLpUserLedgerInfoResult()?.basePooled
    },
    get quotePooled() {
      return calcLpUserLedgerInfoResult()?.quotePooled
    },
    get sharePercent() {
      return calcLpUserLedgerInfoResult()?.sharePercent
    },
    get price() {
      return base ? toTokenPrice(base, pair.price) : null
    },
    tokenAmountBase,
    tokenAmountQuote,
    tokenAmountLp,
    lp,
    base,
    quote,
    isStablePool: Boolean(payload.isStable),
    isOpenBook: Boolean(payload.isOpenBook)
  })
}
