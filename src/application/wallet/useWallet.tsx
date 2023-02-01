import { PublicKeyish, Token, TokenAmount, TxVersion, WSOL } from '@raydium-io/raydium-sdk'
import { Adapter, WalletName } from '@solana/wallet-adapter-base'
import { Wallet } from '@solana/wallet-adapter-react'
import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

import BN from 'bn.js'
import create from 'zustand'

import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isToken } from '@/functions/judgers/dateType'
import { gte } from '@/functions/numberish/compare'
import { HexAddress } from '@/types/constants'

import { isQuantumSOL, QuantumSOLAmount, QuantumSOLVersionWSOL } from '../token/quantumSOL'

import { ITokenAccount, TokenAccountRawInfo } from './type'

export type WalletStore = {
  // owner
  owner: PublicKey | undefined
  /** old version of currentWallet */
  adapter?: Adapter
  adapterInitializing: boolean
  txVersion: TxVersion

  // a experimental feature (owner isn't in shadowOwners)
  /** each Keypair object hold both publicKey and secret key **/
  shadowKeypairs?: Keypair[]
  availableWallets: Wallet[]
  currentWallet?: Wallet | null
  connected: boolean
  disconnecting: boolean
  connecting: boolean
  select(walletName: WalletName): void
  signAllTransactions: <T extends Transaction | VersionedTransaction>(transactions: T[]) => Promise<T[]> // if not connected, return empty array
  disconnect(): Promise<unknown>
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>
  /** only for Dev */
  inSimulateMode: boolean

  wsolBalance?: BN | undefined
  solBalance?: BN | undefined

  /** this is a some of wsol's tokenAccounts's amount (sol / wsol is special) */
  allWsolBalance?: BN | undefined

  //#region ------------------- tokenAccount -------------------
  // for owner change but tokenAccount still belong to old owner
  tokenAccountsOwner?: PublicKey | undefined
  /** only include ATA (for this app only accept ATA account, no old tokenAccount ) */
  tokenAccounts: ITokenAccount[]
  /** pass to SDK */
  tokenAccountRawInfos: TokenAccountRawInfo[]
  /** SOL  */
  nativeTokenAccount: ITokenAccount | undefined
  /** raw: include no ATA (only use it in migrate detect) */
  allTokenAccounts: ITokenAccount[]
  // it can consider QuantumSOL
  // QuantumSOL(default) / QuantumSOL(VersionSOL) will get undefined tokenAccount
  // QuantumSOL(VersionWSOL) will get WSOL tokenAccount
  getTokenAccount(target: Token | PublicKeyish | undefined): ITokenAccount | undefined
  //#endregion

  /**
   * has QuantumSOL,
   * for balance without QuantumSOL, use `pureBalances`
   */
  balances: Record<HexAddress, TokenAmount>

  /**
   * only if shadowWallet is on
   * @todo not imply yet!
   */
  shadowBalances?: Record<HexAddress, TokenAmount>

  /**
   * rawbalance is BN , has QuantumSOL,
   * for balance without QuantumSOL, use `pureRawBalances`
   */
  rawBalances: Record<HexAddress, BN>

  /**
   * no QuantumSOL,
   * for balance with QuantumSOL, use `balance`
   */
  pureBalances: Record<HexAddress, TokenAmount>

  /**
   * rawbalance is BN , no QuantumSOL,
   * for balance with QuantumSOL, use `pureBalances`
   */
  pureRawBalances: Record<HexAddress, BN>

  // it can consider QuantumSOL
  getBalance(target: Token | PublicKeyish | undefined): TokenAmount | QuantumSOLAmount | undefined

  // it can consider QuantumSOL
  getRawBalance(target: Token | PublicKeyish | undefined): BN | undefined

  checkWalletHasEnoughBalance(minBalance: TokenAmount | undefined): boolean

  whetherTokenAccountIsExist(mint: PublicKeyish): boolean
  findTokenAccount(mint: PublicKeyish): ITokenAccount | undefined

  // just for trigger refresh
  refreshCount: number
  refreshWallet(): void
}

const useWallet = create<WalletStore>((set, get) => ({
  // owner
  owner: undefined,
  txVersion: TxVersion.V0,
  availableWallets: [],
  connected: false,
  disconnecting: false,
  connecting: false,
  select: () => {},
  signAllTransactions: () => Promise.resolve([]),
  disconnect: () => Promise.resolve(),
  /** only for Dev */
  inSimulateMode: false,
  adapterInitializing: true,

  tokenAccounts: [],
  tokenAccountRawInfos: [],
  nativeTokenAccount: undefined,
  allTokenAccounts: [],
  getTokenAccount(target) {
    if (!target) return undefined
    if (isQuantumSOL(target) && target.collapseTo !== 'wsol') {
      return undefined
    } else {
      const mint = isToken(target) ? toPubString(target.mint) : toPubString(target)
      const tokenAccounts = get().tokenAccounts
      return tokenAccounts.find((ta) => toPubString(ta.mint) === mint)
    }
  },

  balances: {},
  rawBalances: {},
  pureBalances: {},
  pureRawBalances: {},
  getBalance(target) {
    if (!target) return undefined
    if (isQuantumSOL(target) && target.collapseTo === 'wsol') {
      return toTokenAmount(QuantumSOLVersionWSOL, get().wsolBalance)
    } else {
      const mint = isToken(target) ? toPubString(target.mint) : toPubString(target)
      return get().balances[mint]
    }
  },
  getRawBalance(target) {
    if (!target) return undefined
    if (isQuantumSOL(target)) {
      return target.collapseTo === 'wsol' ? get().pureRawBalances[WSOL.mint] : get().solBalance
    } else {
      const mint = isToken(target) ? toPubString(target.mint) : toPubString(target)
      return get().rawBalances[mint]
    }
  },

  checkWalletHasEnoughBalance(minBalance) {
    if (!minBalance) return false
    const userBalance = get().getBalance(minBalance.token)
    if (!userBalance) return false
    return gte(userBalance, minBalance)
  },

  whetherTokenAccountIsExist(mint: PublicKeyish) {
    return get().tokenAccounts.some(({ mint: existMint }) => toPubString(existMint) === toPubString(mint))
  },
  findTokenAccount(mint: PublicKeyish) {
    return get().tokenAccounts.find(({ mint: existMint }) => toPubString(existMint) === toPubString(mint))
  },
  refreshCount: 0,
  async refreshWallet() {
    // will refresh: tokenAccounts, balances, etc.
    // set((s) => ({
    //   refreshCount: s.refreshCount + 1
    // }))
  }
}))

export default useWallet
