import { TokenStore } from '@/application/token/useToken'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import toUsdCurrency from '@/functions/format/toUsdCurrency'
import { div } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'

import { recursivelyDecimalToFraction } from '../txTools/decimal2Fraction'

import { HydratedConcentratedInfo, SDKParsedConcentratedInfo } from './type'

export default function hydrateConcentratedInfo(
  concentratedInfo: SDKParsedConcentratedInfo,
  additionalTools: {
    getToken: TokenStore['getToken']
    getLpToken: TokenStore['getLpToken']
  }
): HydratedConcentratedInfo {
  const baseToken = additionalTools.getToken(String(concentratedInfo.state.mintA.mint))
  const quoteToken = additionalTools.getToken(String(concentratedInfo.state.mintB.mint))
  const name = (baseToken ? baseToken.symbol : 'unknown') + '-' + (quoteToken ? quoteToken?.symbol : 'unknown')

  return {
    ...concentratedInfo,
    ...hydrateFeeRate(concentratedInfo),
    ...hydrateUserPositionAccounnt(concentratedInfo),
    baseToken,
    quoteToken,
    name,
    id: toPubString(concentratedInfo.state.id),
    liquidity: toUsdCurrency(Math.round(concentratedInfo.state.liquidity.toNumber())),
    fee24h: toUsdCurrency(concentratedInfo.state.day.fee),
    fee7d: toUsdCurrency(concentratedInfo.state.week.fee),
    fee30d: toUsdCurrency(concentratedInfo.state.month.fee),
    volume24h: toUsdCurrency(concentratedInfo.state.day.volume),
    volume7d: toUsdCurrency(concentratedInfo.state.week.volume),
    volume30d: toUsdCurrency(concentratedInfo.state.month.volume)
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
    tradeFeeRate: toPercent(div(sdkConcentratedInfo.state.ammConfig.tradeFeeRate, 10 ** 8))
  }
}

/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydrateUserPositionAccounnt(
  sdkConcentratedInfo: SDKParsedConcentratedInfo
): Pick<HydratedConcentratedInfo, 'userPositionAccount'> {
  return {
    userPositionAccount: sdkConcentratedInfo.positionAccount?.map((a) => ({
      ...recursivelyDecimalToFraction(a),
      amountA: toBN(a.amountA),
      amountB: toBN(a.amountB)
      // liquidity: Number(a.liquidity),
      // feeGrowthInsideLastX64A: Number(a.feeGrowthInsideLastX64A),
      // feeGrowthInsideLastX64B: Number(a.feeGrowthInsideLastX64B),
      // tokenFeesOwedA: Number(a.tokenFeesOwedA),
      // tokenFeesOwedB: Number(a.tokenFeesOwedB)
    }))
  }
}
