import BN from 'bn.js'

import { CurrencyAmount, FarmState, Percent, Price, SplAccount, Token, TokenAmount } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { SplToken } from '../token/type'

export interface FarmPoolJsonInfo {
  readonly id: string
  readonly lpMint: string
  readonly rewardMints: string[]

  readonly version: number
  readonly programId: string

  readonly authority: string
  readonly lpVault: string
  readonly rewardVaults: string[]
  readonly upcoming: boolean
}
export type FarmPoolsJsonFile = {
  official: FarmPoolJsonInfo[]
}

export interface SdkParsedFarmInfo {
  jsonInfo: FarmPoolJsonInfo

  id: PublicKey
  lpMint: PublicKey
  rewardMints: PublicKey[]
  version: number
  programId: PublicKey
  authority: PublicKey
  lpVault: SplAccount
  state: FarmState
  rewardVaults: PublicKey[]

  /** only when user have deposited and connected wallet */
  ledger?: { id: PublicKey; owner: PublicKey; state: BN; deposited: BN; rewardDebts: BN[] }
  /** only when user have deposited and connected wallet */
  wrapped?: { pendingRewards: BN[] }
}
/** computed by other info  */

export interface HydratedFarmInfo extends SdkParsedFarmInfo {
  lp: SplToken | Token | /* staking pool */ undefined
  lpPrice: Price | undefined

  base: SplToken | undefined
  quote: SplToken | undefined
  name: string

  ammId: string | undefined

  isDualFusionPool: boolean
  isNormalFusionPool: boolean
  isClosedPool: boolean
  isRaydiumPool: boolean
  isStakePool: boolean
  isUpcomingPool: boolean
  isStablePool: boolean
  /** new pool shoud sort in highest  */
  isNewPool: boolean

  totalApr: Percent | undefined
  tvl: CurrencyAmount | undefined
  userHasStaked: boolean
  /** undefined means couldn't find this token by known tokenList */
  raydiumFeeRpr: Percent | undefined // raydium fee for each transaction
  rewards: {
    canBeRewarded: boolean
    apr: Percent | undefined // farm's rewards apr
    token: SplToken | undefined
    /** only when user have deposited and connected wallet */
    pendingReward: TokenAmount | undefined
  }[]
  userStakedLpAmount: TokenAmount | undefined
  stakedLpAmount: TokenAmount | undefined
}

export type CustomFarmIdsFile = {
  upcomingFarmIds: FarmPoolJsonInfo['id'][]
}
