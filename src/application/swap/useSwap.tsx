import { CurrencyAmount, Price, RouteInfo, RouteType, TradeV2 } from 'test-r-sdk'

import create from 'zustand'

import { Numberish } from '@/types/constants'

import { SplToken } from '../token/type'
export type ComputeAmountOutLayout = Awaited<ReturnType<typeof TradeV2['getAllRouteComputeAmountOut']>>
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
  isCoin1Calculating: boolean // while coin1 is calculating to a new token
  isCoin2Calculating: boolean // while coin2 is calculating to a new token

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
  calcResult?: ComputeAmountOutLayout
  canFindPools?: boolean // NOTE: if no amount input, pools not ready and pools not found will all return empty array. so have to use a flag to handle this case
  preflightCalcResult?: ComputeAmountOutLayout // NOTE: just chech whether can swap
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

export const useSwap = create<SwapStore>((set, get) => ({
  calcResult: undefined,
  directionReversed: false,
  isCoin1Calculating: false,
  isCoin2Calculating: false,

  focusSide: 'coin1',

  priceImpact: 0.09,

  scrollToInputBox: () => {},
  klineData: {},

  refreshCount: 0,
  refreshSwap: () => {
    set((s) => ({
      refreshCount: s.refreshCount + 1
    }))
  }
}))
