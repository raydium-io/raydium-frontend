import { TokenStore } from '@/application/token/useToken'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { div } from '@/functions/numberish/operations'

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
  const name = (baseToken ? baseToken.name : 'unknown') + '-' + (quoteToken ? quoteToken?.name : 'unknown')

  return {
    ...concentratedInfo,
    baseToken,
    quoteToken,
    name,
    id: toPubString(concentratedInfo.state.id),
    protocolFeeRate: toPercent(div(concentratedInfo.state.ammConfig.protocolFeeRate, 10 ** 8)),
    tradeFeeRate: toPercent(div(concentratedInfo.state.ammConfig.tradeFeeRate, 10 ** 8))
  }
}
