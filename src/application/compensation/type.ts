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
  project?: SHOW_INFO['project']
  openTime: Date
  endTime: Date
  canClaim: boolean
  canClaimErrorType: SHOW_INFO['canClaimErrorType']
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
