import BN from 'bn.js'
import { ApiAmmV3Point } from 'test-r-sdk'
import create from 'zustand'

import useLocalStorageItem from '@/hooks/useLocalStorage'
import { Numberish } from '@/types/constants'

import { SplToken } from '../token/type'

import { APIConcentratedInfo, HydratedConcentratedInfo, SDKParsedConcentratedInfo, UserPositionAccount } from './type'

export enum PoolsConcentratedTabs {
  ALL = 'All',
  STABLES = 'Stables',
  EXOTIC = 'Exotic',
  MY_POOLS = 'My Pools'
}

export enum PoolsConcentratedLayout {
  LIST = 'List',
  CARD = 'Card'
}

export enum TimeBasis {
  DAY = '24H',
  WEEK = '7D',
  MONTH = '30D'
}

export type ConcentratedStore = {
  //#region ------------------- data -------------------
  selectableAmmPools?: HydratedConcentratedInfo[]
  currentAmmPool?: HydratedConcentratedInfo
  /** user need manually select one */
  chartPoints?: ApiAmmV3Point[]
  liquidity?: BN // from SDK, just store in UI

  coin1?: SplToken
  coin1Amount?: Numberish // for coin may be not selected yet, so it can't be TokenAmount

  coin2?: SplToken
  coin2Amount?: Numberish // for coin may be not selected yet, so it can't be TokenAmount

  priceUpperTick?: number // from SDK, just store in UI
  priceLowerTick?: number // from SDK, just store in UI

  focusSide: 'coin1' | 'coin2' // tansaction base side
  userCursorSide: 'coin1' | 'coin2' // some calculate may only whether compare  whether userCursorSide's amount have changed

  priceLower?: Numberish
  priceUpper?: Numberish
  //#endregion

  apiAmmPools: APIConcentratedInfo[]
  sdkParsedAmmPools: SDKParsedConcentratedInfo[]
  hydratedAmmPools: HydratedConcentratedInfo[]

  isInput: boolean | undefined
  isRemoveDialogOpen: boolean
  isAddDialogOpen: boolean
  targetUserPositionAccount?: UserPositionAccount

  scrollToInputBox: () => void

  // just for trigger refresh
  refreshCount: number
  refreshConcentrated: () => void

  /** for list page */
  loading: boolean
  currentTab: PoolsConcentratedTabs
  searchText: string
  expandedPoolId?: string
  tvl?: string | number // /api.raydium.io/v2/main/info
  volume24h?: string | number // /api.raydium.io/v2/main/info
  timeBasis: TimeBasis
}

//* FAQ: why no setJsonInfos, setSdkParsedInfos and setHydratedInfos? because they are not very necessary, just use zustand`set` and zustand`useConcentrated.setState()` is enough
const useConcentrated = create<ConcentratedStore>((set, get) => ({
  apiAmmPools: [],
  sdkParsedAmmPools: [],
  hydratedAmmPools: [],

  focusSide: 'coin1',
  userCursorSide: 'coin1',

  isAddDialogOpen: false,
  isRemoveDialogOpen: false,
  isInput: undefined,

  isSearchAmmDialogOpen: false,
  removeAmount: '',
  scrollToInputBox: () => {},
  refreshCount: 0,
  refreshConcentrated: () => {
    // will auto refresh wallet
    // refresh sdk parsed
    set((s) => ({
      refreshCount: s.refreshCount + 1
    }))
  },
  loading: true,
  currentTab: PoolsConcentratedTabs.ALL,
  currentLayout: PoolsConcentratedLayout.LIST,
  searchText: '',
  timeBasis: TimeBasis.WEEK
}))

export default useConcentrated

export const useConcentratedFavoriteIds = () =>
  useLocalStorageItem<string[], null>('FAVOURITE_CONCENTRATED_POOL_IDS', { emptyValue: null })
