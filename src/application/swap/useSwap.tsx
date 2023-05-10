import { CurrencyAmount, Price, ReturnTypeGetAllRouteComputeAmountOut } from '@raydium-io/raydium-sdk'
import { create } from 'zustand'

import { Numberish } from '@/types/constants'

import { BestResultStartTimeInfo } from '../ammV3PoolInfoAndLiquidity/type'
import { SplToken } from '../token/type'

export type SwapStore = {
  directionReversed: boolean // determine pairSide  swap make this to be true

  // too tedius
  // /** start with `query` means temp info (may be it will be abandon by data parse)*/
  // queryCoin1Mint?: string
  // queryCoin2Mint?: string
  // queryAmmId?: string

  coin1?: SplToken
  coin2?: SplToken
  coin1Amount?: Numberish // may with fee and slippage
  coin2Amount?: Numberish // may with fee and slippage
  hasUISwrapped?: boolean // if user swap coin1 and coin2, this will be true
  isCoin1CalculateTarget: boolean // while coin1 is calculating to a new token
  isCoin2CalculateTarget: boolean // while coin2 is calculating to a new token

  focusSide: 'coin1' | 'coin2' // make swap fixed (userInput may change this)

  /** only exist when maxSpent is undefined */
  minReceived?: Numberish // min received amount

  /** only exist when minReceived is undefined */
  maxSpent?: Numberish // max received amount

  /** unit: % */
  priceImpact?: Numberish
  executionPrice?: Price | null
  currentPrice?: Price | null // return by SDK, but don't know when to use it
  // routes?: RouteInfo[] // disappear when sdk > ammV3

  /** from SDK,  */
  calcResult?: ReturnTypeGetAllRouteComputeAmountOut
  selectedCalcResult?: ReturnTypeGetAllRouteComputeAmountOut[number]
  selectedCalcResultPoolStartTimes?: BestResultStartTimeInfo[]
  canFindPools?: boolean // NOTE: if no amount input, pools not ready and pools not found will all return empty array. so have to use a flag to handle this case
  isInsufficientLiquidity?: boolean // NOTE: a special error type
  preflightCalcResult?: ReturnTypeGetAllRouteComputeAmountOut // NOTE: just chech whether can swap
  // swap amount calculating may cost long time
  isCalculating?: boolean

  routeType?: RouteType
  fee?: CurrencyAmount[] // by SDK
  swapable?: boolean
  scrollToInputBox: () => void
  klineData: {
    [marketId: string]: { priceData: number[]; updateTime: number }
  }

  // just for trigger refresh
  refreshCount: number
  refreshSwap: () => void
}
export type RouteType = 'amm' | 'route' | undefined // SDK haven't export this type, and can't find by extract existing type. so have to write manually in UI code.

export const useSwap = create<SwapStore>((set, get) => ({
  calcResult: undefined,
  directionReversed: false,
  isCoin1CalculateTarget: false,
  isCoin2CalculateTarget: false,

  focusSide: 'coin1',

  priceImpact: 0.09,

  scrollToInputBox: () => {},
  klineData: {},

  refreshCount: 0,
  refreshSwap: () => {
    set({
      refreshCount: get().refreshCount + 1
    })
  }
}))
