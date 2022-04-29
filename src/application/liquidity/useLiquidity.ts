import { LiquidityPoolJsonInfo as LiquidityJsonInfo, PublicKeyish } from '@raydium-io/raydium-sdk'

import create from 'zustand'

import toPubString from '@/functions/format/toMintString'
import { gte } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'

import { SplToken } from '../token/type'
import { toDataMint, WSOLMint } from '../token/utils/quantumSOL'
import {
  ETHMint,
  mSOLMint,
  PAIMint,
  RAYMint,
  stSOLMint,
  USDCMint,
  USDHMint,
  USDTMint
} from '../token/utils/wellknownToken.config'

import { HydratedLiquidityInfo, SDKParsedLiquidityInfo } from './type'
import sdkParseJsonLiquidityInfo from './utils/sdkParseJsonLiquidityInfo'

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
   */
  hydratedInfos: HydratedLiquidityInfo[] // auto parse info in {@link useLiquidityAuto}
  findLiquidityInfoByTokenMint: (
    coin1Mint: PublicKeyish | undefined,
    coin2Mint: PublicKeyish | undefined
  ) => Promise<{
    availables: LiquidityJsonInfo[]
    best: LiquidityJsonInfo | undefined
    routeRelated: LiquidityJsonInfo[]
  }>

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
  findLiquidityInfoByTokenMint: async (
    coin1Mintlike: PublicKeyish | undefined,
    coin2Mintlike: PublicKeyish | undefined
  ) => {
    const coin1Mint = toDataMint(coin1Mintlike)
    const coin2Mint = toDataMint(coin2Mintlike)

    if (!coin1Mint || !coin2Mint) return { availables: [], best: undefined, routeRelated: [] }
    const mint1 = String(coin1Mint)
    const mint2 = String(coin2Mint)

    const availables = get().jsonInfos.filter(
      (info) =>
        (info.baseMint === mint1 && info.quoteMint === mint2) || (info.baseMint === mint2 && info.quoteMint === mint1)
    )

    /** swap's route transaction middle token  */
    const routeMiddleMints = [
      USDCMint,
      RAYMint,
      WSOLMint,
      mSOLMint,
      PAIMint,
      stSOLMint,
      USDHMint,
      USDTMint,
      ETHMint
    ].map(toPubString)
    const candidateTokenMints = routeMiddleMints.concat([mint1, mint2])
    const onlyRouteMints = routeMiddleMints.filter((routeMint) => ![mint1, mint2].includes(routeMint))
    const routeRelated = get().jsonInfos.filter((info) => {
      const isCandidate = candidateTokenMints.includes(info.baseMint) && candidateTokenMints.includes(info.quoteMint)
      const onlyInRoute = onlyRouteMints.includes(info.baseMint) && onlyRouteMints.includes(info.quoteMint)
      return isCandidate && !onlyInRoute
    })

    const best = await (async () => {
      if (availables.length === 0) return undefined
      if (availables.length === 1) return availables[0]
      const officials = availables.filter((info) => get().officialIds.has(info.id))
      if (officials.length === 1) return officials[0]
      // may be all official pools or all permissionless pools
      const sameLevels = await sdkParseJsonLiquidityInfo(officials.length ? officials : availables)
      // have most lp Supply
      const largest = sameLevels.reduce((acc, curr) => {
        const accIsStable = acc.version === 5
        const currIsStable = curr.version === 5
        if (accIsStable && !currIsStable) return acc
        if (!accIsStable && currIsStable) return curr
        return gte(div(acc.lpSupply, 10 ** acc.lpDecimals), div(curr.lpSupply, 10 ** curr.lpDecimals)) ? acc : curr
      })
      return largest.jsonInfo
    })()

    return { availables, best, routeRelated }
  },

  /********************** exhibition panel **********************/
  userExhibitionLiquidityIds: [],

  /********************** main panel (coin pair panel) **********************/
  currentJsonInfo: undefined,
  currentSdkParsedInfo: undefined, // auto parse info in {@link useLiquidityAuto}
  currentHydratedInfo: undefined, // auto parse info in {@link useLiquidityAuto}

  ammId: '',

  coin1: undefined,

  coin2: undefined,

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
