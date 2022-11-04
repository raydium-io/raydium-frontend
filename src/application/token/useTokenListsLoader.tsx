import { useCallback } from 'react'

import { ApiAmmV3PoolInfo, LiquidityPoolsJsonFile, Token, WSOL } from '@raydium-io/raydium-sdk'

import jFetch from '@/functions/dom/jFetch'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { isInBonsaiTest, isInLocalhost } from '@/functions/judgers/isSSR'
import { useTransitionedEffect } from '@/hooks/useTransitionedEffect'
import { HexAddress, SrcAddress } from '@/types/constants'

import { objectMap, replaceValue } from '../../functions/objectMethods'
import useConcentrated from '../concentrated/useConcentrated'
import useFarms from '../farms/useFarms'
import useLiquidity from '../liquidity/useLiquidity'
import { usePools } from '../pools/usePools'
import { useSwap } from '../swap/useSwap'
import useWallet from '../wallet/useWallet'

import { QuantumSOL, QuantumSOLVersionSOL, QuantumSOLVersionWSOL } from './quantumSOL'
import { rawTokenListConfigs } from './rawTokenLists.config'
import {
  RaydiumDevTokenListJsonInfo, RaydiumTokenListJsonInfo, SplToken, TokenJson, TokenListConfigType,
  TokenListFetchConfigItem
} from './type'
import useToken, {
  OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME, RAYDIUM_DEV_TOKEN_LIST_NAME, RAYDIUM_MAINNET_TOKEN_LIST_NAME,
  RAYDIUM_UNNAMED_TOKEN_LIST_NAME, SOLANA_TOKEN_LIST_NAME, SupportedTokenListSettingName
} from './useToken'
import { SOLMint } from './wellknownToken.config'

export default function useTokenListsLoader() {
  const walletRefreshCount = useWallet((s) => s.refreshCount)
  const swapRefreshCount = useSwap((s) => s.refreshCount)
  const liquidityRefreshCount = useLiquidity((s) => s.refreshCount)
  // both farms pages and stake pages
  const farmRefreshCount = useFarms((s) => s.farmRefreshCount)
  const poolRefreshCount = usePools((s) => s.refreshCount)
  const clmmRefreshCount = useConcentrated((s) => s.refreshCount)

  useTransitionedEffect(() => {
    loadTokens()
  }, [
    walletRefreshCount,
    swapRefreshCount,
    liquidityRefreshCount,
    farmRefreshCount,
    poolRefreshCount,
    clmmRefreshCount
  ])
}

function deleteFetchedNativeSOLToken(tokenJsons: TokenJson[]) {
  return tokenJsons.filter((tj) => tj.mint !== toPubString(SOLMint))
}

function isAnIncludedMint(collector: TokenInfoCollector, mint: string) {
  return (
    collector.officialMints.includes(mint) ||
    collector.unOfficialMints.includes(mint) ||
    collector.devMints.includes(mint) ||
    collector.unNamedMints.includes(mint) ||
    collector.otherLiquiditySupportedMints.includes(mint)
  )
}

async function MainTokenFetch(response: RaydiumTokenListJsonInfo, collector: TokenInfoCollector): Promise<void> {
  if (!response.official || !response.unOfficial || !response.blacklist || !response.unNamed) return
  const tmpDelNativeSolToken = deleteFetchedNativeSOLToken(response.official)
  collector.officialMints.push(...tmpDelNativeSolToken.map(({ mint }) => mint))
  collector.unOfficialMints.push(...response.unOfficial.map(({ mint }) => mint))
  collector.unNamedMints.push(...response.unNamed.map(({ mint }) => mint))
  collector.tokens.push(
    ...tmpDelNativeSolToken,
    ...response.unOfficial,
    ...response.unNamed.map(
      (token) =>
        ({
          ...token,
          symbol: token.mint.slice(0, 6),
          name: token.mint.slice(0, 12),
          extensions: {},
          icon: ''
        } as TokenJson)
    )
  )
  collector.blacklist.push(...response.blacklist)
}

async function DevTokenFetch(response: RaydiumDevTokenListJsonInfo, collector: TokenInfoCollector): Promise<void> {
  if (!response.tokens) return
  collector.devMints.push(...response.tokens.map(({ mint }) => mint))
  collector.tokens.push(...response.tokens)
}

async function UnofficialLiquidityPoolTokenFetch(
  response: LiquidityPoolsJsonFile,
  collector: TokenInfoCollector
): Promise<void> {
  if (!response.unOfficial) return
  const targets = [
    {
      mint: 'baseMint',
      decimal: 'baseDecimals'
    },
    {
      mint: 'quoteMint',
      decimal: 'quoteDecimals'
    }
  ]
  response.unOfficial.forEach((pool) => {
    for (const target of targets) {
      if (!isAnIncludedMint(collector, pool[target.mint])) {
        collector.otherLiquiditySupportedMints.push(pool[target.mint])
        collector.tokens.push({
          symbol: pool[target.mint].substring(0, 6),
          name: pool[target.mint].substring(0, 6),
          mint: pool[target.mint],
          decimals: pool[target.decimal],
          extensions: {
            coingeckoId: ''
          },
          icon: ''
        })
      }
    }
  })
}
async function ClmmLiquidityPoolTokenFetch(
  response: { data: ApiAmmV3PoolInfo[] },
  collector: TokenInfoCollector
): Promise<void> {
  if (!response || !response.data) return
  const targets = [
    {
      mint: 'mintA',
      decimal: 'mintDecimalsA'
    },
    {
      mint: 'mintB',
      decimal: 'mintDecimalsB'
    }
  ]
  response.data.forEach((pool) => {
    for (const target of targets) {
      if (!isAnIncludedMint(collector, pool[target.mint])) {
        collector.otherLiquiditySupportedMints.push(pool[target.mint])
        collector.tokens.push({
          symbol: pool[target.mint].substring(0, 6),
          name: pool[target.mint].substring(0, 6),
          mint: pool[target.mint],
          decimals: pool[target.decimal],
          extensions: {
            coingeckoId: ''
          },
          icon: ''
        })
      }
    }
  })
}

interface TokenInfoCollector {
  devMints: string[]
  unOfficialMints: string[]
  officialMints: string[]
  otherLiquiditySupportedMints: string[]
  unNamedMints: string[]
  blacklist: string[]
  tokens: TokenJson[]
}

async function fetchTokenLists(
  rawListConfigs: TokenListFetchConfigItem[],
  tokenListSettings: {
    [N in SupportedTokenListSettingName]: {
      mints?: Set<HexAddress> // TODO
      disableUserConfig?: boolean
      isOn: boolean
      icon?: SrcAddress
      cannotbBeSeen?: boolean
    }
  }
): Promise<{
  devMints: string[]
  unOfficialMints: string[]
  officialMints: string[]
  otherLiquiditySupportedMints: string[]
  unNamedMints: string[]
  tokens: TokenJson[]
  blacklist: string[]
}> {
  const tokenCollector: TokenInfoCollector = {
    devMints: [],
    unOfficialMints: [],
    officialMints: [],
    otherLiquiditySupportedMints: [],
    unNamedMints: [],
    blacklist: [],
    tokens: []
  }
  // eslint-disable-next-line no-console
  console.info('tokenList start fetching')

  // we need it execute in order (main->dev->v2->v3->...),
  // bcz RAYDIUM_MAIN contain almost 90% of tokens and we don't run "isAnIncludedMint" check w/ them
  for (const raw of rawListConfigs) {
    const response = await jFetch<
      RaydiumTokenListJsonInfo | RaydiumDevTokenListJsonInfo | LiquidityPoolsJsonFile | { data: ApiAmmV3PoolInfo[] }
    >(raw.url)
    if (response) {
      switch (raw.type) {
        case TokenListConfigType.RAYDIUM_MAIN:
          await MainTokenFetch(response as RaydiumTokenListJsonInfo, tokenCollector)
          break
        case TokenListConfigType.RAYDIUM_DEV:
          if (isInLocalhost || isInBonsaiTest) {
            await DevTokenFetch(response as RaydiumDevTokenListJsonInfo, tokenCollector)
          }
          break
        case TokenListConfigType.LIQUIDITY_V2:
          await UnofficialLiquidityPoolTokenFetch(response as LiquidityPoolsJsonFile, tokenCollector)
          break
        case TokenListConfigType.LIQUIDITY_V3:
          await ClmmLiquidityPoolTokenFetch(response as { data: ApiAmmV3PoolInfo[] }, tokenCollector)
          break
        default:
          console.warn('token list type undetected, did you forgot to create this type of case?')
          break
      }
    }
  }

  // eslint-disable-next-line no-console
  console.info('tokenList end fetching, total tokens #: ', tokenCollector.tokens.length)

  // check if any of fetchings is failed (has response, but not code: 200)
  // then replace it w/ current list value (if current list is not undefined)
  const checkMapping = [
    { collector: 'devMints', settings: RAYDIUM_DEV_TOKEN_LIST_NAME },
    { collector: 'officialMints', settings: RAYDIUM_MAINNET_TOKEN_LIST_NAME },
    { collector: 'unOfficialMints', settings: SOLANA_TOKEN_LIST_NAME },
    { collector: 'unNamedMints', settings: RAYDIUM_UNNAMED_TOKEN_LIST_NAME },
    { collector: 'otherLiquiditySupportedMints', settings: OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME }
  ]

  for (const pair of checkMapping) {
    if (tokenCollector[pair.collector].length === 0 && tokenListSettings[pair.settings].mints) {
      tokenCollector[pair.collector] = Array.from(tokenListSettings[pair.settings].mints.values())
    }
  }

  return tokenCollector
}

async function fetchTokenIconInfoList() {
  return jFetch<Record<HexAddress, SrcAddress>>('/custom-token-icon-list.json')
}

export function createSplToken(
  info: Partial<TokenJson> & {
    mint: HexAddress
    decimals: number
    userAdded?: boolean /* only if token is added by user */
  },
  customTokenIcons?: Record<string, SrcAddress>
): SplToken {
  const { mint, symbol, name, decimals, ...rest } = info

  // TODO: recordPubString(token.mint)
  const splToken = Object.assign(
    new Token(mint, decimals, symbol, name ?? symbol),
    { icon: '', extensions: {}, id: mint },
    rest
  )
  if (customTokenIcons?.[mint]) {
    splToken.icon = customTokenIcons[mint] ?? ''
  }
  return splToken
}
export function toSplTokenInfo(splToken: SplToken): TokenJson {
  return {
    ...splToken,
    symbol: splToken.symbol ?? '',
    name: splToken.name ?? '',
    mint: toPubString(splToken.mint),
    decimals: splToken.decimals,
    extensions: splToken.extensions,
    icon: splToken.icon
  }
}

async function loadTokens() {
  const { tokenListSettings } = useToken.getState()
  const customTokenIcons = await fetchTokenIconInfoList()
  const {
    devMints,
    unOfficialMints,
    officialMints,
    otherLiquiditySupportedMints,
    unNamedMints,
    tokens: allTokens,
    blacklist: _blacklist
  } = await fetchTokenLists(rawTokenListConfigs, tokenListSettings)
  // if length has not changed, don't parse again

  const mainnetOriginalMintsLength = tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME].mints?.size
  const solanaTokenOriginalMintsLength = tokenListSettings[SOLANA_TOKEN_LIST_NAME].mints?.size
  const devOriginalMintsLength = tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME].mints?.size
  const unnamedOriginalMintsLength = tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME].mints?.size
  const otherOriginalMintsLength = tokenListSettings[OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME].mints?.size

  if (
    devMints.length === devOriginalMintsLength &&
    officialMints.length === mainnetOriginalMintsLength &&
    unOfficialMints.length === solanaTokenOriginalMintsLength &&
    unNamedMints.length === unnamedOriginalMintsLength &&
    otherLiquiditySupportedMints.length === otherOriginalMintsLength
  )
    return

  const blacklist = new Set(_blacklist)
  const unsortedTokenInfos = allTokens
    /* shake off tokens in raydium blacklist */
    .filter((info) => !blacklist.has(info.mint))

  const startWithSymbol = (s: string) => !/^[a-zA-Z]/.test(s)
  const splTokenJsonInfos = listToMap(
    unsortedTokenInfos.sort((a, b) => {
      const aPriorityOrder = officialMints.includes(a.mint) ? 1 : unOfficialMints.includes(a.mint) ? 2 : 3
      const bPriorityOrder = officialMints.includes(b.mint) ? 1 : unOfficialMints.includes(b.mint) ? 2 : 3
      const priorityOrderDiff = aPriorityOrder - bPriorityOrder
      if (priorityOrderDiff === 0) {
        const aStartWithSymbol = startWithSymbol(a.symbol)
        const bStartWithSymbol = startWithSymbol(b.symbol)
        if (aStartWithSymbol && !bStartWithSymbol) return 1
        if (!aStartWithSymbol && bStartWithSymbol) return -1
        return a.symbol.localeCompare(b.symbol)
      } else {
        return priorityOrderDiff
      }
    }),
    (i) => i.mint
  )

  const pureTokens = objectMap(splTokenJsonInfos, (tokenJsonInfo) => createSplToken(tokenJsonInfo, customTokenIcons))

  /** have QSOL */
  const tokens = { ...pureTokens, [toPubString(QuantumSOL.mint)]: QuantumSOL }

  const verboseTokens = [
    QuantumSOLVersionSOL,
    ...Object.values(replaceValue(pureTokens, (v, k) => k === String(WSOL.mint), QuantumSOLVersionWSOL))
  ]

  useToken.setState((s) => ({
    canFlaggedTokenMints: new Set(
      Object.values(tokens)
        .filter(
          (token) =>
            !officialMints.includes(String(token.mint)) &&
            !devMints.includes(String(token.mint)) &&
            !unNamedMints.includes(String(token.mint))
        )
        .map((token) => String(token.mint))
    ),
    blacklist: _blacklist,
    tokenListSettings: {
      ...s.tokenListSettings,

      [RAYDIUM_MAINNET_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME],
        mints: new Set([
          ...(s.tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME].mints?.values() ?? []),
          ...officialMints
        ])
      },
      [SOLANA_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[SOLANA_TOKEN_LIST_NAME],
        mints: new Set([...(s.tokenListSettings[SOLANA_TOKEN_LIST_NAME].mints?.values() ?? []), ...unOfficialMints])
      },

      [RAYDIUM_DEV_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME],
        mints: new Set([...(s.tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME].mints?.values() ?? []), ...devMints])
      },
      [OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME],
        mints: new Set(otherLiquiditySupportedMints)
      },
      [RAYDIUM_UNNAMED_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME],
        mints: new Set([
          ...(s.tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME].mints?.values() ?? []),
          ...unNamedMints
        ])
      }
    },
    tokenJsonInfos: listToMap(allTokens, (i) => i.mint),
    tokens,
    pureTokens,
    verboseTokens
  }))
}
