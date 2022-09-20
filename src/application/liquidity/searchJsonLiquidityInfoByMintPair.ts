import { PublicKeyish } from '@/types/constants'
import { LiquidityPoolJsonInfo } from 'test-r-sdk'

import searchJsonLiquidityInfo from './searchJsonLiquidityInfo'

/**
 *
 * @requires {@link searchJsonLiquidityInfo}
 */
export default function searchJsonLiquidityInfoByMintPair(
  mint1: PublicKeyish,
  mint2: PublicKeyish,
  jsonInfos: LiquidityPoolJsonInfo[]
) {
  const result = searchJsonLiquidityInfo({ baseMint: String(mint1), quoteMint: String(mint2) }, jsonInfos)
  if (result) return [result, 1] as const
  const resultReversed = searchJsonLiquidityInfo({ baseMint: String(mint2), quoteMint: String(mint1) }, jsonInfos)
  if (resultReversed) return [resultReversed, -1] as const
  return [undefined, 1] as const
}
