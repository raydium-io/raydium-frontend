import toPubString from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'
import { LiquidityPoolJsonInfo } from '@raydium-io/raydium-sdk'
import { SDKParsedLiquidityInfo } from '../liquidity/type'
import { routeMiddleMints } from '../token/wellknownToken.config'

export function checkTokenPairCanSwap(
  poolInfo: LiquidityPoolJsonInfo[],
  targetMint0: PublicKeyish,
  targetMint1: PublicKeyish
): boolean {
  const middleCoinMints = new Set(Object.values(routeMiddleMints))
  const coinBucket0 = new Set<string>()
  const coinBucket1 = new Set<string>()
  const mint0 = toPubString(targetMint0)
  const mint1 = toPubString(targetMint1)

  for (const item of poolInfo) {
    const itemBaseMint = toPubString(item.baseMint)
    const itemQuoteMint = toPubString(item.quoteMint)
    const matched =
      (itemBaseMint === mint0 && itemQuoteMint === mint1) || (itemBaseMint === mint1 && itemQuoteMint === mint0)
    if (matched) return true
    else if (middleCoinMints.has(itemBaseMint) && itemBaseMint === mint0) coinBucket0.add(itemQuoteMint)
    else if (middleCoinMints.has(itemBaseMint) && itemBaseMint === mint1) coinBucket1.add(itemQuoteMint)
    else if (middleCoinMints.has(itemQuoteMint) && itemQuoteMint === mint0) coinBucket0.add(itemBaseMint)
    else if (middleCoinMints.has(itemQuoteMint) && itemQuoteMint === mint1) coinBucket1.add(itemBaseMint)
  }

  return [...coinBucket0].some((i) => coinBucket1.has(i))
}
