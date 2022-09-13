import { Price } from '@raydium-io/raydium-sdk'

import create from 'zustand'

import useLocalStorageItem from '@/hooks/useLocalStorage'
import { HexAddress } from '@/types/constants'

// import { HydratedPairItemInfo, JsonPairItemInfo } from './type'

export enum PoolsConcentratedTabs {
  ALL = 'All',
  STABLES = 'Stables',
  EXOTIC = 'Exotic',
  MY_POOLS = 'My Pools'
}

// backEnd naming: Pools -> PairInfo
export type PoolsConcentratedStore = {
  loading: boolean
  // jsonInfos: JsonPairItemInfo[]
  // /** unlike jsonInfos, tedious Json Infos includes unknown token */
  // rawJsonInfos: JsonPairItemInfo[]
  // hydratedInfos: HydratedPairItemInfo[]
  // lpPrices: Record<HexAddress, Price>
  tvl?: string | number // /api.raydium.io/v2/main/info
  volume24h?: string | number // /api.raydium.io/v2/main/info

  /** UI States */
  searchText: string
  timeBasis: '24H' | '7D' | '30D'
  currentTab: PoolsConcentratedTabs // currently shouldn't show this to user.
  onlySelfPools: boolean
  expandedPoolId?: string

  // just for trigger refresh
  refreshCount: number
  refreshPools: () => void
}

// FAQ: why it's a domain? because it must be a domain , or it's a design bug ———— do something useless.
export const usePoolsConcentrated = create<PoolsConcentratedStore>((set, get) => ({
  loading: true,
  // jsonInfos: [],
  // rawJsonInfos: [],

  // hydratedInfos: [],
  // lpPrices: {},

  /** UI States */
  searchText: '',
  timeBasis: '7D',
  currentTab: PoolsConcentratedTabs.ALL,
  onlySelfPools: false,

  refreshCount: 0,
  refreshPools: () => {
    // will refresh api pairs
    set((s) => ({
      refreshCount: s.refreshCount + 1
    }))
  }
}))

export const usePoolConcentratedFavoriteIds = () =>
  useLocalStorageItem<string[], null>('FAVOURITE_POOL_CONCENTRATED_IDS', { emptyValue: null })
