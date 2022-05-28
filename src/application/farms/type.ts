import BN from 'bn.js'

import {
  CurrencyAmount,
  FarmStateV3,
  FarmStateV5,
  FarmStateV6,
  Percent,
  Price,
  SplAccount,
  Token,
  TokenAmount
} from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { SplToken } from '../token/type'
import { HexAddress } from '@/types/constants'
import { UnionCover } from '@/types/generics'

export interface APIRewardInfo {
  rewardMint: string
  rewardVault: string
  openTime: number
  endTime: number
  perSecond: string | number
  owner?: string
}

export interface FarmPoolJsonInfo {
  id: string
  lpMint: string
  // rewardMints: string[]

  version: number
  programId: string

  authority: string
  lpVault: string
  // rewardVaults: string[]
  lockMint?: HexAddress
  lockVault?: HexAddress
  lockAmount?: string | number
  creator?: HexAddress
  rewardInfos: APIRewardInfo[]
  upcoming: boolean
}

export type FarmPoolsJsonFile = {
  official: FarmPoolJsonInfo[]
  unOfficial?: FarmPoolJsonInfo[]
}

type SDKRewardInfo = {
  rewardMint: PublicKey
  rewardVault: PublicKey
  openTime?: number
  endTime?: number
  perSecond: string | number
  owner?: PublicKey
}

type SdkParsedFarmInfoBase = {
  jsonInfo: FarmPoolJsonInfo
  id: PublicKey
  lpMint: PublicKey
  programId: PublicKey
  authority: PublicKey
  lpVault: SplAccount
  rewardInfos: SDKRewardInfo[]
  /** only when user have deposited and connected wallet */
  ledger?: {
    id: PublicKey
    owner: PublicKey
    state: BN
    deposited: BN
    rewardDebts: BN[]
  }
  /** only when user have deposited and connected wallet */
  wrapped?: {
    pendingRewards: BN[]
  }
}

export type SdkParsedFarmInfo = UnionCover<
  FarmPoolJsonInfo,
  SdkParsedFarmInfoBase &
    ({ version: 6; state: FarmStateV6 } | { version: 3; state: FarmStateV3 } | { version: 5; state: FarmStateV5 })
>

export type HydratedRewardInfo = {
  canBeRewarded: boolean
  apr: Percent | undefined // farm's rewards apr
  token: SplToken | undefined
  /** only when user have deposited and connected wallet */
  pendingReward: TokenAmount | undefined
} & SDKRewardInfo

/** computed by other info  */

export type HydratedFarmInfo = SdkParsedFarmInfo & {
  lp: SplToken | Token | /* staking pool */ undefined
  lpPrice: Price | undefined

  base: SplToken | undefined
  quote: SplToken | undefined
  name: string

  ammId: string | undefined

  isDualFusionPool: boolean
  isNormalFusionPool: boolean
  isClosedPool: boolean
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
  rewards: HydratedRewardInfo[]
  userStakedLpAmount: TokenAmount | undefined
  stakedLpAmount: TokenAmount | undefined
}

export type CustomFarmIdsFile = {
  upcomingFarmIds: FarmPoolJsonInfo['id'][]
}
