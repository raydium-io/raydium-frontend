import create from 'zustand'

import { HexAddress } from '@/types/constants'
import { Price } from '@raydium-io/raydium-sdk'

import { HydratedPoolItemInfo, JsonPairItemInfo } from './type'

// backEnd naming: Pools -> PairInfo
export type PoolsStore = {
  loading: boolean
  jsonInfos: JsonPairItemInfo[]
  hydratedInfos: HydratedPoolItemInfo[]
  lpPrices: Record<HexAddress, Price>

  /** UI States */
  searchText: string
  timeBasis: '24H' | '7D' | '30D'
  currentTab: 'All' | 'Raydium' | 'Permissionless' // currently shouldn't show this to user.
  onlySelfPools: boolean

  // just for trigger refresh
  refreshCount: number
  refreshPools: () => void
}

// FAQ: why it's a domain? because it must be a domain , or it's a design bug ———— do something useless.

export const usePools = create<PoolsStore>((set, get) => ({
  loading: true,
  jsonInfos: [],
  hydratedInfos: [],
  lpPrices: {},

  /** UI States */
  searchText: '',
  timeBasis: '7D',
  currentTab: 'All',
  onlySelfPools: false,

  refreshCount: 0,
  refreshPools: () => {
    // will refresh api pairs
    set((s) => ({
      refreshCount: s.refreshCount + 1
    }))
  }
}))
