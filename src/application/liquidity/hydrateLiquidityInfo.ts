import BN from 'bn.js'
import { TokenAmount } from 'test-r-sdk'

import toPubString from '@/functions/format/toMintString'
import toFraction from '@/functions/numberish/toFraction'
import { HexAddress } from '@/types/constants'

import toBN from '../../functions/numberish/toBN'
import { LpToken, SplToken } from '../token/type'

import { HydratedLiquidityInfo, SDKParsedLiquidityInfo } from './type'

export default function hydrateLiquidityInfo(
  liquidityInfo: SDKParsedLiquidityInfo,
  additionalTools: {
    getToken: (mint: HexAddress) => SplToken | undefined
    getLpToken: (mint: HexAddress) => LpToken | undefined
    lpBalance: BN | undefined
  }
): HydratedLiquidityInfo {
  const lpToken = additionalTools.getLpToken(toPubString(liquidityInfo.lpMint)) as SplToken | undefined
  const baseToken = additionalTools.getToken(toPubString(liquidityInfo.baseMint))
  const quoteToken = additionalTools.getToken(toPubString(liquidityInfo.quoteMint))

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
