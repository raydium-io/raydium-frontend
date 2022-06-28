import create from 'zustand'

import { FarmPoolJsonInfo, HydratedFarmInfo, SdkParsedFarmInfo } from './type'
import useToken from '../token/useToken'
import useLocalStorageItem from '@/hooks/useLocalStorage'

export type FarmStore = {
  isLoading: boolean
  jsonInfos: (FarmPoolJsonInfo & { official: boolean })[] // TODO: switch to Object key value pair, for faster extracting
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
  currentTab: 'All' | 'Upcoming' | 'Raydium' | 'Fusion' | 'Ecosystem' | 'Inactive'
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
  currentTab: 'All',
  searchText: '',

  stakeDialogMode: 'deposit',
  isStakeDialogOpen: false,
  stakeDialogInfo: undefined
}))

export const useFarmFavoriteIds = () => useLocalStorageItem<string[]>('FAVOURITE_FARM_IDS')

export default useFarms
