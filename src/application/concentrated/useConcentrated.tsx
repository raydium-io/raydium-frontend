import { ApiAmmV3Point, ReturnTypeFetchMultiplePoolInfos } from '@raydium-io/raydium-sdk'
import { Keypair, Transaction } from '@solana/web3.js'

import BN from 'bn.js'
import create from 'zustand'

import jFetch from '@/functions/dom/jFetch'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { Numberish } from '@/types/constants'

import { SplToken } from '../token/type'

import toBN from '@/functions/numberish/toBN'
import {
  APIConcentratedInfo, HydratedAmmV3ConfigInfo, HydratedConcentratedInfo, SDKParsedConcentratedInfo, UICLMMRewardInfo,
  UserPositionAccount
} from './type'

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

export const timeMap = {
  [TimeBasis.DAY]: 'day',
  [TimeBasis.WEEK]: 'week',
  [TimeBasis.MONTH]: 'month'
}

export type ConcentratedStore = {
  //#region ------------------- input data -------------------
  selectableAmmPools?: HydratedConcentratedInfo[]
  currentAmmPool?: HydratedConcentratedInfo
  /** user need manually select one */
  chartPoints?: ApiAmmV3Point[]
  lazyLoadChart: boolean
  loadChartPointsAct: (poolId: string) => void
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
  totalDeposit?: Numberish
  //#endregion

  apiAmmPools: APIConcentratedInfo[]
  sdkParsedAmmPools: SDKParsedConcentratedInfo[]
  originSdkParsedAmmPools: ReturnTypeFetchMultiplePoolInfos
  hydratedAmmPools: HydratedConcentratedInfo[]

  isInput: boolean | undefined
  isRemoveDialogOpen: boolean
  isAddDialogOpen: boolean
  isMyPositionDialogOpen: boolean
  isAprCalcPanelShown: boolean

  targetUserPositionAccount?: UserPositionAccount

  scrollToInputBox: () => void

  // just for trigger refresh
  refreshCount: number
  refreshConcentrated: () => void

  /** data for hydrate is loading  */
  loading: boolean
  currentTab: PoolsConcentratedTabs
  searchText: string
  expandedItemIds: Set<string>
  tvl?: string | number // /api.raydium.io/v2/main/info
  volume24h?: string | number // /api.raydium.io/v2/main/info
  timeBasis: TimeBasis
  aprCalcMode: 'D' | 'C'

  availableAmmConfigFeeOptions?: HydratedAmmV3ConfigInfo[] // create pool
  userSelectedAmmConfigFeeOption?: HydratedAmmV3ConfigInfo // create pool
  userSettedCurrentPrice?: Numberish // create pool
  tempDataCache?: {
    transaction: Transaction
    signers: Keypair[]
  }
  rewards: UICLMMRewardInfo[] // TEMP

  planAApr?: { feeApr: number; rewardsApr: number[]; apr: number }
  planBApr?: { feeApr: number; rewardsApr: number[]; apr: number }
  planCApr?: { feeApr: number; rewardsApr: number[]; apr: number }

  amountMinA: BN
  amountMinB: BN
}

//* FAQ: why no setJsonInfos, setSdkParsedInfos and setHydratedInfos? because they are not very necessary, just use zustand`set` and zustand`useConcentrated.setState()` is enough
export const useConcentrated = create<ConcentratedStore>((set, get) => ({
  apiAmmPools: [],
  sdkParsedAmmPools: [],
  originSdkParsedAmmPools: {},
  hydratedAmmPools: [],

  focusSide: 'coin1',
  userCursorSide: 'coin1',

  lazyLoadChart: false,
  isAddDialogOpen: false,
  isRemoveDialogOpen: false,
  isMyPositionDialogOpen: false,
  isAprCalcPanelShown: false,

  isInput: undefined,
  isSearchAmmDialogOpen: false,
  removeAmount: '',
  loadChartPointsAct: async (poolId: string) => {
    const chartResponse = await jFetch<{ data: ApiAmmV3Point[] }>(
      `https://api.raydium.io/v2/ammV3/positionLine?pool_id=${poolId}`
    )

    const currentAmmPool = get().currentAmmPool
    if (!chartResponse || poolId !== currentAmmPool?.idString) return
    set({ chartPoints: chartResponse.data })
  },
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
  expandedItemIds: new Set(),
  timeBasis: TimeBasis.DAY,
  aprCalcMode: 'D',

  rewards: [],

  planAApr: { feeApr: 0, rewardsApr: [], apr: 0 },
  planBApr: { feeApr: 0, rewardsApr: [], apr: 0 },
  planCApr: { feeApr: 0, rewardsApr: [], apr: 0 },

  amountMinA: toBN(0),
  amountMinB: toBN(0)
}))

export default useConcentrated

export const useConcentratedFavoriteIds = () =>
  useLocalStorageItem<string[], null>('FAVOURITE_CONCENTRATED_POOL_IDS', { emptyValue: null })
