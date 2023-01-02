import { SHOW_INFO, TokenAmount } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import { SplToken } from '../token/type'

export interface HydratedCompensationInfoItem {
  rawInfo: SHOW_INFO
  poolId: PublicKey
  ammId: PublicKey
  poolName: string
  ownerAccountId: PublicKey
  snapshotLpAmount?: TokenAmount
  openTime: Date
  endTime: Date
  canClaim: boolean
  tokenInfo: (
    | {
        // mintAddress: PublicKey
        // mintVault: PublicKey
        // mintDecimals: number
        token: SplToken
        perLpLoss: TokenAmount
        ownerAllLossAmount: TokenAmount
        debtAmount: TokenAmount
      }
    | undefined
  )[] // base quote [negative money]
}
