import { PublicKey } from '@solana/web3.js'

import BN from 'bn.js'
import {
  CurrencyAmount,
  FarmFetchMultipleInfoReturn,
  FarmStateV3,
  FarmStateV5,
  FarmStateV6,
  Percent,
  Price,
  SplAccount,
  Token,
  TokenAmount
} from '@raydium-io/raydium-sdk'

import { HexAddress } from '@/types/constants'
import { UnionCover } from '@/types/generics'

import { SplToken } from '../token/type'

export interface APIRewardInfo {
  rewardMint: string
  rewardVault: string
  rewardOpenTime: number
  rewardEndTime: number
  rewardPerSecond: string | number
  rewardSender?: string
  rewardType: 'Standard SPL' | 'Option tokens'
}

export interface FarmPoolJsonInfo {
  id: string
  lpMint: string
  lpVault: string

  baseMint: string
  quoteMint: string
  name: string

  version: number
  programId: string

  authority: string
  creator?: HexAddress
  rewardInfos: APIRewardInfo[]
  upcoming: boolean

  rewardPeriodMin?: number // v6 '7-90 days's     7 * 24 * 60 * 60 seconds
  rewardPeriodMax?: number // v6 '7-90 days's     90 * 24 * 60 * 60 seconds
  rewardPeriodExtend?: number // v6 'end before 72h's    72 * 60 * 60 seconds

  local: boolean // only if it is in localstorage(create just by user)
  category: 'stake' | 'raydium' | 'fusion' | 'ecosystem' // add by UI for unify the interface
}

export type FarmPoolsJsonFile = {
  name: string
  version: unknown
  stake: Omit<FarmPoolJsonInfo, 'category'>[]
  raydium: Omit<FarmPoolJsonInfo, 'category'>[]
  fusion: Omit<FarmPoolJsonInfo, 'category'>[]
  ecosystem: Omit<FarmPoolJsonInfo, 'category'>[]
}

type FarmFetchMultipleInfoReturnItem = FarmFetchMultipleInfoReturn extends Record<string, infer F> ? F : never

type SdkParsedFarmInfoBase = {
  jsonInfo: FarmPoolJsonInfo
  sdkInfo: FarmFetchMultipleInfoReturnItem
  id: PublicKey
  lpMint: PublicKey
  programId: PublicKey
  authority: PublicKey
  lpVault: SplAccount
  rewardInfos: APIRewardInfo[]
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
  userHavedReward: boolean
  apr: Percent | undefined // farm's rewards apr
  token: SplToken | undefined
  /** only when user have deposited and connected wallet */
  userPendingReward: TokenAmount | undefined
  version: 3 | 5 | 6
  rewardVault: PublicKey
  openTime?: Date // v6
  endTime?: Date // v6

  isOptionToken?: boolean // v6
  isRewarding?: boolean // v6
  isRewardBeforeStart?: boolean // v6
  isRewardEnded?: boolean // v6
  isRwardingBeforeEnd72h?: boolean // v6

  rewardPeriodMin?: number // v6 '7-90 days's     7 * 24 * 60 * 60 seconds
  rewardPeriodMax?: number // v6 '7-90 days's     90 * 24 * 60 * 60 seconds
  rewardPeriodExtend?: number // v6 'end before 72h's    72 * 60 * 60 seconds

  claimableRewards?: TokenAmount // v6
  owner?: string // v6
  perSecond?: string | number // v6
}

/** computed by other info  */

export type HydratedFarmInfo = SdkParsedFarmInfo & {
  lp: SplToken | Token | /* staking pool */ undefined
  lpPrice: Price | undefined

  base: SplToken | undefined
  quote: SplToken | undefined
  name: string

  ammId: string | undefined

  /** only for v3/v5 */
  isDualFusionPool: boolean
  isNormalFusionPool: boolean
  isClosedPool: boolean
  isStakePool: boolean
  isUpcomingPool: boolean
  isStablePool: boolean
  /** new pool shoud sort in highest  */
  isNewPool: boolean

  /** 7d */
  totalApr7d: Percent | undefined
  /** 7d; undefined means couldn't find this token by known tokenList */
  raydiumFeeApr7d: Percent | undefined // raydium fee for each transaction

  totalApr30d: Percent | undefined
  /** undefined means couldn't find this token by known tokenList */
  raydiumFeeApr30d: Percent | undefined // raydium fee for each transaction

  totalApr24h: Percent | undefined
  /** undefined means couldn't find this token by known tokenList */
  raydiumFeeApr24h: Percent | undefined // raydium fee for each transaction

  tvl: CurrencyAmount | undefined
  userHasStaked: boolean
  rewards: HydratedRewardInfo[]
  userStakedLpAmount: TokenAmount | undefined
  stakedLpAmount: TokenAmount | undefined
}

export type CustomFarmIdsFile = {
  upcomingFarmIds: FarmPoolJsonInfo['id'][]
}
