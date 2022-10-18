import { LiquidityAssociatedPoolKeysV4 } from 'test-r-sdk'

import { HexAddress } from '@/types/constants'

export type ProcessingCreatedPool = {
  ammId: HexAddress
  marketId: HexAddress
  baseMint: HexAddress
  baseDecimals: number
  quoteMint: HexAddress
  quoteDecimals: number
  lpMint: string
}
export interface CreatedPoolRecord extends ProcessingCreatedPool {
  timestamp: number
  walletOwner: HexAddress
}
export type CreatedPoolRecordLocalStorage = Record<HexAddress, CreatedPoolRecord[]> // HexAddress is wallet
