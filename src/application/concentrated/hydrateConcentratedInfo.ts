import BN from 'bn.js'

import toFraction from '@/functions/numberish/toFraction'
import { HexAddress } from '@/types/constants'
import { TokenAmount } from '@raydium-io/raydium-sdk'

import toBN from '../../functions/numberish/toBN'
import { LpToken, SplToken } from '../token/type'
import { HydratedConcentratedInfo, SDKParsedConcentratedInfo } from './type'

export default function hydrateConcentratedInfo(
  concentratedInfo: SDKParsedConcentratedInfo,
  additionalTools: {
    getToken: (mint: HexAddress) => SplToken | undefined
    getLpToken: (mint: HexAddress) => LpToken | undefined
    lpBalance: BN | undefined
  }
): HydratedConcentratedInfo {
  const lpToken = additionalTools.getLpToken(String(concentratedInfo.lpMint)) as SplToken | undefined
  const baseToken = additionalTools.getToken(String(concentratedInfo.baseMint))
  const quoteToken = additionalTools.getToken(String(concentratedInfo.quoteMint))
  // lp
  const sharePercent = additionalTools.lpBalance
    ? toFraction(additionalTools.lpBalance).div(toFraction(concentratedInfo.lpSupply))
    : undefined
  const userBasePooled =
    baseToken && sharePercent
      ? new TokenAmount(baseToken, toBN(sharePercent.mul(concentratedInfo.baseReserve)))
      : undefined
  const userQuotePooled =
    quoteToken && sharePercent
      ? new TokenAmount(quoteToken, toBN(sharePercent.mul(concentratedInfo.quoteReserve)))
      : undefined

  return {
    ...concentratedInfo,
    userBasePooled,
    userQuotePooled,
    sharePercent,
    lpToken,
    baseToken,
    quoteToken
  }
}
