import { PublicKey } from '@solana/web3.js'

import produce from 'immer'
import { Price, PublicKeyish, TokenAmount } from '@raydium-io/raydium-sdk'
import create from 'zustand'

import { addItem, removeItem, shakeUndifindedItem } from '@/functions/arrayMethods'
import { setLocalItem } from '@/functions/dom/jStorage'
import toPubString from '@/functions/format/toMintString'
import { omit } from '@/functions/objectMethods'
import { HexAddress, SrcAddress } from '@/types/constants'

import useWallet from '../wallet/useWallet'

import {
  isQuantumSOL,
  isQuantumSOLVersionSOL,
  isQuantumSOLVersionWSOL,
  QuantumSOLToken,
  QuantumSOLVersionSOL,
  QuantumSOLVersionWSOL,
  SOLUrlMint,
  WSOLMint
} from './quantumSOL'
import { LpToken, SplToken, TokenJson } from './type'
import { RAYMint } from './wellknownToken.config'

export type TokenStore = {
  tokenIconSrcs: Record<HexAddress, SrcAddress>

  tokenJsonInfos: Record<HexAddress, TokenJson>

  // has QuantumSOL
  tokens: Record<HexAddress, SplToken | QuantumSOLToken>

  // no QuantumSOL
  pureTokens: Record<HexAddress, SplToken>

  // QuantumSOLVersionSOL and QuantumSOLVersionWSOL
  verboseTokens: (SplToken | QuantumSOLToken)[]

  // QuantumSOL
  lpTokens: Record<HexAddress, LpToken>

  /**
   * has QuantumSOL\
   * can only get token in tokenList \
   * TODO:should also get user Added Token \
   * exact mode: 'so111111112' will be QSOL-WSOL\
   * support both spl and lp
   */
  getToken(mint: PublicKeyish | undefined, options?: { /* no QuantumSOL */ exact?: boolean }): SplToken | undefined

  // /**  noQuantumSOL*/
  // /** can only get token in tokenList */
  // getPureToken(mint: PublicKeyish | undefined): SplToken | undefined

  /** can only get token in tokenList */
  getLpToken(mint: PublicKeyish | undefined): LpToken | undefined

  // QuantumSOL will be 'sol' and 'So11111111111111111111111111111111111111112'
  toUrlMint(token: SplToken | QuantumSOLToken | undefined): string

  // url may be 'sol'
  fromUrlString(mintlike: string): SplToken | QuantumSOLToken

  isLpToken(mint: PublicKeyish | undefined): boolean

  /** it does't contain lp tokens' price  */
  tokenPrices: Record<HexAddress, Price>

  // TODO token mint in blacklist means it can't be selected or add by user Added
  blacklist: string[]

  // TODO: solana token mints
  // TODO: raydium token mints
  userAddedTokens: Record<HexAddress /* mint */, SplToken>
  canFlaggedTokenMints: Set<HexAddress>
  userFlaggedTokenMints: Set<HexAddress /* mint */> // flagged must in user added
  sortTokens(tokens: SplToken[], useInputTokensOnly?: boolean): SplToken[]
  toggleFlaggedToken(token: SplToken): void
  allSelectableTokens: SplToken[]
  addUserAddedToken(token: SplToken): void
  deleteUserAddedToken(token: SplToken): void
  editUserAddedToken(tokenInfo: { symbol: string; name: string }, mint: PublicKey): void
  tokenListSettings: {
    [N in SupportedTokenListSettingName]: {
      mints?: Set<HexAddress> // TODO
      disableUserConfig?: boolean
      isOn: boolean
      icon?: SrcAddress
      cannotbBeSeen?: boolean
    }
  }
  refreshTokenCount: number
  refreshTokenPrice(): void

  // for customize token symbol/name (rename feature for other liquidity pools' unknown token)
  userCustomTokenSymbol: { [x: string]: { symbol: string; name: string } }
  updateUserCustomTokenSymbol(token: SplToken, symbol: string, name: string): void
}

export const RAYDIUM_MAINNET_TOKEN_LIST_NAME_DEPRECATED = 'Raydium Mainnet Token List'
export const RAYDIUM_MAINNET_TOKEN_LIST_NAME = 'Raydium Token List'
export const RAYDIUM_UNNAMED_TOKEN_LIST_NAME = 'UnNamed Token List'
export const RAYDIUM_DEV_TOKEN_LIST_NAME = 'Raydium Dev Token List'
export const SOLANA_TOKEN_LIST_NAME = 'Solana Token List'
export const USER_ADDED_TOKEN_LIST_NAME = 'User Added Token List'
export const OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME = 'Other Liquidity Supported Token List'

export type SupportedTokenListSettingName =
  | typeof RAYDIUM_MAINNET_TOKEN_LIST_NAME // actually  official
  | typeof RAYDIUM_DEV_TOKEN_LIST_NAME
  | typeof SOLANA_TOKEN_LIST_NAME // actually  unOfficial
  | typeof USER_ADDED_TOKEN_LIST_NAME
  | typeof RAYDIUM_UNNAMED_TOKEN_LIST_NAME
  | typeof OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME

/** zustand store hooks */
export const useToken = create<TokenStore>((set, get) => ({
  tokenIconSrcs: {},
  availableTokenLists: [],

  tokenJsonInfos: {},

  // wsol -> quantumSOL(include sol info)
  tokens: {},
  // no sol just wsol(it's the raw info)
  pureTokens: {},
  // include all token (both QuantumSOLVersionSOL and QuantumSOLVersionWSOL), their mint is all WSOL's mint, so can't be a object, must be an array
  verboseTokens: [],

  // lpToken have not SOL, no need pure and verbose
  lpTokens: {},

  getToken: () => undefined,

  getLpToken: () => undefined,

  toUrlMint: (token: SplToken | QuantumSOLToken | undefined) =>
    isQuantumSOL(token) ? (isQuantumSOLVersionWSOL(token) ? String(WSOLMint) : SOLUrlMint) : String(token?.mint ?? ''),

  fromUrlString: (mintlike: string) =>
    mintlike === SOLUrlMint
      ? QuantumSOLVersionSOL
      : mintlike === String(WSOLMint)
      ? QuantumSOLVersionWSOL
      : get().tokens[mintlike],

  isLpToken: () => false,

  tokenPrices: {},
  blacklist: [],

  userAddedTokens: {},
  addUserAddedToken: (token: SplToken) => {
    set((s) =>
      produce(s, (draft) => {
        if (!draft.userAddedTokens[toPubString(token.mint)]) {
          draft.userAddedTokens[toPubString(token.mint)] = token
        }
        draft.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME].mints = addItem(
          s.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME].mints ?? new Set<string>(),
          toPubString(token.mint)
        )
        setLocalItem(
          'TOKEN_LIST_USER_ADDED_TOKENS',
          Object.values(draft.userAddedTokens).map((t) => omit(t, 'decimals'))
        )
      })
    )
  },
  deleteUserAddedToken: (token: SplToken) => {
    set((s) =>
      produce(s, (draft) => {
        delete draft.userAddedTokens[toPubString(token.mint)]
        draft.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME].mints = removeItem(
          s.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME].mints ?? new Set<string>(),
          toPubString(token.mint)
        )
        setLocalItem(
          'TOKEN_LIST_USER_ADDED_TOKENS',
          Object.values(draft.userAddedTokens).map((t) => omit(t, 'decimals'))
        )
      })
    )
  },
  editUserAddedToken: (tokenInfo: { symbol: string; name: string }, mint: PublicKey) => {
    set((s) =>
      produce(s, (draft) => {
        draft.userAddedTokens[toPubString(mint)].symbol = tokenInfo.symbol
        draft.userAddedTokens[toPubString(mint)].name = tokenInfo.name ? tokenInfo.name : tokenInfo.symbol
        setLocalItem(
          'TOKEN_LIST_USER_ADDED_TOKENS',
          Object.values(draft.userAddedTokens).map((t) => omit(t, 'decimals'))
        )
      })
    )
  },
  canFlaggedTokenMints: new Set(),
  userFlaggedTokenMints: new Set(),
  toggleFlaggedToken(token: SplToken) {
    set({ userFlaggedTokenMints: toggleSetItem(get().userFlaggedTokenMints, String(token.mint)) })
  },
  allSelectableTokens: [],

  sortTokens(tokens: SplToken[], useInputTokensOnly?: boolean) {
    const { getToken } = get()
    const RAY = getToken(RAYMint)

    const whiteList = shakeUndifindedItem([RAY, QuantumSOLVersionSOL])
    // noQuantumSOL
    const whiteListMints = whiteList.filter((token) => !isQuantumSOL(token)).map((token) => String(token.mint))

    const { pureBalances, balances } = useWallet.getState()

    const notInWhiteListToken = Object.values(tokens).filter(
      (token) => !isQuantumSOLVersionSOL(token) && !whiteListMints.includes(String(token.mint))
    )

    const result = useInputTokensOnly
      ? tokens.sort((tokenA, tokenB) => {
          const balanceA =
            (isQuantumSOL(tokenA) ? balances[WSOLMint.toBase58()]?.raw : pureBalances[String(tokenA.mint)]?.raw) ||
            new TokenAmount(tokenA, 0).raw
          const balanceB =
            (isQuantumSOL(tokenB) ? balances[WSOLMint.toBase58()]?.raw : pureBalances[String(tokenB.mint)]?.raw) ||
            new TokenAmount(tokenB, 0).raw
          return balanceA.lte(balanceB) ? 1 : -1
        })
      : [
          ...whiteList,
          ...notInWhiteListToken
            .filter((token) => pureBalances[String(token.mint)])
            .sort((tokenA, tokenB) => {
              const balanceA = pureBalances[String(tokenA.mint)].raw
              const balanceB = pureBalances[String(tokenB.mint)].raw
              return balanceA.lte(balanceB) ? 1 : -1
            }),
          ...notInWhiteListToken.filter((token) => !pureBalances[String(token.mint)])
        ]
    return result
  },

  tokenListSettings: {
    [RAYDIUM_MAINNET_TOKEN_LIST_NAME]: {
      disableUserConfig: true,
      isOn: true
    },
    [RAYDIUM_DEV_TOKEN_LIST_NAME]: {
      disableUserConfig: true,
      isOn: true,
      cannotbBeSeen: true
    },
    [SOLANA_TOKEN_LIST_NAME]: {
      isOn: true
    },
    [USER_ADDED_TOKEN_LIST_NAME]: {
      isOn: true
    },
    [OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME]: {
      isOn: true,
      cannotbBeSeen: true
    },
    [RAYDIUM_UNNAMED_TOKEN_LIST_NAME]: {
      isOn: true,
      cannotbBeSeen: true
    }
  },

  refreshTokenCount: 0,
  refreshTokenPrice() {
    set((s) => ({ refreshTokenCount: s.refreshTokenCount + 1 }))
  },

  userCustomTokenSymbol: {},
  updateUserCustomTokenSymbol: (token: SplToken, symbol: string, name: string) => {
    set((s) =>
      produce(s, (draft) => {
        draft.userCustomTokenSymbol = {
          ...s.userCustomTokenSymbol,
          [toPubString(token.mint)]: {
            symbol: symbol,
            name: name ? name : symbol
          }
        }
        setLocalItem('USER_CUSTOM_TOKEN_SYMBOL', draft.userCustomTokenSymbol)
      })
    )
  }
}))
// TODO: useLocalStorge to record user's token list

export default useToken

function toggleSetItem<T>(set: Set<T>, item: T) {
  const newSet = new Set(set)
  if (newSet.has(item)) {
    newSet.delete(item)
  } else {
    newSet.add(item)
  }
  return newSet
}
