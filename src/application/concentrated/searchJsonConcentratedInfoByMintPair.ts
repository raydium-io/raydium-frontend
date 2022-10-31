import { LiquidityPoolJsonInfo } from '@raydium-io/raydium-sdk'

import { PublicKeyish } from '@/types/constants'

import searchJsonConcentratedInfo from './searchJsonConcentratedInfo'

/**
 *
 * @requires {@link searchJsonConcentratedInfo}
 */
export default function searchJsonConcentratedInfoByMintPair(
  mint1: PublicKeyish,
  mint2: PublicKeyish,
  jsonInfos: LiquidityPoolJsonInfo[]
) {
  const result = searchJsonConcentratedInfo({ baseMint: String(mint1), quoteMint: String(mint2) }, jsonInfos)
  if (result) return [result, 1] as const
  const resultReversed = searchJsonConcentratedInfo({ baseMint: String(mint2), quoteMint: String(mint1) }, jsonInfos)
  if (resultReversed) return [resultReversed, -1] as const
  return [undefined, 1] as const
}
