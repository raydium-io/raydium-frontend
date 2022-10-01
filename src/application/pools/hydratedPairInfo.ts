import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTokenPrice from '@/functions/format/toTokenPrice'
import toUsdCurrency from '@/functions/format/toUsdCurrency'
import { TokenAmount } from 'test-r-sdk'

import { LpToken } from '../token/type'

import toPubString from '@/functions/format/toMintString'
import computeUserLedgerInfo from './infoCalculater'
import { HydratedPairItemInfo, JsonPairItemInfo } from './type'

export function hydratedPairInfo(
  pair: JsonPairItemInfo,
  payload: {
    lpToken?: LpToken
    lpBalance?: TokenAmount
    isStable?: boolean
    userCustomTokenSymbol: { [x: string]: { symbol: string; name: string } }
  }
): HydratedPairItemInfo {
  const lp = payload.lpToken
  const base = lp?.base
  const quote = lp?.quote
  let newPairName = ''

  const tokenAmountBase = base ? toTokenAmount(base, pair.tokenAmountCoin, { alreadyDecimaled: true }) ?? null : null
  const tokenAmountQuote = quote ? toTokenAmount(quote, pair.tokenAmountPc, { alreadyDecimaled: true }) ?? null : null
  const tokenAmountLp = lp ? toTokenAmount(lp, pair.tokenAmountLp, { alreadyDecimaled: true }) ?? null : null

  const lpBalance = payload.lpBalance
  const calcLpUserLedgerInfoResult = computeUserLedgerInfo(
    { tokenAmountBase, tokenAmountQuote, tokenAmountLp },
    { lpToken: lp, baseToken: base, quoteToken: quote, lpBalance }
  )

  const nameParts = pair.name.split('-')
  const basePubString = toPubString(base?.mint)
  const quotePubString = toPubString(quote?.mint)

  if (base && payload.userCustomTokenSymbol[basePubString]) {
    base.symbol = payload.userCustomTokenSymbol[basePubString].symbol
    base.name = payload.userCustomTokenSymbol[basePubString].name
      ? payload.userCustomTokenSymbol[basePubString].name
      : base.symbol
    nameParts[0] = base.symbol
  } else if (nameParts[0] === 'unknown') {
    nameParts[0] = base?.symbol?.substring(0, 6) ?? nameParts[0]
  }

  if (quote && payload.userCustomTokenSymbol[quotePubString]) {
    quote.symbol = payload.userCustomTokenSymbol[quotePubString].symbol
    quote.name = payload.userCustomTokenSymbol[quotePubString].name
      ? payload.userCustomTokenSymbol[quotePubString].name
      : quote.symbol
    nameParts[1] = quote.symbol
  } else if (nameParts[1] === 'unknown') {
    nameParts[1] = quote?.symbol?.substring(0, 6) ?? nameParts[0]
  }

  newPairName = nameParts.join('-')

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
      name: newPairName ? newPairName : pair.name
    }
  }
}
