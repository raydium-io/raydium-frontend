import { HexAddress } from '@/types/constants'

export type IdoVersion = 3

export type SnapshotVersion = 1

export interface IdoPoolBaseInfo {
  readonly id: HexAddress
  readonly version: IdoVersion
  readonly snapshotVersion: SnapshotVersion
}

/* ================= json file ================= */
export interface JsonFileMetaData {
  readonly name: string
  readonly timestamp: string
  readonly version: {
    major: number
    minor: number
    patch: number
  }
}

export interface IdoPoolJsonInfo {
  // same as IdoPoolKeys
  readonly id: string

  readonly version: IdoVersion
  readonly programId: string

  readonly snapshotVersion: SnapshotVersion
  readonly snapshotProgramId: string

  readonly authority: string
  readonly seedId: string
  readonly baseVault: string
  readonly quoteVault: string
  // mint
  readonly baseMint: string
  readonly quoteMint: string
}

export interface IdoPoolsJson extends JsonFileMetaData {
  readonly official: IdoPoolJsonInfo[]
}
