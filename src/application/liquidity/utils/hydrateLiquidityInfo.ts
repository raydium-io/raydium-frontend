import BN from 'bn.js'

import toFraction from '@/functions/numberish/toFraction'
import { HexAddress } from '@/types/constants'
import { TokenAmount } from '@raydium-io/raydium-sdk'

import toBN from '../../../functions/numberish/toBN'
import { LpToken, SplToken } from '../../token/type'
import { HydratedLiquidityInfo, SDKParsedLiquidityInfo } from '../type'

export default function hydrateLiquidityInfo(
  liquidityInfo: SDKParsedLiquidityInfo,
  additionalTools: {
    getToken: (mint: HexAddress) => SplToken | undefined
    getLpToken: (mint: HexAddress) => LpToken | undefined
    lpBalance: BN | undefined
  }
): HydratedLiquidityInfo {
  const lpToken = additionalTools.getLpToken(String(liquidityInfo.lpMint)) as SplToken | undefined
  const baseToken = additionalTools.getToken(String(liquidityInfo.baseMint))
  const quoteToken = additionalTools.getToken(String(liquidityInfo.quoteMint))
  // lp
  const sharePercent = additionalTools.lpBalance
    ? toFraction(additionalTools.lpBalance).div(toFraction(liquidityInfo.lpSupply))
    : undefined
  const userBasePooled =
    baseToken && sharePercent
      ? new TokenAmount(baseToken, toBN(sharePercent.mul(liquidityInfo.baseReserve)))
      : undefined
  const userQuotePooled =
    quoteToken && sharePercent
      ? new TokenAmount(quoteToken, toBN(sharePercent.mul(liquidityInfo.quoteReserve)))
      : undefined

  return {
    ...liquidityInfo,
    userBasePooled,
    userQuotePooled,
    sharePercent,
    lpToken,
    baseToken,
    quoteToken
  }
}
