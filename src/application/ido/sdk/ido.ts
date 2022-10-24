import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js'

import {
  AccountMeta,
  AccountMetaReadonly,
  BigNumberish,
  findProgramAddress,
  GetMultipleAccountsInfoConfig,
  getMultipleAccountsInfoWithCustomFlags,
  Logger,
  parseBigNumberish,
  PublicKeyish,
  struct,
  SYSTEM_PROGRAM_ID,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  Token,
  TOKEN_PROGRAM_ID,
  TokenAmount,
  u64,
  u8,
  validateAndParsePublicKey
} from 'test-r-sdk'

import { currentIsAfter, currentIsBefore } from '@/functions/date/judges'
import toPubString from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'

import { IDO_PROGRAMID_TO_VERSION, IDO_VERSION_TO_PROGRAMID } from './id'
import {
  IDO_VERSION_TO_LEDGER_LAYOUT,
  IDO_VERSION_TO_STATE_LAYOUT,
  IdoLedgerLayout,
  IdoStateLayout,
  SnapshotStateLayout
} from './layout'
import { Snapshot } from './snapshot'
import { IdoVersion, SnapshotVersion } from './type'

const logger = new Logger('NFT')

// From JSON
export interface IdoPoolConfig {
  id: PublicKey

  version: IdoVersion
  programId: PublicKey

  snapshotVersion: SnapshotVersion
  snapshotProgramId: PublicKey

  authority: PublicKey
  seedId: PublicKey
  baseVault: PublicKey
  quoteVault: PublicKey
  baseToken: Token
  quoteToken: Token
}

export interface IdoUserKeys {
  baseTokenAccount: PublicKey
  quoteTokenAccount: PublicKey
  ledgerAccount: PublicKey
  snapshotAccount: PublicKey
  owner: PublicKey
}

export interface IdoInfo {
  state?: IdoStateLayout
  ledger?: IdoLedgerLayout
  snapshot?: SnapshotStateLayout
}

export interface IdoLoadParams {
  connection: Connection
  poolConfig: IdoPoolConfig
  owner: PublicKey
  info?: IdoInfo
  config?: GetMultipleAccountsInfoConfig
}

/* ================= purchase ================= */
export interface IdoPurchaseInstructionParams {
  poolConfig: IdoPoolConfig
  userKeys: IdoUserKeys
  amount: BigNumberish
}

/* ================= claim ================= */
export interface IdoClaimInstructionParams {
  poolConfig: IdoPoolConfig
  userKeys: IdoUserKeys
  side: 'base' | 'quote'
}

export interface GetIdoInfoParams {
  connection: Connection
  poolConfig: IdoPoolConfig
  // Why use owner not IdoUserKeys?
  // We only support Associated/ProgramAddress in THIS specific application
  // then there is no need to pass in
  // But it can't work in SDK
  owner?: PublicKey

  config?: GetMultipleAccountsInfoConfig
}

export interface GetIdoMultipleInfoParams extends Omit<GetIdoInfoParams, 'poolConfig'> {
  noNeedState?: boolean
  poolsConfig: IdoPoolConfig[]
}

export class Ido {
  constructor(public readonly poolConfig: IdoPoolConfig, public info: IdoInfo) {}

  async load(params: IdoLoadParams) {
    const { connection, poolConfig, owner, config } = params
    let { info } = params

    if (!info) {
      info = await Ido.getInfo({ connection, poolConfig, owner, config })
    }

    return new Ido(poolConfig, info)
  }

  // TODO need set connection/owner info IDO instance
  // async updateInfo() {
  //   const info = await Ido.getInfo()
  //   this.info = info
  // }

  /* ================= user info ================= */
  get maxTickets() {
    if (!this.info.snapshot) return 0

    // TODO toNumber 53 bits?
    return this.info.snapshot.maxLotteries.toNumber()
  }

  get purchasedTickets() {
    if (!this.info.ledger) return []

    // TODO toNumber 53 bits?
    const begin = this.info.ledger.startNumber.toNumber()
    const end = this.info.ledger.endNumber.toNumber()
    return Array.from({ length: end - begin + 1 }, (_, i) => ({ no: begin + i }))
  }

  get allocation() {
    if (!this.info.ledger) return new TokenAmount(this.poolConfig.baseToken, 0)
    // TODO
    // if pool's quote deposited > quote target(baseSupply * perLotteryQuoteAmount)
    // allocation = user's quote deposited / pool's quote deposited * base supply
    // const poolQuoteDeposited = new TokenAmount(this.poolConfig.quoteToken, this.info.state.quoteDeposited)
    // const targetQuote = new TokenAmount()
    // else
    // allocation = user's quote deposited * perLotteryQuoteAmount
  }

  // TODO
  get winningTickets() {
    if (!this.info.ledger) return []
  }

  static getProgramId(version: number) {
    const programId = IDO_VERSION_TO_PROGRAMID[version]
    if (!programId) {
      return logger.throwArgumentError('invalid version', 'version', version)
    }

    return new PublicKey(programId)
  }

  static getVersion(programId: PublicKeyish) {
    const programIdPubKey = validateAndParsePublicKey(programId)
    const programIdString = programIdPubKey.toBase58()

    const version = IDO_PROGRAMID_TO_VERSION[programIdString]
    if (!version) {
      return logger.throwArgumentError('invalid program id', 'programId', programIdString)
    }

    return version
  }

  static getStateLayout(version: number) {
    const STATE_LAYOUT = IDO_VERSION_TO_STATE_LAYOUT[version]

    if (!STATE_LAYOUT) {
      return logger.throwArgumentError('invalid version', 'version', version)
    }

    return STATE_LAYOUT
  }

  static getLedgerLayout(version: number) {
    const LEDGER_LAYOUT = IDO_VERSION_TO_LEDGER_LAYOUT[version]

    if (!LEDGER_LAYOUT) {
      return logger.throwArgumentError('invalid version', 'version', version)
    }

    return LEDGER_LAYOUT
  }

  static getLayouts(params: { version?: number; programId?: PublicKeyish }) {
    let version = 0

    if (params.programId) {
      version = this.getVersion(params.programId)
    }
    if (params.version) {
      version = params.version
    }

    return { state: this.getStateLayout(version), ledger: this.getLedgerLayout(version) }
  }

  static async getAuthority({ programId, poolId }: { programId: PublicKey; poolId: PublicKey }) {
    const { publicKey } = await findProgramAddress([poolId.toBuffer()], programId)
    return publicKey
  }

  static async getAssociatedLedgerAccountAddress({
    programId,
    poolId,
    owner
  }: {
    programId: PublicKey
    poolId: PublicKey
    owner: PublicKey
  }) {
    const { publicKey } = await findProgramAddress(
      [poolId.toBuffer(), owner.toBuffer(), Buffer.from(new Uint8Array(Buffer.from('ido_associated_seed', 'utf-8')))],
      programId
    )
    return publicKey
  }

  /* ================= instructions ================= */
  static async makePurchaseInstruction(params: IdoPurchaseInstructionParams) {
    const { poolConfig, userKeys, amount } = params

    const LAYOUT = struct([u8('instruction'), u64('amount')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 1,
        amount: parseBigNumberish(amount)
      },
      data
    )

    const keys = [
      AccountMetaReadonly(SYSTEM_PROGRAM_ID, false),
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
      AccountMetaReadonly(SYSVAR_RENT_PUBKEY, false),
      AccountMetaReadonly(SYSVAR_CLOCK_PUBKEY, false),
      // ido
      AccountMeta(poolConfig.id, false),
      AccountMetaReadonly(poolConfig.authority, false),
      AccountMeta(poolConfig.quoteVault, false),
      // user
      AccountMeta(userKeys.quoteTokenAccount, false),
      AccountMeta(userKeys.ledgerAccount, false),
      AccountMetaReadonly(userKeys.owner, true),
      // snapshot
      AccountMetaReadonly(userKeys.snapshotAccount, false)
    ]

    return new TransactionInstruction({
      programId: poolConfig.programId,
      keys,
      data
    })
  }

  static makeClaimInstruction(params: IdoClaimInstructionParams) {
    const { poolConfig, userKeys, side } = params

    const tokenAccount = side === 'base' ? userKeys.baseTokenAccount : userKeys.quoteTokenAccount
    const vault = side === 'base' ? poolConfig.baseVault : poolConfig.quoteVault

    const LAYOUT = struct([u8('instruction')])
    const data = Buffer.alloc(LAYOUT.span)
    LAYOUT.encode(
      {
        instruction: 2
      },
      data
    )

    const keys = [
      AccountMetaReadonly(TOKEN_PROGRAM_ID, false),
      AccountMetaReadonly(SYSVAR_CLOCK_PUBKEY, false),
      // ido
      AccountMeta(poolConfig.id, false),
      AccountMetaReadonly(poolConfig.authority, false),
      AccountMeta(vault, false),
      // user
      AccountMeta(tokenAccount, false),
      AccountMeta(userKeys.ledgerAccount, false),
      AccountMetaReadonly(userKeys.owner, true)
    ]

    return new TransactionInstruction({
      programId: poolConfig.programId,
      keys,
      data
    })
  }

  static async getInfo({ connection, poolConfig, owner, config }: GetIdoInfoParams) {
    const publicKeys: {
      pubkey: PublicKey
      version: IdoVersion | SnapshotVersion
      key: 'state' | 'ledger' | 'snapshot'
      poolId: PublicKey
    }[] = []

    publicKeys.push({
      pubkey: poolConfig.id,
      version: poolConfig.version,
      key: 'state',
      poolId: poolConfig.id
    })

    if (owner) {
      publicKeys.push({
        pubkey: await this.getAssociatedLedgerAccountAddress({
          programId: poolConfig.programId,
          poolId: poolConfig.id,
          owner
        }),
        version: poolConfig.version,
        key: 'ledger',
        poolId: poolConfig.id
      })

      publicKeys.push({
        pubkey: await Snapshot.getAssociatedSnapshotAddress({
          programId: poolConfig.snapshotProgramId,
          seedId: poolConfig.seedId,
          owner
        }),
        version: poolConfig.snapshotVersion,
        key: 'snapshot',
        poolId: poolConfig.id
      })
    }

    let info = {}

    const accountsInfo = await getMultipleAccountsInfoWithCustomFlags(connection, publicKeys, config)
    for (const { pubkey, version, key, poolId, accountInfo } of accountsInfo) {
      if (key === 'state') {
        const STATE_LAYOUT = this.getStateLayout(version)
        if (!accountInfo || accountInfo.data.length !== STATE_LAYOUT.span) {
          return logger.throwArgumentError('invalid ido state account info', 'pools.id', pubkey.toBase58())
        }

        info = {
          ...info,
          ...{ state: STATE_LAYOUT.decode(accountInfo.data) }
        }
      } else if (key === 'ledger') {
        const LEDGER_LAYOUT = this.getLedgerLayout(version)
        if (accountInfo && accountInfo.data) {
          if (accountInfo.data.length !== LEDGER_LAYOUT.span) {
            return logger.throwArgumentError('invalid ido ledger account info', 'ledger', pubkey.toBase58())
          }

          info = {
            ...info,
            ...{ ledger: LEDGER_LAYOUT.decode(accountInfo.data) }
          }
        }
      } else if (key === 'snapshot') {
        const SNAPSHOT_STATE_LAYOUT = Snapshot.getStateLayout(version)
        if (accountInfo && accountInfo.data) {
          if (accountInfo.data.length !== SNAPSHOT_STATE_LAYOUT.span) {
            return logger.throwArgumentError('invalid ido snapshot account info', 'snapshot', pubkey.toBase58())
          }

          info = {
            ...info,
            ...{ snapshot: SNAPSHOT_STATE_LAYOUT.decode(accountInfo.data) }
          }
        }
      }
    }

    return info as IdoInfo
  }

  /** return {@link IdoInfo} */
  static async getMultipleInfo({ connection, poolsConfig, noNeedState, owner, config }: GetIdoMultipleInfoParams) {
    const publicKeys: {
      pubkey: PublicKey
      version: IdoVersion | SnapshotVersion
      key: 'state' | /*  pool info  */ 'ledger' | /* user info */ 'snapshot' /*  user info maxEligibleTickets */
      poolId: PublicKey
    }[] = []

    for (const poolConfig of poolsConfig) {
      if (!noNeedState) {
        publicKeys.push({
          pubkey: poolConfig.id,
          version: poolConfig.version,
          key: 'state',
          poolId: poolConfig.id
        })
      }

      if (owner) {
        publicKeys.push({
          pubkey: await this.getAssociatedLedgerAccountAddress({
            programId: poolConfig.programId,
            poolId: poolConfig.id,
            owner
          }),
          version: poolConfig.version,
          key: 'ledger',
          poolId: poolConfig.id
        })

        publicKeys.push({
          pubkey: await Snapshot.getAssociatedSnapshotAddress({
            programId: poolConfig.snapshotProgramId,
            seedId: poolConfig.seedId,
            owner
          }),
          version: poolConfig.snapshotVersion,
          key: 'snapshot',
          poolId: poolConfig.id
        })
      }
    }

    const info: { [key: string]: IdoInfo } = {}

    // TODO: why can't fetch ledger and snapshot
    const accountsInfo = await getMultipleAccountsInfoWithCustomFlags(connection, publicKeys, config)
    for (const { pubkey, version, key, poolId, accountInfo } of accountsInfo) {
      if (key === 'state') {
        const STATE_LAYOUT = this.getStateLayout(version)
        if (!accountInfo || accountInfo.data.length !== STATE_LAYOUT.span) {
          return logger.throwArgumentError('invalid ido state account info', 'pools.id', pubkey.toBase58())
        }

        info[poolId.toBase58()] = {
          ...info[poolId.toBase58()],
          ...{ state: STATE_LAYOUT.decode(accountInfo.data) }
        }
      } else if (key === 'ledger') {
        const LEDGER_LAYOUT = this.getLedgerLayout(version)
        if (accountInfo && accountInfo.data) {
          if (accountInfo.data.length !== LEDGER_LAYOUT.span) {
            return logger.throwArgumentError('invalid ido ledger account info', 'ledger', pubkey.toBase58())
          }

          info[poolId.toBase58()] = {
            ...info[poolId.toBase58()],
            ...{ ledger: LEDGER_LAYOUT.decode(accountInfo.data) }
          }
        }
      } else if (key === 'snapshot') {
        const SNAPSHOT_STATE_LAYOUT = Snapshot.getStateLayout(version)
        if (accountInfo && accountInfo.data) {
          if (accountInfo.data.length !== SNAPSHOT_STATE_LAYOUT.span) {
            return logger.throwArgumentError('invalid ido snapshot account info', 'snapshot', pubkey.toBase58())
          }

          const decodeResult = SNAPSHOT_STATE_LAYOUT.decode(accountInfo.data)
          info[poolId.toBase58()] = {
            ...info[poolId.toBase58()],
            ...{ snapshot: decodeResult }
          }
        }
      }
    }

    return info
  }
}
