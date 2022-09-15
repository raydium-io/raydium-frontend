import { TokenAmount } from '@raydium-io/raydium-sdk'

import BN from 'bn.js'
import { AmmV3PoolInfo } from 'test-r-sdk'

import { TokenStore } from '@/application/token/useToken'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { div } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { HexAddress } from '@/types/constants'

import toBN from '../../functions/numberish/toBN'
import { LpToken, SplToken } from '../token/type'

import { HydratedConcentratedInfo, SDKParsedConcentratedInfo } from './type'

export default function hydrateConcentratedInfo(
  concentratedInfo: SDKParsedConcentratedInfo,
  additionalTools: {
    getToken: TokenStore['getToken']
    getLpToken: TokenStore['getLpToken']
  }
): HydratedConcentratedInfo {
  const baseToken = additionalTools.getToken(String(concentratedInfo.mintA.mint))
  const quoteToken = additionalTools.getToken(String(concentratedInfo.mintB.mint))
  const name = (baseToken ? baseToken.name : 'unknown') + '-' + (quoteToken ? quoteToken?.name : 'unknown')
  // lp
  // const sharePercent = additionalTools.lpBalance
  //   ? toFraction(additionalTools.lpBalance).div(toFraction(concentratedInfo.lpSupply))
  //   : undefined
  // const userBasePooled =
  //   baseToken && sharePercent
  //     ? new TokenAmount(baseToken, toBN(sharePercent.mul(concentratedInfo.baseReserve)))
  //     : undefined
  // const userQuotePooled =
  //   quoteToken && sharePercent
  //     ? new TokenAmount(quoteToken, toBN(sharePercent.mul(concentratedInfo.quoteReserve)))
  //     : undefined

  return {
    ...concentratedInfo,
    baseToken,
    quoteToken,
    name,
    id: toPubString(concentratedInfo.id),
    protocolFeeRate: toPercent(div(concentratedInfo.state.ammConfig.protocolFeeRate, 10 ** 8)),
    tradeFeeRate: toPercent(div(concentratedInfo.state.ammConfig.tradeFeeRate, 10 ** 8))
    // userBasePooled,
    // userQuotePooled,
    // sharePercent,
    // lpToken,
    // baseToken,
    // quoteToken
  }
}
