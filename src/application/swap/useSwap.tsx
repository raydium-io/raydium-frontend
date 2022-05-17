import { CurrencyAmount, Price, RouteInfo, RouteType } from '@raydium-io/raydium-sdk'
import { Signer, Transaction } from '@solana/web3.js'

import create from 'zustand'

import { Numberish } from '@/types/constants'

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

  focusSide: 'coin1' | 'coin2' // make swap fixed (userInput may change this)

  /** only exist when maxSpent is undefined */
  minReceived?: Numberish // min received amount

  /** only exist when minReceived is undefined */
  maxSpent?: Numberish // max received amount

  /** unit: % */
  priceImpact?: Numberish
  executionPrice?: Price | null
  currentPrice?: Price | null // return by SDK, but don't know when to use it
  routes?: RouteInfo[]
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
  directionReversed: false,

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

export interface UnsignedTransactionAndSigners {
  transaction: Transaction
  signers: Signer[]
}
