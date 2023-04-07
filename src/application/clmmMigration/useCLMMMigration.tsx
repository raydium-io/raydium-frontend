import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toFraction from '@/functions/numberish/toFraction'
import { Numberish } from '@/types/constants'
import { AmmV3, AmmV3PoolInfo, TokenAmount } from '@raydium-io/raydium-sdk'
import create from 'zustand'
import { HydratedConcentratedInfo } from '../concentrated/type'
import { decimalToFraction, fractionToDecimal } from '../txTools/decimal2Fraction'

export const useCLMMMigration = create<CLMMMigrationStore>((set, get) => ({
  jsonInfos: [] as CLMMMigrationJSON[],
  shouldLoadedClmmIds: new Set<string>(),
  loadedHydratedClmmInfos: new Map<string, HydratedConcentratedInfo>(),
  refreshCount: 1,
  refresh: () => {
    set((s) => ({ refreshCount: s.refreshCount + 1 }))
  }
}))

type CLMMMigrationStore = {
  jsonInfos: CLMMMigrationJSON[]
  shouldLoadedClmmIds: Set<string>
  loadedHydratedClmmInfos: Map<string, HydratedConcentratedInfo>
  refreshCount: number
  refresh: () => void
}

export type CLMMMigrationJSON = {
  ammId: string
  lpMint: string
  farmIds: string[]
  clmmId: string
  defaultPriceMin: number
  defaultPriceMax: number
}

export function getExactPriceAndTick(params: { price: Numberish; info: AmmV3PoolInfo; baseSide: 'base' | 'quote' }) {
  const { tick, price } = AmmV3.getPriceAndTick({
    baseIn: params.baseSide === 'base',
    poolInfo: params.info,
    price: fractionToDecimal(toFraction(params.price))
  })
  return { tick, price: decimalToFraction(price) }
}

export function getResultAmountByTick(params: {
  baseSide: 'base' | 'quote'
  info: AmmV3PoolInfo
  baseAmount: TokenAmount
  quoteAmount: TokenAmount
  tickLower: number
  tickUpper: number
  slippage: number
}) {
  const { amountA, amountB, liquidity } = AmmV3.getLiquidityFromAmounts({
    add: params.baseSide === 'base', // TEMP for Dev, force
    poolInfo: params.info,
    amountA: params.baseAmount.raw,
    amountB: params.quoteAmount.raw,
    tickLower: Math.min(params.tickLower, params.tickUpper),
    tickUpper: Math.max(params.tickLower, params.tickUpper),
    slippage: params.slippage
  })
  return {
    resultBaseAmount: toTokenAmount(params.baseAmount.token, amountA),
    resultQuoteAmount: toTokenAmount(params.quoteAmount.token, amountB),
    liquidity
  }
}
