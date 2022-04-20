import BN from 'bn.js'

import {
  DateInfo,
  HexAddress,
  LinkAddress,
  Numberish,
  PercentString,
  SrcAddress,
  StringNumber
} from '@/types/constants'

import { SplToken, TokenAmount } from '../token/type'
import { IdoLedgerLayoutV3, IdoPoolBaseInfo, IdoStateLayoutV3, SnapshotStateLayoutV1 } from './sdk'
import { Price } from '@raydium-io/raydium-sdk'

export type BackendApiIdoListItem = {
  id: HexAddress
  projectName: string
  projectPosters: LinkAddress
  projectDetailLink: LinkAddress
  baseMint: HexAddress
  baseVault: HexAddress
  baseSymbol: string
  baseDecimals: number
  baseIcon: LinkAddress
  quoteMint: HexAddress
  quoteVault: HexAddress
  quoteSymbol: string
  quoteDecimals: number
  quoteIcon: LinkAddress
  startTime: number // timestamp (milliseconds)
  endTime: number // timestamp (milliseconds)
  startWithdrawTime: number // timestamp (milliseconds)
  withdrawTimeQuote: number // timestamp (milliseconds)
  stakeTimeEnd: number // timestamp (milliseconds)
  price: number // real price
  raise: number // raise token amount
  maxWinLotteries: number
  raisedLotteries: number
  isWinning: number
  version: 3 // currently only 3, V2 do not support old ido
  snapshotVersion: 1 // currently only 1
  programId: HexAddress
  authority: HexAddress
  snapshotProgramId: HexAddress
  seedId: HexAddress
}

export type BackendApiIdoProjectDetails = {
  projectDetails: string // markdown string
  projectDocs: {
    [docName: string]: LinkAddress
  }
  projectSocials: {
    [socialNames: string]: LinkAddress
  }
}

/** RawIdoInfo + online data */
export interface SdkIdoInfo extends BackendApiIdoListItem {
  base?: SplToken
  quote?: SplToken
  state?: IdoStateLayoutV3
  ledger?: IdoLedgerLayoutV3
  snapshot?: SnapshotStateLayoutV1
}

/**
 * this is the  idoInfo with some calculated result
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
//TODO: hydratedInfo has property sdkParsedInfo
export interface HydratedIdoInfo extends SdkIdoInfo, BackendApiIdoListItem, Partial<BackendApiIdoProjectDetails> {
  // privously is
  isUpcoming: boolean
  isOpen: boolean
  isClosed: boolean
  canWithdrawBase: boolean

  filled?: PercentString
  totalRaise?: TokenAmount

  /* coin init price when market open */
  coinPrice?: Price

  /* how much usdc each ticket */
  ticketPrice?: TokenAmount

  depositedTicketCount?: number

  /** only have connection */
  isEligible?: boolean

  /** only have connection */
  userEligibleTicketAmount?: BN

  claimableQuote?: TokenAmount
  winningTickets?: TicketInfo[]
  userAllocation?: Numberish
  depositedTickets?: TicketInfo[]

  winningTicketsTailNumber?: {
    tickets: TicketTailNumberInfo[]
    isWinning: /* not roll */ 0 | /* not win */ 1 | /* is win */ 2 | /* all win */ 3
  }
}

export type IdoPoolInfoAccess = 'RAY'
export type TicketInfo = { no: number; isWinning?: boolean }
export type TicketTailNumberInfo = {
  no: number | string
  isPartial?: boolean
}
