import { LiquidityPoolJsonInfo as LiquidityJsonInfo, PublicKeyish } from 'test-r-sdk'

import create from 'zustand'

import toPubString, { toPub } from '@/functions/format/toMintString'
import { gte } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'

import { toDataMint } from '../token/quantumSOL'
import { SplToken } from '../token/type'

import sdkParseJsonLiquidityInfo from './sdkParseJsonLiquidityInfo'
import { HydratedLiquidityInfo, SDKParsedLiquidityInfo } from './type'
import { getRouteRelated } from './getRouteRelated'

export type LiquidityStore = {
  // too tedius
  // /** start with `query` means temp info (may be it will be abandon by data parse)*/
  // queryCoin1Mint?: string
  // queryCoin2Mint?: string
  // queryAmmId?: string
  // queryMode?: 'removeLiquidity'

  /********************** caches (at least includes exhibition's data) **********************/
  /**
   *  pure data (just string, number, boolean, undefined, null)
   */
  jsonInfos: LiquidityJsonInfo[]
  officialIds: Set<LiquidityJsonInfo['id']>
  unOfficialIds: Set<LiquidityJsonInfo['id']>

  /**
   *  additionally add 'SDK parsed data' (BN, PublicKey, etc.)
   */
  sdkParsedInfos: SDKParsedLiquidityInfo[] // auto parse info in {@link useLiquidityAuto}

  /**
   * additionally add 'hydrated data' (shorcuts data or customized data)
   * !important: only if pool is in userExhibitionLiquidityIds
   */
  hydratedInfos: HydratedLiquidityInfo[] // auto parse info in {@link useLiquidityAuto}

  /********************** exhibition panel **********************/
  userExhibitionLiquidityIds: string[]

  /********************** main panel (coin pair panel) **********************/
  currentJsonInfo: LiquidityJsonInfo | undefined
  currentSdkParsedInfo: SDKParsedLiquidityInfo | undefined // auto parse info in {@link useLiquidityAuto}
  currentHydratedInfo: HydratedLiquidityInfo | undefined // auto parse info in {@link useLiquidityAuto}

  searchText: string

  ammId: string | undefined

  coin1: SplToken | undefined

  /** with slippage */
  coin1Amount?: string // for coin may be not selected yet, so it can't be TokenAmount
  unslippagedCoin1Amount?: string // for coin may be not selected yet, so it can't be TokenAmount

  coin2: SplToken | undefined

  /** with slippage */
  coin2Amount?: string // for coin may be not selected yet, so it can't be TokenAmount
  unslippagedCoin2Amount?: string // for coin may be not selected yet, so it can't be TokenAmount

  isCalculatingBczSelection: boolean

  focusSide: 'coin1' | 'coin2' // not reflect ui placement.  maybe coin1 appears below coin2
  isRemoveDialogOpen: boolean
  isSearchAmmDialogOpen: boolean
  removeAmount: string
  scrollToInputBox: () => void

  // just for trigger refresh
  refreshCount: number
  refreshLiquidity: () => void
}

//* FAQ: why no setJsonInfos, setSdkParsedInfos and setHydratedInfos? because they are not very necessary, just use zustand`set` and zustand`useLiquidity.setState()` is enough
const useLiquidity = create<LiquidityStore>((set, get) => ({
  /********************** caches (at least includes exhibition's data) **********************/

  /**
   *  pure data (just string, number, boolean, undefined, null)
   */
  jsonInfos: [],
  officialIds: new Set(),
  unOfficialIds: new Set(),
  /**
   *  additionally add 'SDK parsed data' (BN, PublicKey, etc.)
   */
  sdkParsedInfos: [], // auto parse info in {@link useLiquidityAuto}
  /**
   * additionally add 'hydrated data' (shorcuts data or customized data)
   */
  hydratedInfos: [], // auto parse info in {@link useLiquidityAuto}

  /********************** exhibition panel **********************/
  userExhibitionLiquidityIds: [],

  /********************** main panel (coin pair panel) **********************/
  currentJsonInfo: undefined,
  currentSdkParsedInfo: undefined, // auto parse info in {@link useLiquidityAuto}
  currentHydratedInfo: undefined, // auto parse info in {@link useLiquidityAuto}

  ammId: '',

  coin1: undefined,

  coin2: undefined,

  isCalculatingBczSelection: false,

  searchText: '',
  focusSide: 'coin1',

  isRemoveDialogOpen: false,
  isSearchAmmDialogOpen: false,
  removeAmount: '',
  scrollToInputBox: () => {},

  refreshCount: 0,
  refreshLiquidity: () => {
    // will auto refresh wallet

    // refresh sdk parsed
    set((s) => ({
      refreshCount: s.refreshCount + 1
    }))
  }
}))

export default useLiquidity
