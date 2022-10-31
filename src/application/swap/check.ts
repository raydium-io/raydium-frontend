import { LiquidityPoolJsonInfo } from '@raydium-io/raydium-sdk'

import toPubString from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'

import { SDKParsedLiquidityInfo } from '../liquidity/type'
import { routeMiddleMints } from '../token/wellknownToken.config'

export function checkTokenPairCanSwap(
  poolInfo: LiquidityPoolJsonInfo[],
  targetMint0: PublicKeyish,
  targetMint1: PublicKeyish
): boolean {
  const middleCoinMints = new Set(Object.values(routeMiddleMints))
  const mintCache0 = new Set<string>()
  const mintCache1 = new Set<string>()
  const mint0 = toPubString(targetMint0)
  const mint1 = toPubString(targetMint1)

  for (const item of poolInfo) {
    const itemBaseMint = toPubString(item.baseMint)
    const itemQuoteMint = toPubString(item.quoteMint)
    const matched =
      (itemBaseMint === mint0 && itemQuoteMint === mint1) || (itemBaseMint === mint1 && itemQuoteMint === mint0)
    if (matched) return true
    else if (middleCoinMints.has(itemBaseMint) && itemQuoteMint === mint0) mintCache0.add(itemBaseMint)
    else if (middleCoinMints.has(itemBaseMint) && itemQuoteMint === mint1) mintCache1.add(itemBaseMint)
    else if (middleCoinMints.has(itemQuoteMint) && itemBaseMint === mint0) mintCache0.add(itemQuoteMint)
    else if (middleCoinMints.has(itemQuoteMint) && itemBaseMint === mint1) mintCache1.add(itemQuoteMint)
  }

  return mintCache0.size > 0 && [...mintCache0].some((i) => mintCache1.has(i))
}
