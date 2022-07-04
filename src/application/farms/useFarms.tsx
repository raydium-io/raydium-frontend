import create from 'zustand'

import { FarmPoolJsonInfo, HydratedFarmInfo, SdkParsedFarmInfo } from './type'
import useToken from '../token/useToken'
import useLocalStorageItem from '@/hooks/useLocalStorage'

import { getURLFarmId, getURLFarmTab } from './parseFarmUrl'
import isClientSide, { inClient } from '@/functions/judgers/isSSR'

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
  currentTab: 'Raydium' | 'Fusion' | 'Ecosystem' | 'Inactive'
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

  expandedItemIds: inClient ? new Set([getURLFarmId() ?? '']) : new Set(),
  haveUpcomingFarms: false,

  farmRefreshCount: 0,
  refreshFarmInfos: () => {
    set((s) => ({ farmRefreshCount: s.farmRefreshCount + 1 }))
    useToken.getState().refreshTokenPrice()
  },

  onlySelfFarms: false,
  onlySelfCreatedFarms: false,
  currentTab: inClient ? getURLFarmTab() || 'Raydium' : 'Raydium',
  searchText: inClient ? getURLFarmId() ?? '' : '',

  stakeDialogMode: 'deposit',
  isStakeDialogOpen: false,
  stakeDialogInfo: undefined
}))

export const useFarmFavoriteIds = () => useLocalStorageItem<string[]>('FAVOURITE_FARM_IDS')

export default useFarms
