import { ApiClmmPoolsItem, LiquidityPoolsJsonFile, Token, WSOL } from '@raydium-io/raydium-sdk'

import { addItems, mergeWithOld } from '@/functions/arrayMethods'
import jFetch from '@/functions/dom/jFetch'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { isArray, isObject } from '@/functions/judgers/dateType'
import { isSubSet } from '@/functions/setMethods'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import { HexAddress, SrcAddress } from '@/types/constants'

import { objectMap, replaceValue } from '../../functions/objectMethods'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import useConcentrated from '../concentrated/useConcentrated'
import useFarms from '../farms/useFarms'
import useLiquidity from '../liquidity/useLiquidity'
import { usePools } from '../pools/usePools'
import { useSwap } from '../swap/useSwap'
import useWallet from '../wallet/useWallet'

import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { initiallySortTokens } from './initiallySortTokens'
import { mergeToken } from './mergeToken'
import { QuantumSOL, QuantumSOLVersionSOL, QuantumSOLVersionWSOL } from './quantumSOL'
import { rawTokenListConfigs } from './rawTokenLists.config'
import {
  RaydiumDevTokenListJsonFile,
  RaydiumTokenListJsonFile,
  SplToken,
  TokenJson,
  TokenListConfigType,
  TokenListFetchConfigItem
} from './type'
import useToken, {
  RAYDIUM_DEV_TOKEN_LIST_NAME,
  RAYDIUM_MAINNET_TOKEN_LIST_NAME,
  RAYDIUM_UNNAMED_TOKEN_LIST_NAME,
  SOLANA_TOKEN_LIST_NAME,
  SupportedTokenListSettingName
} from './useToken'
import { SOLMint } from './wellknownToken.config'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { isToken2022 } from './isToken2022'
import { makeAbortable } from '@/functions/makeAbortable'
import { useEffect } from 'react'
import { mergeObjects } from '@/functions/mergeObjects'
import { createCachedFunction } from '@/functions/createCachedFunction'

export default function useTokenListsLoader() {
  const walletRefreshCount = useWallet((s) => s.refreshCount)
  const swapRefreshCount = useSwap((s) => s.refreshCount)
  const liquidityRefreshCount = useLiquidity((s) => s.refreshCount)
  // both farms pages and stake pages
  const farmRefreshCount = useFarms((s) => s.farmRefreshCount)
  const poolRefreshCount = usePools((s) => s.refreshCount)
  const clmmRefreshCount = useConcentrated((s) => s.refreshCount)
  const tokenInfoUrl = useAppAdvancedSettings((s) => s.apiUrls.tokenInfo)
  useIsomorphicLayoutEffect(() => {
    clearTokenCache()
  }, [tokenInfoUrl])
  useEffect(() => {
    const { abort } = makeAbortable((canContinue) => {
      rawTokenListConfigs.forEach((config) => {
        loadTokens([config], canContinue)
      })
    })
    return abort
  }, [
    walletRefreshCount,
    swapRefreshCount,
    liquidityRefreshCount,
    farmRefreshCount,
    poolRefreshCount,
    clmmRefreshCount,
    tokenInfoUrl
  ])
}

function deleteFetchedNativeSOLToken(tokenJsons: TokenJson[]) {
  return tokenJsons.filter((token) => token.mint !== toPubString(SOLMint))
}

function isAnIncludedMint(collector: TokenInfoCollector, mint: string) {
  return Boolean(collector.tokens[mint])
}

/**
 * **mutate** token collector
 * @param collector TokenInfoCollector
 * @param tokens TokenJson[]
 * @param lowPriority default tokenJsonInfo has low propirty
 */
function collectToken(
  collector: TokenInfoCollector,
  tokens: TokenJson[],
  options?: {
    /** token info can be replaced by others or not  */
    lowPriority?: boolean
  }
) {
  for (const tokenJsonInfo of tokens) {
    collector.tokens[tokenJsonInfo.mint] = options?.lowPriority
      ? mergeToken(tokenJsonInfo, collector.tokens[tokenJsonInfo.mint])
      : mergeToken(collector.tokens[tokenJsonInfo.mint], tokenJsonInfo)
  }
}

async function fetchMainToken(response: RaydiumTokenListJsonFile, collector: TokenInfoCollector): Promise<void> {
  if (!response.official || !response.unOfficial || !response.blacklist || !response.unNamed) return
  const withoutNativeSolToken = deleteFetchedNativeSOLToken(response.official)
  withoutNativeSolToken.forEach(({ mint }) => collector.officialMints.add(mint))
  response.unOfficial.forEach(({ mint }) => collector.unOfficialMints.add(mint))
  response.unNamed.forEach(({ mint }) => collector.unNamedMints.add(mint))
  collectToken(collector, withoutNativeSolToken)
  collectToken(collector, response.unOfficial)
  collectToken(
    collector,
    response.unNamed.map((originalTokenJson) => {
      const tokenJson: TokenJson = {
        ...originalTokenJson,
        symbol: originalTokenJson.mint.slice(0, 6),
        name: originalTokenJson.mint.slice(0, 12),
        hasFreeze: Boolean(originalTokenJson.hasFreeze)
      }
      return tokenJson
    }),
    { lowPriority: true }
  )
  const blackListTokenMints = response.blacklist
  blackListTokenMints.forEach((mint) => collector.blacklist.add(mint))
}

async function fetchNormalLiquidityPoolToken(
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
  response.unOfficial.forEach(async (pool) => {
    for (const target of targets) {
      if (!isAnIncludedMint(collector, pool[target.mint])) {
        // const verified = await verifyToken(pool[target.mint], { noLog: true }) // if clmm/liquidity is faster than token list , it will cause rpc error
        const token = {
          symbol: pool[target.mint]?.slice(0, 6),
          name: pool[target.mint]?.slice(0, 12),
          mint: pool[target.mint],
          decimals: pool[target.decimal]
        }
        collectToken(collector, [token], { lowPriority: true })
      }
    }
  })
}

async function fetchClmmLiquidityPoolToken(
  response: { data: ApiClmmPoolsItem[] },
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
  response.data.forEach(async (pool) => {
    for (const target of targets) {
      if (!isAnIncludedMint(collector, pool[target.mint])) {
        // const verified = await verifyToken(pool[target.mint], { noLog: true }) // if clmm/liquidity is faster than token list , it will cause rpc error
        const token = {
          symbol: pool[target.mint]?.slice(0, 6),
          name: pool[target.mint]?.slice(0, 12),
          mint: pool[target.mint],
          decimals: pool[target.decimal]
          // hasFreeze: verified != null ? !verified : undefined
        }
        collectToken(collector, [token], { lowPriority: true })
      }
    }
  })
}

interface TokenInfoCollector {
  devMints: Set<string>
  unOfficialMints: Set<string>
  officialMints: Set<string>
  unNamedMints: Set<string>
  blacklist: Set<string>
  tokens: Record<string /* token mint */, TokenJson>
}

async function fetchTokenList(
  configs: TokenListFetchConfigItem[],
  tokenCollector: TokenInfoCollector
): Promise<unknown> {
  return Promise.all(
    configs.map((raw) => {
      const task = async () => {
        // eslint-disable-next-line no-console
        // console.time(`load ${raw.url()}`)
        const response = await jFetch<
          RaydiumTokenListJsonFile | RaydiumDevTokenListJsonFile | LiquidityPoolsJsonFile | { data: ApiClmmPoolsItem[] }
        >(raw.url())
        if (response) {
          switch (raw.type) {
            case TokenListConfigType.RAYDIUM_MAIN: {
              const handledResponse = objectMap(response as RaydiumTokenListJsonFile, (tokens) => {
                return isArray(tokens)
                  ? tokens.map((token) =>
                      isObject(token) && 'hasFreeze' in token
                        ? { ...token, hasFreeze: Boolean(token.hasFreeze) }
                        : token
                    )
                  : tokens
              })
              await fetchMainToken(handledResponse as RaydiumTokenListJsonFile, tokenCollector)
              break
            }
            case TokenListConfigType.LIQUIDITY_V2:
              await fetchNormalLiquidityPoolToken(response as LiquidityPoolsJsonFile, tokenCollector)
              break
            case TokenListConfigType.LIQUIDITY_V3:
              await fetchClmmLiquidityPoolToken(response as { data: ApiClmmPoolsItem[] }, tokenCollector)
              break
            default:
              console.warn('token list type undetected, did you forgot to create this type of case?')
              break
          }
        }
        // eslint-disable-next-line no-console
        // console.timeEnd(`load ${raw.url()}`)
      }
      return task()
    })
  )
}

async function getTokenLists(
  rawListConfigs: TokenListFetchConfigItem[],
  tokenListSettings: {
    [N in SupportedTokenListSettingName]: {
      mints?: Set<HexAddress>
      disableUserConfig?: boolean
      isOn: boolean
      icon?: SrcAddress
      cannotbBeSeen?: boolean
    }
  },
  existTokens: Record<HexAddress, TokenJson>,
  existBlacklist: Set<string>
): Promise<{
  devMints: Set<string>
  unOfficialMints: Set<string>
  officialMints: Set<string>
  unNamedMints: Set<string>
  tokens: Record<string, TokenJson>
  blacklist: Set<string>
}> {
  const tokenCollector: TokenInfoCollector = {
    devMints: new Set(tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME].mints),
    unOfficialMints: new Set(tokenListSettings[SOLANA_TOKEN_LIST_NAME].mints),
    officialMints: new Set(tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME].mints),
    unNamedMints: new Set(tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME].mints),
    blacklist: new Set(existBlacklist),
    tokens: { ...existTokens }
  }
  await fetchTokenList(rawListConfigs, tokenCollector)

  // merge exist data
  tokenCollector.devMints = addItems(
    useToken.getState().tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME].mints ?? new Set<string>(),
    tokenCollector.devMints
  )
  tokenCollector.unOfficialMints = addItems(
    useToken.getState().tokenListSettings[SOLANA_TOKEN_LIST_NAME].mints ?? new Set<string>(),
    tokenCollector.unOfficialMints
  )
  tokenCollector.officialMints = addItems(
    useToken.getState().tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME].mints ?? new Set<string>(),
    tokenCollector.officialMints
  )
  tokenCollector.unNamedMints = addItems(
    useToken.getState().tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME].mints ?? new Set<string>(),
    tokenCollector.unNamedMints
  )
  tokenCollector.tokens = mergeWithOld(tokenCollector.tokens, useToken.getState().tokenJsonInfos, {
    sameKeyMergeRule: mergeToken
  })
  // check if any of fetchings is failed (has response, but not code: 200)
  // then replace it w/ current list value (if current list is not undefined)
  const checkMapping = [
    { collector: 'devMints', settings: RAYDIUM_DEV_TOKEN_LIST_NAME },
    { collector: 'officialMints', settings: RAYDIUM_MAINNET_TOKEN_LIST_NAME },
    { collector: 'unOfficialMints', settings: SOLANA_TOKEN_LIST_NAME },
    { collector: 'unNamedMints', settings: RAYDIUM_UNNAMED_TOKEN_LIST_NAME }
  ]

  for (const pair of checkMapping) {
    if (tokenCollector[pair.collector].length === 0 && tokenListSettings[pair.settings].mints) {
      tokenCollector[pair.collector] = Array.from(tokenListSettings[pair.settings].mints)
    }
  }

  return tokenCollector
}

export function createSplToken(
  info: Partial<TokenJson> & {
    mint: HexAddress
    decimals: number
    userAdded?: boolean /* only if token is added by user */
    isToken2022?: boolean
  },
  customTokenIcons?: Record<string, SrcAddress>
): SplToken {
  const splTokenKeys = [
    'mint',
    'symbol',
    'name',
    'decimals',
    'isToken2022',
    'extensions',
    'programIds',
    'id',
    'icon',
    'userAdded',
    'hasFreeze'
  ]
  const tokenIsToken2022 = createCachedFunction(() => info.isToken2022 ?? isToken2022(info))
  const token = createCachedFunction(() => {
    const { mint, symbol, name, decimals, extensions, ...rest } = info
    // TODO: recordPubString(token.mint)
    const splToken = mergeObjects(
      new Token(tokenIsToken2022() ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID, mint, decimals, symbol, name ?? symbol),
      { id: mint },
      rest
    )
    return splToken
  })
  return new Proxy(
    {},
    {
      get(_target, key) {
        switch (key) {
          case 'mint':
            return info.mint
          case 'id':
            return info.mint
          case 'symbol':
            return info.symbol
          case 'name':
            return info.name ?? info.symbol
          case 'decimals':
            return info.decimals
          case 'isToken2022':
            return tokenIsToken2022()
          case 'extensions':
            return tokenIsToken2022() ? { ...info.extensions, version: 'TOKEN2022' } : info.extensions
          case 'programIds':
            return tokenIsToken2022() ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
          case 'icon':
            return customTokenIcons?.[info.mint] ?? info.icon
          default:
            return info[key] ?? token()[key]
        }
      },
      has: (_target, key) => splTokenKeys.includes(key as string),
      getPrototypeOf: () => ({}),
      ownKeys: () => splTokenKeys,
      // for Object.keys to filter
      getOwnPropertyDescriptor: (_target, prop) => ({
        value: undefined,
        enumerable: true,
        configurable: true
      })
    }
  ) as SplToken
  // const { mint, symbol, name, decimals, isToken2022: optIsToken2022 = isToken2022(info), extensions, ...rest } = info
  // // TODO: recordPubString(token.mint)
  // const splToken = mergeObjects(
  //   new Token(optIsToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID, mint, decimals, symbol, name ?? symbol),
  //   { id: mint },
  //   rest
  // )
  // if (customTokenIcons?.[mint]) {
  //   splToken.icon = customTokenIcons[mint]
  // }
  // if (optIsToken2022) {
  //   splToken.extensions = { ...extensions, version: 'TOKEN2022' }
  // }
  // return splToken
}

export function toSplTokenInfo(splToken: SplToken): TokenJson {
  return {
    ...splToken,
    mint: toPubString(splToken.mint)
  }
}

async function loadTokens(inputTokenListConfigs: TokenListFetchConfigItem[], canContinue: () => boolean) {
  const { tokenListSettings, tokenJsonInfos, blacklist: existBlacklist } = useToken.getState()
  // const customTokenIcons = await fetchTokenIconInfoList()
  console.time('fetchTokenLists')
  const fetched = await getTokenLists(inputTokenListConfigs, tokenListSettings, tokenJsonInfos, existBlacklist)
  console.timeEnd('fetchTokenLists')

  if (!canContinue()) return

  const isSameAsOlder =
    isSubSet(fetched.devMints, tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME].mints ?? new Set()) &&
    isSubSet(fetched.officialMints, tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME].mints ?? new Set()) &&
    isSubSet(fetched.unOfficialMints, tokenListSettings[SOLANA_TOKEN_LIST_NAME].mints ?? new Set()) &&
    isSubSet(fetched.unNamedMints, tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME].mints ?? new Set())
  if (isSameAsOlder) return

  const { devMints, unOfficialMints, officialMints, unNamedMints, tokens: allTokens, blacklist } = fetched

  const blacklistSet = new Set(blacklist)
  const unsortedTokenInfos = Object.values(allTokens)
    /* shake off tokens in raydium blacklist */
    .filter((info) => !blacklistSet.has(info.mint))

  console.time('sort')
  const splTokenJsonInfos = listToMap(
    initiallySortTokens(unsortedTokenInfos, officialMints, unOfficialMints),
    (i) => i.mint
  )
  console.timeEnd('sort')

  console.time('createSplToken')
  const pureTokens = objectMap(splTokenJsonInfos, (tokenJsonInfo) => createSplToken(tokenJsonInfo))
  console.timeEnd('createSplToken')

  /** have QSOL */
  const tokens = { ...pureTokens, [toPubString(QuantumSOL.mint)]: QuantumSOL }

  console.time('pickout wsol')
  const verboseTokens = [
    QuantumSOLVersionSOL,
    ...Object.values(replaceValue(pureTokens, (v, k) => k === toPubString(WSOL.mint), QuantumSOLVersionWSOL))
  ]
  console.timeEnd('pickout wsol')

  console.time('load canFlaggedTokenMints')
  const canFlaggedTokenMints = new Set(
    Object.values(tokens)
      .filter((token) => !officialMints.has(toPubString(token.mint)))
      .map((token) => toPubString(token.mint))
  )
  console.timeEnd('load canFlaggedTokenMints')
  useToken.setState((s) => {
    console.time('merged')
    const merged = mergeWithOld(canFlaggedTokenMints, s.canFlaggedTokenMints)
    console.timeEnd('merged')
    console.time('newSettings')
    const newSettings = {
      ...s.tokenListSettings,
      [RAYDIUM_MAINNET_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME],
        mints: officialMints
      },
      [SOLANA_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[SOLANA_TOKEN_LIST_NAME],
        mints: unOfficialMints
      },
      [RAYDIUM_DEV_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME],
        mints: devMints
      },
      [RAYDIUM_UNNAMED_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME],
        mints: unNamedMints
      }
    }
    console.timeEnd('newSettings')
    return {
      canFlaggedTokenMints: merged,
      blacklist: blacklist,
      tokenListSettings: newSettings,
      tokenJsonInfos: allTokens,
      tokens: tokens,
      pureTokens: pureTokens,
      verboseTokens: verboseTokens
    }
  })
}

/**
 * when api change, clear token cache
 */
function clearTokenCache() {
  useToken.setState((s) => ({
    canFlaggedTokenMints: new Set(),
    blacklist: new Set(),
    tokenListSettings: {
      ...s.tokenListSettings,

      [RAYDIUM_MAINNET_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME],
        mints: new Set()
      },
      [SOLANA_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[SOLANA_TOKEN_LIST_NAME],
        mints: new Set()
      },

      [RAYDIUM_DEV_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME],
        mints: new Set()
      },
      [RAYDIUM_UNNAMED_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME],
        mints: new Set()
      }
    },
    tokenJsonInfos: {},
    tokens: {},
    pureTokens: {},
    verboseTokens: []
  }))
}
