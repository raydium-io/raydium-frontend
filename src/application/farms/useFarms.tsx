import create from 'zustand'

import { FarmPoolJsonInfo, HydratedFarmInfo, SdkParsedFarmInfo } from './type'
import useToken from '../token/useToken'
import useLocalStorageItem from '@/hooks/useLocalStorage'

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

  // do not care it's value, just trigger React refresh
  farmRefreshCount: number
  refreshFarmInfos(): void

  onlySelfFarms: boolean
  onlySelfCreatedFarms: boolean
  currentTab: 'Raydium' | 'Fusion' | 'Ecosystem' | 'Staked'
  timeBasis: '24H' | '7D' | '30D'
  tokenType: 'All' | 'Standard SPL' | 'Option tokens'
  searchText: string

  stakeDialogMode: 'deposit' | 'withdraw'
  isStakeDialogOpen: boolean
  stakeDialogInfo: undefined | HydratedFarmInfo
}

const useFarms = create<FarmStore>((set) => ({
  isLoading: true,
  jsonInfos: [],
  sdkParsedInfos: [],
  hydratedInfos: [],

  expandedItemIds: new Set(),
  haveUpcomingFarms: false,

  farmRefreshCount: 0,
  refreshFarmInfos: () => {
    set((s) => ({ farmRefreshCount: s.farmRefreshCount + 1 }))
    useToken.getState().refreshTokenPrice()
  },

  onlySelfFarms: false,
  onlySelfCreatedFarms: false,
  currentTab: 'Raydium',
  timeBasis: '7D',
  tokenType: 'Standard SPL',
  searchText: '',

  stakeDialogMode: 'deposit',
  isStakeDialogOpen: false,
  stakeDialogInfo: undefined
}))

export const useFarmFavoriteIds = () => useLocalStorageItem<string[], null>('FAVOURITE_FARM_IDS', { emptyValue: null })

export default useFarms
