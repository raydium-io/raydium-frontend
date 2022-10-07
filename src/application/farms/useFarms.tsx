import create from 'zustand'

import useLocalStorageItem from '@/hooks/useLocalStorage'

import useToken from '../token/useToken'

import { FarmPoolJsonInfo, HydratedFarmInfo, SdkParsedFarmInfo } from './type'

export type FarmStore = {
  /** detect if hydratedInfo is ready */
  isLoading: boolean
  jsonInfos: FarmPoolJsonInfo[] // TODO: switch to Object key value pair, for faster extracting
  sdkParsedInfos: SdkParsedFarmInfo[] // TODO: switch to Object key value pair, for faster extracting
  hydratedInfos: HydratedFarmInfo[] // TODO: switch to Object key value pair, for faster extracting
  /**
   * front-end customized farm id list
   * expanded collapse items
   */
  expandedItemIds: Set<string>
  haveUpcomingFarms: boolean

  onlySelfFarms: boolean
  onlySelfCreatedFarms: boolean
  currentTab: 'Raydium' | 'Fusion' | 'Ecosystem' | 'Staked'
  timeBasis: '24H' | '7D' | '30D'
  tokenType: 'All' | 'Standard SPL' | 'Option tokens'
  searchText: string

  stakeDialogMode: 'deposit' | 'withdraw'
  isStakeDialogOpen: boolean
  stakeDialogInfo: undefined | HydratedFarmInfo
  blockSlotCount: number

  // do not care it's value, just trigger React refresh
  farmRefreshCount: number
  refreshFarmInfos(): void
}

const useFarms = create<FarmStore>((set) => ({
  isLoading: true,
  jsonInfos: [],
  sdkParsedInfos: [],
  hydratedInfos: [],

  expandedItemIds: new Set(),
  haveUpcomingFarms: false,

  onlySelfFarms: false,
  onlySelfCreatedFarms: false,
  currentTab: 'Raydium',
  timeBasis: '7D',
  tokenType: 'All',
  searchText: '',

  stakeDialogMode: 'deposit',
  isStakeDialogOpen: false,
  stakeDialogInfo: undefined,
  blockSlotCount: 2,

  farmRefreshCount: 0,
  refreshFarmInfos: () => {
    set((s) => ({ farmRefreshCount: s.farmRefreshCount + 1 }))
    useToken.getState().refreshTokenPrice()
  }
}))

export const useFarmFavoriteIds = () => useLocalStorageItem<string[], null>('FAVOURITE_FARM_IDS', { emptyValue: null })

export default useFarms
