import {
  BaseWalletAdapter,
  scopePollingDetectionStrategy,
  WalletName,
  WalletNotConnectedError,
  WalletNotReadyError,
  WalletReadyState
} from '@solana/wallet-adapter-base'
import { Connection, PublicKey, Transaction, TransactionSignature } from '@solana/web3.js'
import { SendTransactionOptions } from '@solana/wallet-adapter-base/src/adapter'
import { MessageBus } from './messageBus'

export const EmbeddedWalletName = 'Squads Multisig' as WalletName
export const ParentWindowName = 'squads-custom-app'

export class SquadsEmbeddedWalletAdapter extends BaseWalletAdapter {
  name = 'Squads Multisig' as WalletName
  url = 'https://v3.squads.so'
  icon =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDE0IiBoZWlnaHQ9IjQxNCIgdmlld0JveD0iMCAwIDQxNCA0MTQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjIwNyIgY3k9IjIwNyIgcj0iMjA3IiBmaWxsPSJibGFjayIvPgo8cGF0aCBkPSJNMzExLjQzOCAxNTUuOTIyTDI4MS42NDIgMTI2LjEyNEwyNTguMTI5IDEwMi41NzRDMjU3LjY4NCAxMDIuMTI5IDI1Ny4yMTQgMTAxLjcwOCAyNTYuNzMzIDEwMS4zMUMyNTMuMzM1IDk4LjUzMTYgMjQ5LjA4MyA5Ny4wMDkzIDI0NC42OTQgOTdIMTY5LjMxOEMxNjQuOTI4IDk3LjAwNzMgMTYwLjY3NiA5OC41Mjk5IDE1Ny4yNzkgMTAxLjMxQzE1Ni43OTcgMTAxLjcwOCAxNTYuMzI4IDEwMi4xMjkgMTU1Ljg4MiAxMDIuNTc0TDEzMi4zODMgMTI2LjA3NkwxMDIuNTg2IDE1NS44NzRDMTAwLjgxNyAxNTcuNjQgOTkuNDEyNCAxNTkuNzM4IDk4LjQ1MzkgMTYyLjA0OEM5Ny40OTU0IDE2NC4zNTggOTcuMDAxNCAxNjYuODM0IDk3IDE2OS4zMzRWMjQ0LjcxNEM5Ni45OTk0IDI0Ny4yMTUgOTcuNDkyNSAyNDkuNjkxIDk4LjQ1MTEgMjUyLjAwMUM5OS40MDk3IDI1NC4zMTEgMTAwLjgxNSAyNTYuNDA5IDEwMi41ODYgMjU4LjE3NUwxNTUuODgyIDMxMS40ODZDMTU2LjMyOCAzMTEuOTMxIDE1Ni43OTcgMzEyLjM1MyAxNTcuMjc5IDMxMi42OUMxNjAuNjc2IDMxNS40NyAxNjQuOTI4IDMxNi45OTMgMTY5LjMxOCAzMTdIMjQ0LjY5NEMyNDkuMDgzIDMxNi45OTEgMjUzLjMzNSAzMTUuNDY4IDI1Ni43MzMgMzEyLjY5QzI1Ny4yMTQgMzEyLjI5MiAyNTcuNjg0IDMxMS44NzEgMjU4LjEyOSAzMTEuNDg2TDMxMS40MjYgMjU4LjE3NUMzMTMuMTkzIDI1Ni40MDcgMzE0LjU5NSAyNTQuMzA4IDMxNS41NTIgMjUxLjk5OEMzMTYuNTA4IDI0OS42ODkgMzE3IDI0Ny4yMTQgMzE3IDI0NC43MTRWMTY5LjMzNEMzMTYuOTg2IDE2NC4zMDUgMzE0Ljk4NyAxNTkuNDg1IDMxMS40MzggMTU1LjkyMlYxNTUuOTIyWk0yODcuOTM4IDIwNy4xMTRWMjcwLjMxQzI4Ny45MzMgMjcyLjYzOCAyODcuNDcgMjc0Ljk0MiAyODYuNTc0IDI3Ny4wOTFDMjg1LjY3OCAyNzkuMjM5IDI4NC4zNjcgMjgxLjE5IDI4Mi43MTcgMjgyLjgzMUMyODEuMDY3IDI4NC40NzMgMjc5LjEwOSAyODUuNzczIDI3Ni45NTYgMjg2LjY1N0MyNzQuODAyIDI4Ny41NDEgMjcyLjQ5NiAyODcuOTkyIDI3MC4xNjggMjg3Ljk4NEgxNDMuNzU5QzE0MS40MzMgMjg3Ljk4NiAxMzkuMTMgMjg3LjUyOSAxMzYuOTggMjg2LjYzOUMxMzQuODMxIDI4NS43NSAxMzIuODc4IDI4NC40NDUgMTMxLjIzMyAyODIuODAxQzEyOS41ODkgMjgxLjE1NiAxMjguMjg0IDI3OS4yMDMgMTI3LjM5NSAyNzcuMDUzQzEyNi41MDUgMjc0LjkwNCAxMjYuMDQ4IDI3Mi42IDEyNi4wNSAyNzAuMjc0VjE0My44NThDMTI2LjA0OCAxNDEuNTMxIDEyNi41MDUgMTM5LjIyNyAxMjcuMzk1IDEzNy4wNzdDMTI4LjI4NCAxMzQuOTI3IDEyOS41ODggMTMyLjk3MyAxMzEuMjMzIDEzMS4zMjdDMTMyLjg3NyAxMjkuNjgxIDEzNC44MyAxMjguMzc2IDEzNi45NzkgMTI3LjQ4NUMxMzkuMTI5IDEyNi41OTUgMTQxLjQzMyAxMjYuMTM2IDE0My43NTkgMTI2LjEzNkgyNzAuMTY4QzI3NC44NjggMTI2LjEzNiAyNzkuMzc2IDEyOC4wMDMgMjgyLjY5OSAxMzEuMzI2QzI4Ni4wMjMgMTM0LjY1IDI4Ny44OSAxMzkuMTU4IDI4Ny44OSAxNDMuODU4VjIwNy4xMjZMMjg3LjkzOCAyMDcuMTE0WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg=='
  readonly supportedTransactionVersions = null

  private _connecting: boolean
  private _publicKey: PublicKey | null
  private _messageBus: MessageBus | null
  private _readyState: WalletReadyState =
    typeof window === 'undefined' || typeof document === 'undefined'
      ? WalletReadyState.Unsupported
      : WalletReadyState.NotDetected
  private _targetOrigin: string

  constructor(targetOrigin = 'https://v3.squads.so/') {
    super()
    this._connecting = false
    this._publicKey = null
    this._messageBus = null
    this._targetOrigin = targetOrigin

    if (this._readyState !== WalletReadyState.Unsupported) {
      scopePollingDetectionStrategy(() => {
        if (self !== top) {
          this._readyState = WalletReadyState.Installed
          this._messageBus = new MessageBus(window.parent, this._targetOrigin)
          this._messageBus.connect()
          this.emit('readyStateChange', this._readyState)
          return true
        }
        return false
      })
    }
  }

  get publicKey(): PublicKey | null {
    return this._publicKey
  }

  get connecting(): boolean {
    return this._connecting
  }

  get connected(): boolean {
    return !!this.publicKey
  }

  get readyState(): WalletReadyState {
    return this._readyState
  }

  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return
      if (this._readyState !== WalletReadyState.Loadable && this._readyState !== WalletReadyState.Installed)
        throw new WalletNotReadyError()

      if (!this._messageBus) throw new WalletNotReadyError()

      this._connecting = true
      const vaultInfo = await this._messageBus.sendRequest(`getVaultInfo#${Date.now()}`, 'getVaultInfo')
      // NOTE: Here we assume that the first vault returned should be connected
      this._publicKey = new PublicKey(vaultInfo[0].pubkey)
      this.emit('connect', this._publicKey)
    } catch (error: any) {
      this.emit('error', error)
      throw error
    } finally {
      this._connecting = false
    }
  }

  async disconnect(): Promise<void> {
    this._publicKey = null
    this.emit('disconnect')
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    if (!this.connected) throw new WalletNotConnectedError()
    if (!this._messageBus) throw new WalletNotReadyError()

    return await this._messageBus.sendRequest(`proposeTransaction#${Date.now()}`, 'proposeTransaction', {
      instructions: tx.instructions.map((instr) => ({
        keys: instr.keys.map((key) => ({
          pubkey: key.pubkey.toString(),
          isSigner: key.isSigner,
          isWritable: key.isWritable
        })),
        data: instr.data.toJSON(),
        programId: instr.programId.toString()
      })),
      type: 'string'
    })
  }

  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    if (!this.connected) throw new WalletNotConnectedError()
    if (!this._messageBus) throw new WalletNotReadyError()

    const instructions: any[] = []
    txs.forEach((tx) =>
      tx.instructions.forEach((instr) => {
        instructions.push({
          keys: instr.keys.map((key) => ({
            pubkey: key.pubkey.toString(),
            isSigner: key.isSigner,
            isWritable: key.isWritable
          })),
          data: instr.data.toJSON(),
          programId: instr.programId.toString()
        })
      })
    )

    return await this._messageBus.sendRequest(`proposeTransaction#${Date.now()}`, 'proposeTransaction', {
      instructions: instructions,
      type: 'array'
    })
  }

  async sendAll(txWithSigners: { tx: Transaction; signers?: [] | undefined }[], _opts?: any): Promise<string[]> {
    if (!this.connected) throw new WalletNotConnectedError()
    if (!this._messageBus) throw new WalletNotReadyError()

    const instructions: any[] = []
    txWithSigners.forEach((tx) =>
      tx.tx.instructions.forEach((instr) => {
        instructions.push({
          keys: instr.keys.map((key) => ({
            pubkey: key.pubkey.toString(),
            isSigner: key.isSigner,
            isWritable: key.isWritable
          })),
          data: instr.data.toJSON(),
          programId: instr.programId.toString()
        })
      })
    )

    return await this._messageBus.sendRequest(`proposeTransaction#${Date.now()}`, 'proposeTransaction', {
      instructions: instructions,
      type: 'array'
    })
  }

  async sendAndConfirm(tx: Transaction, _signers?: [] | undefined, _opts?: any): Promise<string> {
    if (!this.connected) throw new WalletNotConnectedError()
    if (!this._messageBus) throw new WalletNotReadyError()

    return await this._messageBus.sendRequest(`proposeTransaction#${Date.now()}`, 'proposeTransaction', {
      instructions: tx.instructions.map((instr) => ({
        keys: instr.keys.map((key) => ({
          pubkey: key.pubkey.toString(),
          isSigner: key.isSigner,
          isWritable: key.isWritable
        })),
        data: instr.data.toJSON(),
        programId: instr.programId.toString()
      })),
      type: 'string'
    })
  }

  async sendTransaction(
    transaction: Transaction,
    _connection: Connection,
    _options?: SendTransactionOptions
  ): Promise<TransactionSignature> {
    if (!this.connected) throw new WalletNotConnectedError()
    if (!this._messageBus) throw new WalletNotReadyError()

    return await this._messageBus.sendRequest(`proposeTransaction#${Date.now()}`, 'proposeTransaction', {
      instructions: transaction.instructions.map((instr) => ({
        keys: instr.keys.map((key) => ({
          pubkey: key.pubkey.toString(),
          isSigner: key.isSigner,
          isWritable: key.isWritable
        })),
        data: instr.data.toJSON(),
        programId: instr.programId.toString()
      })),
      type: 'string'
    })
  }
}

export const detectEmbeddedInSquadsIframe = (): boolean => {
  return typeof window !== 'undefined' && window.parent !== window && self !== top
}
