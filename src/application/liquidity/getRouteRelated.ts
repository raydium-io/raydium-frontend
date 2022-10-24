import { LiquidityPoolJsonInfo as LiquidityJsonInfo, PublicKeyish } from 'test-r-sdk'

import toPubString from '@/functions/format/toMintString'

import { WSOLMint } from '../token/quantumSOL'
import {
  ETHMint,
  mSOLMint,
  PAIMint,
  RAYMint,
  stSOLMint,
  USDCMint,
  USDHMint,
  USDTMint
} from '../token/wellknownToken.config'

/**
 * is A - Middl - B
 */
export function getRouteRelated(
  jsonInfos: LiquidityJsonInfo[],
  targetMint1: PublicKeyish,
  targetMint2: PublicKeyish
): LiquidityJsonInfo[] {
  const routeMiddleMints = [USDCMint, RAYMint, WSOLMint, mSOLMint, PAIMint, stSOLMint, USDHMint, USDTMint, ETHMint].map(
    toPubString
  )
  const mintA = toPubString(targetMint1)
  const mintB = toPubString(targetMint2)

  const relatedA = jsonInfos.filter(
    (i) =>
      (i.baseMint === mintA && routeMiddleMints.includes(i.quoteMint)) ||
      (i.quoteMint === mintA && routeMiddleMints.includes(i.baseMint))
  )
  const relatedB = jsonInfos.filter(
    (i) =>
      (i.baseMint === mintB && routeMiddleMints.includes(i.quoteMint)) ||
      (i.quoteMint === mintB && routeMiddleMints.includes(i.baseMint))
  )
  const mintDirectComposeIsValid = (mintA1: string, mintA2: string, mintB1: string, mintB2: string) =>
    Boolean(mintA1 === mintA && mintA2 == mintB1 && mintB2 === mintB)

  const isValidRoutePair = (a: LiquidityJsonInfo, b: LiquidityJsonInfo) =>
    mintDirectComposeIsValid(a.baseMint, a.quoteMint, b.baseMint, b.quoteMint) ||
    mintDirectComposeIsValid(a.baseMint, a.quoteMint, b.quoteMint, b.baseMint) ||
    mintDirectComposeIsValid(a.quoteMint, a.baseMint, b.baseMint, b.quoteMint) ||
    mintDirectComposeIsValid(a.quoteMint, a.baseMint, b.quoteMint, b.baseMint)
  const onlyRoutes = new Set<LiquidityJsonInfo>()

  for (const relA of relatedA) {
    for (const relB of relatedB) {
      if (isValidRoutePair(relA, relB)) {
        onlyRoutes.add(relA)
        onlyRoutes.add(relB)
      }
    }
  }

  return [...onlyRoutes]
}
