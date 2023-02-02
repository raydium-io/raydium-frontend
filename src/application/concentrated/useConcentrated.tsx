import { AmmV3, ApiAmmV3PositionLinePoint, ReturnTypeFetchMultiplePoolInfos } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import BN from 'bn.js'
import create from 'zustand'

import useConnection from '@/application/connection/useConnection'
import useToken from '@/application/token/useToken'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import jFetch from '@/functions/dom/jFetch'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { Numberish } from '@/types/constants'

import { SplToken } from '../token/type'

import { InnerTransaction } from '@raydium-io/raydium-sdk'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import {
  APIConcentratedInfo,
  HydratedAmmV3ConfigInfo,
  HydratedConcentratedInfo,
  SDKParsedConcentratedInfo,
  UICLMMRewardInfo,
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
  chartPoints?: ApiAmmV3PositionLinePoint[]
  lazyLoadChart: boolean
  loadChartPointsAct: (poolId: string) => void
  liquidity?: BN // from SDK, just store in UI

  coin1?: SplToken
  coin1Amount?: Numberish // for coin may be not selected yet, so it can't be TokenAmount
  coin1AmountMin?: Numberish

  coin2?: SplToken
  coin2Amount?: Numberish // for coin may be not selected yet, so it can't be TokenAmount
  coin2AmountMin?: Numberish

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
  ownedPoolOnly: boolean

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
  tempDataCache?: InnerTransaction[]
  rewards: UICLMMRewardInfo[] // TEMP

  planAApr?: { feeApr: number; rewardsApr: number[]; apr: number }
  planBApr?: { feeApr: number; rewardsApr: number[]; apr: number }
  planCApr?: { feeApr: number; rewardsApr: number[]; apr: number }

  fetchWhitelistRewards: () => void
  whitelistRewards: PublicKey[]
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
  ownedPoolOnly: false,

  isInput: undefined,
  isSearchAmmDialogOpen: false,
  removeAmount: '',
  loadChartPointsAct: async (poolId: string) => {
    const ammV3PositionLineUrl = useAppAdvancedSettings.getState().apiUrls.ammV3PositionLine
    const chartResponse = await jFetch<{ data: ApiAmmV3PositionLinePoint[] }>(
      `${ammV3PositionLineUrl.replace('<poolId>', poolId)}`
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

  fetchWhitelistRewards: () => {
    const connection = useConnection.getState().connection
    if (!connection || get().whitelistRewards.length > 0) return
    const { getToken } = useToken.getState()
    const { programIds } = useAppAdvancedSettings.getState()
    AmmV3.getWhiteListMint({
      connection,
      programId: programIds.CLMM
    }).then((data) => {
      set({
        whitelistRewards: shakeUndifindedItem(data.map((pub) => getToken(pub))).map((token) => token.mint)
      })
    })
  },
  whitelistRewards: []
}))

export default useConcentrated

export const useConcentratedFavoriteIds = () =>
  useLocalStorageItem<string[], null>('FAVOURITE_CONCENTRATED_POOL_IDS', { emptyValue: null })
