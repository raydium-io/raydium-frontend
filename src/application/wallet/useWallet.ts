import { PublicKeyish, Token, TokenAmount, WSOL } from '@raydium-io/raydium-sdk'
import { Adapter, WalletName } from '@solana/wallet-adapter-base'
import { Wallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'

import BN from 'bn.js'
import create from 'zustand'

import { isToken } from '@/functions/judgers/dateType'
import { gte } from '@/functions/numberish/compare'
import { HexAddress } from '@/types/constants'

import { isQuantumSOL, QuantumSOLAmount, WSOLMint } from '../token/utils/quantumSOL'

import { ITokenAccount, TokenAccountRawInfo } from './type'
import { toHumanReadable } from '@/functions/format/toHumanReadable'

export type WalletStore = {
  // owner
  owner: PublicKey | undefined
  wallets: Wallet[]
  currentWallet?: Wallet | null
  /** old version of currentWallet */
  adapter?: Adapter
  connected: boolean
  disconnecting: boolean
  connecting: boolean
  select(walletName: WalletName): void
  signAllTransactions: (transaction: Transaction[]) => Promise<Transaction[]> // if not connected, return empty array
  disconnect(): Promise<unknown>
  /** only for Dev */
  inSimulateMode: boolean

  solBalance?: BN | undefined

  /** only include ATA (for this app only accept ATA account, no old tokenAccount ) */
  tokenAccounts: ITokenAccount[]

  /** pass to SDK */
  tokenAccountRawInfos: TokenAccountRawInfo[]

  /** ATAs and SOL  */
  verboseTokenAccounts: ITokenAccount[]

  /** raw: include no ATA (only use it in migrate detect) */
  allTokenAccounts: ITokenAccount[]

  // it can consider QuantumSOL
  // QuantumSOL(default) / QuantumSOL(VersionSOL) will get undefined tokenAccount
  // QuantumSOL(VersionWSOL) will get WSOL tokenAccount
  getTokenAccount(target: Token | PublicKeyish | undefined): ITokenAccount | undefined

  /**
   * has QuantumSOL,
   * for balance without QuantumSOL, use `pureBalances`
   */
  balances: Record<HexAddress, TokenAmount>

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
  wallets: [],
  connected: false,
  disconnecting: false,
  connecting: false,
  select: () => {},
  signAllTransactions: () => Promise.resolve([]),
  disconnect: () => Promise.resolve(),
  /** only for Dev */
  inSimulateMode: false,

  tokenAccounts: [],
  tokenAccountRawInfos: [],
  verboseTokenAccounts: [],
  allTokenAccounts: [],
  getTokenAccount(target) {
    if (!target) return undefined
    if (isQuantumSOL(target) && target.collapseTo !== 'wsol') {
      return undefined
    } else {
      const mint = isToken(target) ? String(target.mint) : String(target)
      const tokenAccounts = get().tokenAccounts
      return tokenAccounts.find((ta) => String(ta.mint) === mint)
    }
  },

  balances: {},
  rawBalances: {},
  pureBalances: {},
  pureRawBalances: {},
  getBalance(target) {
    if (!target) return undefined
    if (isQuantumSOL(target) && target.collapseTo === 'wsol') {
      return get().pureBalances[String(WSOLMint)]
    } else {
      const mint = isToken(target) ? String(target.mint) : String(target)
      return get().balances[mint]
    }
  },
  getRawBalance(target) {
    if (!target) return undefined
    if (isQuantumSOL(target)) {
      return target.collapseTo === 'wsol' ? get().pureRawBalances[WSOL.mint] : get().solBalance
    } else {
      const mint = isToken(target) ? String(target.mint) : String(target)
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
    return get().tokenAccounts.some(({ mint: existMint }) => String(existMint) === String(mint))
  },
  findTokenAccount(mint: PublicKeyish) {
    return get().tokenAccounts.find(({ mint: existMint }) => String(existMint) === String(mint))
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
