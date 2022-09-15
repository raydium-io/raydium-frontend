import create from 'zustand'

import { Numberish } from '@/types/constants'
import BN from 'bn.js'
import { ApiAmmV3Point } from 'test-r-sdk'
import { SplToken } from '../token/type'
import { APIConcentratedInfo, HydratedConcentratedInfo, SDKParsedConcentratedInfo } from './type'

export type ConcentratedStore = {
  //#region ------------------- card UI -------------------

  selectableAmmPools?: HydratedConcentratedInfo[]
  currentAmmPool?: HydratedConcentratedInfo
  /** user need manually select one */
  chartPoints?: ApiAmmV3Point[]
  liquidity?: BN // from SDK, just store in UI

  coin1: SplToken | undefined
  coin1Amount?: Numberish // for coin may be not selected yet, so it can't be TokenAmount

  coin2: SplToken | undefined
  coin2Amount?: Numberish // for coin may be not selected yet, so it can't be TokenAmount

  priceUpperTick?: number // from SDK, just store in UI
  priceLowerTick?: number // from SDK, just store in UI

  focusSide: 'coin1' | 'coin2' // not reflect ui placement.  maybe coin1 appears below coin2
  priceLower?: Numberish
  priceUpper?: Numberish

  directionReversed: boolean // determine chart rang input box focus make this to be true
  tabReversed: boolean // determine chart rang input tab focus make this to be true

  //#endregion

  apiAmmPools: APIConcentratedInfo[]
  sdkParsedAmmPools: SDKParsedConcentratedInfo[]
  hydratedAmmPools: HydratedConcentratedInfo[]

  isRemoveDialogOpen: boolean
  isSearchAmmDialogOpen: boolean
  removeAmount: string

  // just for trigger refresh
  refreshCount: number
  refreshConcentrated: () => void
}

//* FAQ: why no setJsonInfos, setSdkParsedInfos and setHydratedInfos? because they are not very necessary, just use zustand`set` and zustand`useConcentrated.setState()` is enough
const useConcentrated = create<ConcentratedStore>((set, get) => ({
  directionReversed: false,
  tabReversed: false,
  apiAmmPools: [],
  sdkParsedAmmPools: [],
  hydratedAmmPools: [],

  coin1: undefined,

  coin2: undefined,

  focusSide: 'coin1',

  isRemoveDialogOpen: false,
  isSearchAmmDialogOpen: false,
  removeAmount: '',

  refreshCount: 0,
  refreshConcentrated: () => {
    // will auto refresh wallet

    // refresh sdk parsed
    set((s) => ({
      refreshCount: s.refreshCount + 1
    }))
  }
}))

export default useConcentrated
