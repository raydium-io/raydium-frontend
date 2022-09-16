import { toPercent } from '@/functions/format/toPercent'
import { div } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import useToken from '../token/useToken'
import { recursivelyDecimalToFraction } from '../txTools/decimal2Fraction'
import { HydratedConcentratedInfo, SDKParsedConcentratedInfo } from './type'

export default function hydrateConcentratedInfo(concentratedInfo: SDKParsedConcentratedInfo): HydratedConcentratedInfo {
  return {
    ...concentratedInfo,
    ...hydratePoolInfo(concentratedInfo),
    ...hydrateFeeRate(concentratedInfo),
    ...hydrateUserPositionAccounnt(concentratedInfo)
  }
}

/**
 * part of {@link hydrateConcentratedInfo}
 */
function hydratePoolInfo(
  sdkConcentratedInfo: SDKParsedConcentratedInfo
): Pick<HydratedConcentratedInfo, 'base' | 'quote' | 'id'> {
  const { getToken } = useToken.getState()
  return {
    id: sdkConcentratedInfo.state.id,
    base: getToken(sdkConcentratedInfo.state.mintA.mint),
    quote: getToken(sdkConcentratedInfo.state.mintB.mint)
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
