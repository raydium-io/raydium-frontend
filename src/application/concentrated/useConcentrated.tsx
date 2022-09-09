import { LiquidityPoolJsonInfo as ConcentratedJsonInfo, PublicKeyish } from '@raydium-io/raydium-sdk'
import create from 'zustand'

import toPubString from '@/functions/format/toMintString'
import { gte } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'
import { AmmPoolInfo, ApiAmmPoolInfo, ApiAmmPoint } from 'test-r-sdk'
import { toDataMint, WSOLMint } from '../token/quantumSOL'
import { SplToken } from '../token/type'
import {
  ETHMint,
  mSOLMint,
  PAIMint,
  RAYMint,
  stSOLMint,
  USDCMint,
  USDHMint,
  USDTMint
} from '../token/wellknownToken.config'
import sdkParseJsonConcentratedInfo from './sdkParseJsonConcentratedInfo'
import { HydratedConcentratedInfo, SDKParsedConcentratedInfo } from './type'
import { Numberish } from '@/types/constants'
import BN from 'bn.js'

type SDKParsedAmmPool = {
  state: AmmPoolInfo
}

type SDKParsedAmmPoolsMap = Record<string, SDKParsedAmmPool>

export type ConcentratedStore = {
  apiAmmPools: ApiAmmPoolInfo[]
  sdkParsedAmmPools: SDKParsedAmmPoolsMap

  selectableAmmPools?: SDKParsedAmmPool[]

  currentAmmPool?: SDKParsedAmmPool
  /** user need manually select one */
  chartPoints?: ApiAmmPoint[]
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

  isRemoveDialogOpen: boolean
  isSearchAmmDialogOpen: boolean
  removeAmount: string

  // just for trigger refresh
  refreshCount: number
  refreshConcentrated: () => void
}

//* FAQ: why no setJsonInfos, setSdkParsedInfos and setHydratedInfos? because they are not very necessary, just use zustand`set` and zustand`useConcentrated.setState()` is enough
const useConcentrated = create<ConcentratedStore>((set, get) => ({
  apiAmmPools: [],
  sdkParsedAmmPools: {},

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
