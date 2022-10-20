import { PublicKey } from '@solana/web3.js'

import { findProgramAddress, Logger, PublicKeyish, validateAndParsePublicKey } from '@raydium-io/raydium-sdk'

import { SNAPSHOT_PROGRAMID_TO_VERSION, SNAPSHOT_VERSION_TO_PROGRAMID } from './id'
import { SNAPSHOT_VERSION_TO_STATE_LAYOUT } from './layout'

const logger = new Logger('Snapshot')

export class Snapshot {
  static getProgramId(version: number) {
    const programId = SNAPSHOT_VERSION_TO_PROGRAMID[version]
    if (!programId) {
      return logger.throwArgumentError('invalid version', 'version', version)
    }

    return new PublicKey(programId)
  }

  static getVersion(programId: PublicKeyish) {
    const programIdPubKey = validateAndParsePublicKey(programId)
    const programIdString = programIdPubKey.toBase58()

    const version = SNAPSHOT_PROGRAMID_TO_VERSION[programIdString]
    if (!version) {
      return logger.throwArgumentError('invalid program id', 'programId', programIdString)
    }

    return version
  }

  static getStateLayout(version: number) {
    const STATE_LAYOUT = SNAPSHOT_VERSION_TO_STATE_LAYOUT[version]

    if (!STATE_LAYOUT) {
      return logger.throwArgumentError('invalid version', 'version', version)
    }

    return STATE_LAYOUT
  }

  static getLayouts(params: { version?: number; programId?: PublicKeyish }) {
    let version = 0

    if (params.programId) {
      version = this.getVersion(params.programId)
    }
    if (params.version) {
      version = params.version
    }

    return { state: this.getStateLayout(version) }
  }

  static async getAssociatedSnapshotAddress({
    programId,
    seedId,
    owner
  }: {
    programId: PublicKey
    seedId: PublicKey
    owner: PublicKey
  }) {
    const { publicKey } = await findProgramAddress(
      [seedId.toBuffer(), owner.toBuffer(), programId.toBuffer()],
      programId
    )
    return publicKey
  }
}
