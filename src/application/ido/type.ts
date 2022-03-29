import BN from 'bn.js'

import { DateInfo, HexAddress, LinkAddress, PercentString, SrcAddress, StringNumber } from '@/types/constants'

import { SplToken, TokenAmount } from '../token/type'
import { IdoLedgerLayoutV3, IdoPoolBaseInfo, IdoStateLayoutV3, SnapshotStateLayoutV1 } from './sdk'
import { Price } from '@raydium-io/raydium-sdk'

interface IdoBannerInfoItem {
  text?: string
  detailsLink?: LinkAddress
  previewImg: SrcAddress
  previewLink?: LinkAddress
}
export type IdoBannerInformations = IdoBannerInfoItem[]

export interface RawIdoListJson {
  name: string
  timestamp: DateInfo
  version: {
    major: 1 | 0
    minor: 1 | 0
    patch: 1 | 0
  }
  official: RawIdoInfo[]
  bannerInfo: IdoBannerInformations
}

/**
 * from ido-list.json
 */
export interface RawIdoInfo extends IdoPoolBaseInfo {
  programId: HexAddress
  snapshotProgramId: HexAddress
  authority: HexAddress
  seedId: HexAddress
  baseVault: HexAddress
  quoteVault: HexAddress
  baseMint: HexAddress
  quoteMint: HexAddress
  onlyDev?: boolean // for develop easily (may be test ido pool)
  project: {
    projectName: string
    idoThumbnail: SrcAddress
    projectWebsiteLink: LinkAddress
    detailDoc: LinkAddress
    detailText: string
    alertDetails?: string
    socials: {
      [socialName: string]: LinkAddress
    }
  }
}

export type IdoCoinDetail = RawIdoInfo['project']

/** RawIdoInfo + online data */
export interface SdkParsedIdoInfo extends RawIdoInfo {
  base: (SplToken & { iconSrc: string }) | undefined
  quote: (SplToken & { iconSrc: string }) | undefined
  isRayPool: boolean
  isPrivate: boolean

  state: IdoStateLayoutV3
  ledger?: IdoLedgerLayoutV3
  snapshot?: SnapshotStateLayoutV1
}

/**
 * this is the  idoInfo with some calculated result
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface HydratedIdoInfo extends SdkParsedIdoInfo {
  status: IdoPoolInfoStatus // TEMP: should auto added by {@link hydrateIdoPoolInfo}
  filled: PercentString
  totalRaise: TokenAmount | undefined

  /* coin init price when market open */
  coinPrice: Price | undefined

  /* how much usdc each ticket */
  ticketPrice: TokenAmount | undefined

  depositedTicketCount: number

  /** only have connection */
  isEligible: boolean

  /** only have connection */
  userEligibleTicketAmount?: BN

  claimableQuote?: TokenAmount
  ledger?: (SdkParsedIdoInfo['ledger'] | undefined) & {
    winningTickets?: TicketInfo[]
    userAllocation?: StringNumber
    depositedTickets?: TicketInfo[]
  }
  state: SdkParsedIdoInfo['state'] & {
    winningTicketsTailNumber: {
      tickets: TicketTailNumberInfo[]
      isWinning: /* not roll */ 0 | /* not win */ 1 | /* is win */ 2 | /* all win */ 3
    }
  }
}

export type IdoPoolInfoStatus = 'open' | 'upcoming' | 'closed'
export type IdoPoolInfoAccess = 'RAY'
export type TicketInfo = { no: number }
export type TicketTailNumberInfo = {
  no: number | string
  isPartial?: boolean
}
