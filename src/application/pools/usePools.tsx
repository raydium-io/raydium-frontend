import { Price } from '@raydium-io/raydium-sdk'

import create from 'zustand'

import useLocalStorageItem from '@/hooks/useLocalStorage'
import { HexAddress } from '@/types/constants'

import { HydratedPairItemInfo, JsonPairItemInfo } from './type'

// backEnd naming: Pools -> PairInfo
export type PoolsStore = {
  jsonInfos: JsonPairItemInfo[]
  /** unlike jsonInfos, tedious Json Infos includes unknown token */
  rawJsonInfos: JsonPairItemInfo[]
  hydratedInfos: HydratedPairItemInfo[]
  lpPrices: Record<HexAddress, Price>
  tvl?: string | number // /api.raydium.io/v2/main/info
  volume24h?: string | number // /api.raydium.io/v2/main/info

  /** UI States */
  searchText: string
  timeBasis: '24H' | '7D' | '30D'
  currentTab: 'All' | 'Raydium' | 'Permissionless' // currently shouldn't show this to user.
  onlySelfPools: boolean
  expandedPoolIds: Set<string>

  // just for trigger refresh
  refreshCount: number
  refreshPools: () => void

  filterTarget: 'none' | 'Liquidity' | 'Volume' | 'Fees' | 'Apr'
  filterMax?: string
  filterMin?: string
}

// FAQ: why it's a domain? because it must be a domain , or it's a design bug ———— do something useless.
export const usePools = create<PoolsStore>((set, get) => ({
  jsonInfos: [],
  rawJsonInfos: [],

  hydratedInfos: [],
  lpPrices: {},

  /** UI States */
  searchText: '',
  timeBasis: '24H',
  currentTab: 'All',
  onlySelfPools: false,
  expandedPoolIds: new Set(),

  refreshCount: 0,
  refreshPools: () => {
    // will refresh api pairs
    set((s) => ({
      refreshCount: s.refreshCount + 1
    }))
  },

  filterTarget: 'none'
}))

export const usePoolFavoriteIds = () => useLocalStorageItem<string[], null>('FAVOURITE_POOL_IDS', { emptyValue: null })
