import { LiquidityPoolJsonInfo, MARKET_STATE_LAYOUT_V3, PublicKeyish } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import useConnection from '@/application/connection/useConnection'

import useLiquidity from './useLiquidity'

export function findLiquidityPoolJson(options: {
  urlAmmId?: string
  urlCoin1Mint?: string
  urlCoin2Mint?: string
}): LiquidityPoolJsonInfo | undefined {
  const { jsonInfos } = useLiquidity.getState()
  return jsonInfos.find((i) => {
    if (i.id === options.urlAmmId) return true
    if (
      (i.baseMint === options.urlCoin1Mint && i.quoteMint === options.urlCoin2Mint) ||
      (i.baseMint === options.urlCoin2Mint && i.quoteMint === options.urlCoin1Mint)
    )
      return true
    return false
  })
}

export function findAmmId(lpMint: PublicKeyish) {
  const userLpMint = String(lpMint)
  const { jsonInfos } = useLiquidity.getState()
  const targetJsonInfo = jsonInfos.find(({ lpMint }) => lpMint === userLpMint)
  return targetJsonInfo?.id
}

/**
 * could only find in raydium filtered amm, for some amm is banned by backend
 * @param ammId
 * @returns token mint pair
 */
export function findTokenMintByAmmId(ammId: string): { base: string; quote: string } | undefined {
  const { jsonInfos } = useLiquidity.getState()
  const targetJsonInfo = jsonInfos.find(({ id }) => id === ammId)
  return targetJsonInfo ? { base: targetJsonInfo.baseMint, quote: targetJsonInfo.quoteMint } : undefined
}

/**
 * could be any serum market on Chain. parsed by {@link MARKET_STATE_LAYOUT_V3}
 * @param marketId
 * @returns token mint pair
 */
export async function findTokenMintByMarketId(marketId: string): Promise<{ base: string; quote: string } | undefined> {
  const { connection } = useConnection.getState()
  const marketBufferInfo = await connection?.getAccountInfo(new PublicKey(marketId))
  const isValidMarketInfo = marketBufferInfo?.data.length === 388 || marketBufferInfo?.data.length === 1476
  if (!isValidMarketInfo) return undefined
  const { baseMint, quoteMint } = MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo.data)
  return { base: String(baseMint), quote: String(quoteMint) }
}
