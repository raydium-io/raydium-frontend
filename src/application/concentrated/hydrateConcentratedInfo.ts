import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toUsdCurrency from '@/functions/format/toUsdCurrency'
import { mergeObject } from '@/functions/merge'
import { div } from '@/functions/numberish/operations'

import useToken from '../token/useToken'
import { recursivelyDecimalToFraction } from '../txTools/decimal2Fraction'

import { HydratedConcentratedInfo, SDKParsedConcentratedInfo } from './type'

export default function hydrateConcentratedInfo(concentratedInfo: SDKParsedConcentratedInfo): HydratedConcentratedInfo {
  return mergeObject(
    concentratedInfo,
    hydratePoolInfo(concentratedInfo),
    hydrateFeeRate(concentratedInfo),
    hydrateUserPositionAccounnt(concentratedInfo),
    hydrateBaseInfo(concentratedInfo)
  ) as HydratedConcentratedInfo
}

/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydrateBaseInfo(
  sdkConcentratedInfo: SDKParsedConcentratedInfo
): Pick<
  HydratedConcentratedInfo,
  'idString' | 'tvl' | 'fee24h' | 'fee7d' | 'fee30d' | 'volume24h' | 'volume7d' | 'volume30d'
> {
  return {
    idString: toPubString(sdkConcentratedInfo.state.id),
    tvl: toUsdCurrency(sdkConcentratedInfo.state.tvl),
    fee24h: toUsdCurrency(sdkConcentratedInfo.state.day.fee),
    fee7d: toUsdCurrency(sdkConcentratedInfo.state.week.fee),
    fee30d: toUsdCurrency(sdkConcentratedInfo.state.month.fee),
    volume24h: toUsdCurrency(sdkConcentratedInfo.state.day.volume),
    volume7d: toUsdCurrency(sdkConcentratedInfo.state.week.volume),
    volume30d: toUsdCurrency(sdkConcentratedInfo.state.month.volume)
  }
}
/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydratePoolInfo(
  sdkConcentratedInfo: SDKParsedConcentratedInfo
): Pick<HydratedConcentratedInfo, 'base' | 'quote' | 'id' | 'name'> {
  const { getToken } = useToken.getState()
  const base = getToken(sdkConcentratedInfo.state.mintA.mint)
  const quote = getToken(sdkConcentratedInfo.state.mintB.mint)
  const name = (base ? base.symbol : 'unknown') + '-' + (quote ? quote?.symbol : 'unknown')

  return {
    id: sdkConcentratedInfo.state.id,
    base,
    quote,
    name
  }
}

/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydratePositionInfo(
  sdkConcentratedInfo: SDKParsedConcentratedInfo
): Pick<HydratedConcentratedInfo, 'base' | 'quote' | 'id' | 'name'> {
  const { getToken } = useToken.getState()
  const base = getToken(sdkConcentratedInfo.state.mintA.mint)
  const quote = getToken(sdkConcentratedInfo.state.mintB.mint)
  const name = (base ? base.symbol : 'unknown') + '-' + (quote ? quote?.symbol : 'unknown')

  return {
    id: sdkConcentratedInfo.state.id,
    base,
    quote,
    name
  }
}

/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydrateFeeRate(
  sdkConcentratedInfo: SDKParsedConcentratedInfo
): Pick<HydratedConcentratedInfo, 'protocolFeeRate' | 'tradeFeeRate'> {
  return {
    protocolFeeRate: toPercent(div(sdkConcentratedInfo.state.ammConfig.protocolFeeRate, 10 ** 8)),
    tradeFeeRate: toPercent(div(sdkConcentratedInfo.state.ammConfig.tradeFeeRate, 10 ** 6))
  }
}

/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydrateUserPositionAccounnt(
  sdkConcentratedInfo: SDKParsedConcentratedInfo
): Pick<HydratedConcentratedInfo, 'userPositionAccount'> {
  const { getToken } = useToken.getState()
  const tokenA = getToken(sdkConcentratedInfo.state.mintA.mint)
  const tokenB = getToken(sdkConcentratedInfo.state.mintB.mint)
  return {
    userPositionAccount: sdkConcentratedInfo.positionAccount?.map((a) => ({
      sdkParsed: a,
      ...recursivelyDecimalToFraction(a),
      amountA: tokenA ? toTokenAmount(tokenA, a.amountA) : undefined,
      amountB: tokenB ? toTokenAmount(tokenB, a.amountB) : undefined,
      nftMint: a.nftMint, // need this or nftMint will be buggy, this is only quick fixed
      liquidity: a.liquidity,
      tokenA,
      tokenB
    }))
  }
}
