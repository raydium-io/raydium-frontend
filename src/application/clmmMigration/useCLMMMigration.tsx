import toFraction from '@/functions/numberish/toFraction'
import { Numberish } from '@/types/constants'
import { AmmV3, AmmV3PoolInfo } from '@raydium-io/raydium-sdk'
import create from 'zustand'
import { HydratedConcentratedInfo } from '../concentrated/type'
import { fractionToDecimal } from '../txTools/decimal2Fraction'

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

export function getLiquidityFromAmounts(utils: {
  price: Numberish
  baseAmount: Numberish
  quoteAmount: Numberish
  info: AmmV3PoolInfo
  baseSide: 'base' | 'quote'
}) {
  const tick = AmmV3.getPriceAndTick({
    baseIn: utils.baseSide === 'base',
    poolInfo: utils.info,
    price: fractionToDecimal(toFraction(utils.price))
  })
  // const {} = AmmV3.getLiquidityFromAmounts({})
}
