import { AmmV3PoolInfo, LiquidityPoolJsonInfo, PoolType } from '@raydium-io/raydium-sdk'

export type BestResultStartTimeInfo = {
  ammId: string
  startTime: number
  poolType: PoolType
  poolInfo: BestResultStartTimePoolInfo
}

export type BestResultStartTimePoolInfo = {
  rawInfo: AmmV3PoolInfo | LiquidityPoolJsonInfo
  ammId: string
  quoteMint: string
  baseMint: string
}
