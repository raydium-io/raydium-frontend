import { Price, PublicKeyish, TokenAmount } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { produce } from 'immer'
import { create } from 'zustand'

import { addItem, removeItem, shakeUndifindedItem } from '@/functions/arrayMethods'
import { setLocalItem } from '@/functions/dom/jStorage'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { omit } from '@/functions/objectMethods'
import { HexAddress, SrcAddress } from '@/types/constants'

import useWallet from '../wallet/useWallet'

import { verifyToken } from './getOnlineTokenInfo'
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
import { createSplToken } from './useTokenListsLoader'
import { RAYMint, SOLMint } from './wellknownToken.config'

export type TokenStore = {
  tokenIconSrcs: Record<HexAddress, SrcAddress>

  tokenJsonInfos: Record<HexAddress, TokenJson>

  /* has QuantumSOL */
  tokens: Record<HexAddress, SplToken | QuantumSOLToken>

  /* no QuantumSOL */
  pureTokens: Record<HexAddress, SplToken>

  /* QuantumSOLVersionSOL and QuantumSOLVersionWSOL, tokens from all token list (quantumSOL + other SplToken) */
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
  getToken(
    mint: PublicKeyish | undefined,
    options?: {
      /* no QuantumSOL */
      exact?: boolean
      /** sometimes don't use auto createSplToken is better*/
      noCustomToken?: boolean
      /**
       * have default token
       * default decimal is 6
       * default symbol is first 6 letters of mint
       */
      customTokenInfo?: Parameters<typeof createSplToken>[0]
    }
  ): SplToken | undefined

  // /**  noQuantumSOL*/
  // /** can only get token in tokenList */
  // getPureToken(mint: PublicKeyish | undefined): SplToken | undefined

  /** can only get token in tokenList */
  getLpToken(mint: PublicKeyish | undefined): LpToken | undefined

  // QuantumSOL will be 'sol' and 'So11111111111111111111111111111111111111112'
  toUrlMint(token: SplToken | QuantumSOLToken | undefined): string

  // url may be 'sol'
  fromUrlString(mintlike: string): SplToken | QuantumSOLToken

  // QuantumSOLVersionWSOL will be 'WSOL'
  toRealSymbol(token: SplToken | undefined): string

  isLpToken(mint: PublicKeyish | undefined): boolean

  /** it does't contain lp tokens' price  */
  tokenPrices: Record<HexAddress, Price>
  tokenDecimals: Record<HexAddress, number>

  // TODO token mint in blacklist means it can't be selected or add by user Added
  blacklist: Set<string>

  // TODO: solana token mints
  // TODO: raydium token mints
  userAddedTokens: Record<HexAddress /* mint */, SplToken>
  canFlaggedTokenMints: Set<HexAddress>
  userFlaggedTokenMints: Set<HexAddress /* mint */> // flagged must in user added
  sortTokensWithBalance(tokens: SplToken[], useInputTokensOnly?: boolean): SplToken[]
  toggleFlaggedToken(token: SplToken): void
  allSelectableTokens: SplToken[]
  addUserAddedToken(token: SplToken): void
  deleteUserAddedToken(tokenMint: PublicKeyish): void
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

  refreshTokenListCount: number
  refreshTokenList(): void

  isTokenUnnamed(tokenMint: PublicKeyish): boolean
  isTokenUnnamedAndNotUserCustomized(tokenMint: PublicKeyish): boolean
}

export const RAYDIUM_MAINNET_TOKEN_LIST_NAME_DEPRECATED = 'Raydium Mainnet Token List'
export const RAYDIUM_MAINNET_TOKEN_LIST_NAME = 'Raydium Token List'
/** if token is not official or unofficial, it is unnamed */
export const RAYDIUM_UNNAMED_TOKEN_LIST_NAME = 'UnNamed Token List'
export const RAYDIUM_DEV_TOKEN_LIST_NAME = 'Raydium Dev Token List'
export const SOLANA_TOKEN_LIST_NAME = 'Solana Token List'
export const USER_ADDED_TOKEN_LIST_NAME = 'User Added Token List'

export type SupportedTokenListSettingName =
  | typeof RAYDIUM_MAINNET_TOKEN_LIST_NAME // actually  official
  | typeof RAYDIUM_DEV_TOKEN_LIST_NAME
  | typeof SOLANA_TOKEN_LIST_NAME // actually  unOfficial
  | typeof USER_ADDED_TOKEN_LIST_NAME
  | typeof RAYDIUM_UNNAMED_TOKEN_LIST_NAME

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

  getToken(
    mint: PublicKeyish | undefined,
    options?: {
      exact?: boolean
      /** sometimes don't use auto createSplToken is better*/
      noCustomToken?: boolean
      /** have default token */
      customTokenInfo?: Parameters<typeof createSplToken>[0]
    }
  ) {
    /** exact mode: 'so111111112' will be QSOL-WSOL 'sol' will be QSOL-SOL */
    if (mint === SOLUrlMint || isMintEqual(mint, SOLMint) || (!options?.exact && isMintEqual(mint, WSOLMint))) {
      return QuantumSOLVersionSOL
    }
    if (options?.exact && isMintEqual(mint, WSOLMint)) {
      return QuantumSOLVersionWSOL
    }

    // if not exist, see this as userAddedTokens
    const apiToken = get().tokens[toPubString(mint)] ?? get().lpTokens[toPubString(mint)]
    const customizedToken = get().userAddedTokens[toPubString(mint)]
    const token = apiToken ?? customizedToken
    return token
  },

  getLpToken: (mint) => get().lpTokens[toPubString(mint)],

  toUrlMint: (token: SplToken | QuantumSOLToken | undefined) =>
    isQuantumSOL(token) ? (isQuantumSOLVersionWSOL(token) ? String(WSOLMint) : SOLUrlMint) : token?.mintString ?? '',

  fromUrlString: (mintlike: string) =>
    mintlike === SOLUrlMint
      ? QuantumSOLVersionSOL
      : mintlike === String(WSOLMint)
      ? QuantumSOLVersionWSOL
      : get().tokens[mintlike] || get().getToken(mintlike),

  toRealSymbol: (token: SplToken | undefined) =>
    isQuantumSOL(token) ? (isQuantumSOLVersionWSOL(token) ? 'WSOL' : 'SOL') : token?.symbol ?? '',

  isLpToken: () => false,

  tokenPrices: {},
  tokenDecimals: {},
  blacklist: new Set(),

  userAddedTokens: {},
  addUserAddedToken: async (rawToken: SplToken) => {
    const isVarified = await verifyToken(rawToken.mint, { noLog: true })
    const token = Object.assign(rawToken, { hasFreeze: !isVarified } as Partial<SplToken>)
    set((s) =>
      produce(s, (draft) => {
        if (!draft.userAddedTokens[token.mintString]) {
          draft.userAddedTokens[token.mintString] = token
        }
        draft.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME].mints = addItem(
          s.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME].mints ?? new Set<string>(),
          token.mintString
        )
        setLocalItem(
          'USER_ADDED_TOKENS',
          Object.values(draft.userAddedTokens).map((t) => omit(t, 'decimals'))
        )
      })
    )
  },
  deleteUserAddedToken: (tokenMint: PublicKeyish) => {
    const mint = toPubString(tokenMint)
    set((s) =>
      produce(s, (draft) => {
        delete draft.userAddedTokens[mint]
        draft.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME].mints = removeItem(
          s.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME].mints ?? new Set<string>(),
          mint
        )
        setLocalItem(
          'USER_ADDED_TOKENS',
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
          'USER_ADDED_TOKENS',
          Object.values(draft.userAddedTokens).map((t) => omit(t, 'decimals'))
        )
      })
    )
  },
  canFlaggedTokenMints: new Set(),
  userFlaggedTokenMints: new Set(),
  toggleFlaggedToken(token: SplToken) {
    set({ userFlaggedTokenMints: toggleSetItem(get().userFlaggedTokenMints, token.mintString) })
  },
  allSelectableTokens: [],

  sortTokensWithBalance(tokens: SplToken[], useInputTokensOnly?: boolean) {
    const { getToken } = get()
    const RAY = getToken(RAYMint)

    const whiteList = shakeUndifindedItem([RAY, QuantumSOLVersionSOL])
    // noQuantumSOL
    const whiteListMints = whiteList.filter((token) => !isQuantumSOL(token)).map((token) => token.mintString)

    const { pureBalances, balances } = useWallet.getState()

    const notInWhiteListToken = tokens.filter(
      (token) => !whiteListMints.includes(token.mintString) && !isQuantumSOLVersionSOL(token)
    )

    const result = useInputTokensOnly
      ? tokens.sort((tokenA, tokenB) => {
          const balanceA =
            (isQuantumSOL(tokenA) ? balances[toPubString(WSOLMint)]?.raw : pureBalances[tokenA.mintString]?.raw) ||
            new TokenAmount(tokenA, 0).raw
          const balanceB =
            (isQuantumSOL(tokenB) ? balances[toPubString(WSOLMint)]?.raw : pureBalances[tokenB.mintString]?.raw) ||
            new TokenAmount(tokenB, 0).raw
          return balanceA.lte(balanceB) ? 1 : -1
        })
      : [
          ...whiteList,
          ...notInWhiteListToken
            .filter((token) => pureBalances[token.mintString])
            .sort((tokenA, tokenB) => {
              const balanceA = pureBalances[tokenA.mintString].raw
              const balanceB = pureBalances[tokenB.mintString].raw
              return balanceA.lte(balanceB) ? 1 : -1
            }),
          ...notInWhiteListToken.filter((token) => !pureBalances[token.mintString])
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
      isOn: false,
      cannotbBeSeen: true
    },
    [SOLANA_TOKEN_LIST_NAME]: {
      isOn: true
    },
    [USER_ADDED_TOKEN_LIST_NAME]: {
      isOn: true
    },
    [RAYDIUM_UNNAMED_TOKEN_LIST_NAME]: {
      isOn: false,
      cannotbBeSeen: true
    }
  },

  refreshTokenCount: 0,
  refreshTokenPrice() {
    set({ refreshTokenCount: get().refreshTokenCount + 1 })
  },

  refreshTokenListCount: 0,
  refreshTokenList() {
    set({ refreshTokenListCount: get().refreshTokenListCount + 1 })
  },

  isTokenUnnamed: (tokenMint: PublicKeyish) => {
    const { tokenListSettings, blacklist } = get()
    const officialTokenMints = tokenListSettings['Raydium Token List'].mints
    if (officialTokenMints?.has(toPubString(tokenMint))) return false

    const unofficialTokenMints = tokenListSettings['Solana Token List'].mints
    if (unofficialTokenMints?.has(toPubString(tokenMint))) return false

    if (blacklist?.has(toPubString(tokenMint))) return false

    return true
  },

  isTokenUnnamedAndNotUserCustomized: (tokenMint: PublicKeyish) => {
    const { tokenListSettings, blacklist } = get()
    const officialTokenMints = tokenListSettings['Raydium Token List'].mints
    if (officialTokenMints?.has(toPubString(tokenMint))) return false

    const unofficialTokenMints = tokenListSettings['Solana Token List'].mints
    if (unofficialTokenMints?.has(toPubString(tokenMint))) return false

    const userTokenMints = tokenListSettings['User Added Token List'].mints
    if (userTokenMints?.has(toPubString(tokenMint))) return false

    if (blacklist?.has(toPubString(tokenMint))) return false

    return true
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
