import { IdoVersion, SnapshotVersion } from './type'

/* ================= ido ================= */
// lottery
export const IDO_PROGRAM_ID_V3 = 'DropEU8AvevN3UrXWXTMuz3rqnMczQVNjq3kcSdW2SQi'

// ido program id => ido version
export const IDO_PROGRAMID_TO_VERSION: {
  [key: string]: IdoVersion
} = {
  [IDO_PROGRAM_ID_V3]: 3
}

// ido version => ido program id
export const IDO_VERSION_TO_PROGRAMID: { [key in IdoVersion]?: string } & {
  [K: number]: string
} = {
  3: IDO_PROGRAM_ID_V3
}

/* ================= snapshot ================= */
export const IDO_SNAPSHOT_PROGRAM_ID_V1 = '4kCccBVdQpsonm2jL2TRV1noMdarsWR2mhwwkxUTqW3W'

// snapshot program id => snapshot version
export const SNAPSHOT_PROGRAMID_TO_VERSION: {
  [key: string]: SnapshotVersion
} = {
  [IDO_SNAPSHOT_PROGRAM_ID_V1]: 1
}

// snapshot version => snapshot program id
export const SNAPSHOT_VERSION_TO_PROGRAMID: { [key in SnapshotVersion]?: string } & {
  [K: number]: string
} = {
  1: IDO_SNAPSHOT_PROGRAM_ID_V1
}
