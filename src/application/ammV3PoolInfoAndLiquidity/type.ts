import { ClmmPoolInfo, ApiPoolInfoItem, PoolType } from '@raydium-io/raydium-sdk'

export type BestResultStartTimeInfo = {
  ammId: string
  startTime: number
  poolType: PoolType
  poolInfo: BestResultStartTimePoolInfo
}

export type BestResultStartTimePoolInfo = {
  rawInfo: ClmmPoolInfo | ApiPoolInfoItem
  ammId: string
  quoteMint: string
  baseMint: string
}
