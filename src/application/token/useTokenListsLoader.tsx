import { ApiAmmV3PoolsItem, LiquidityPoolsJsonFile, Token, WSOL } from '@raydium-io/raydium-sdk'

import { mergeWithOld } from '@/functions/arrayMethods'
import jFetch from '@/functions/dom/jFetch'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { isArray, isObject } from '@/functions/judgers/dateType'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { useTransitionedEffect } from '@/hooks/useTransitionedEffect'
import { HexAddress, SrcAddress } from '@/types/constants'
import { objectMap, replaceValue } from '../../functions/objectMethods'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import useConcentrated from '../concentrated/useConcentrated'
import useFarms from '../farms/useFarms'
import useLiquidity from '../liquidity/useLiquidity'
import { usePools } from '../pools/usePools'
import { useSwap } from '../swap/useSwap'
import useWallet from '../wallet/useWallet'
import { verifyToken } from './getOnlineTokenInfo'
import { initiallySortTokens } from './initiallySortTokens'
import { QuantumSOL, QuantumSOLVersionSOL, QuantumSOLVersionWSOL } from './quantumSOL'
import { rawTokenListConfigs } from './rawTokenLists.config'
import {
  RaydiumDevTokenListJsonInfo,
  RaydiumTokenListJsonInfo,
  SplToken,
  TokenJson,
  TokenListConfigType,
  TokenListFetchConfigItem
} from './type'
import useToken, {
  OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME,
  RAYDIUM_DEV_TOKEN_LIST_NAME,
  RAYDIUM_MAINNET_TOKEN_LIST_NAME,
  RAYDIUM_UNNAMED_TOKEN_LIST_NAME,
  SOLANA_TOKEN_LIST_NAME,
  SupportedTokenListSettingName
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
  const tokenInfoUrl = useAppAdvancedSettings((s) => s.apiUrls.tokenInfo)
  useIsomorphicLayoutEffect(() => {
    clearTokenCache()
  }, [tokenInfoUrl])
  useTransitionedEffect(() => {
    rawTokenListConfigs.forEach((config) => {
      loadTokens([config])
    })
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
  return tokenJsons.filter((tj) => tj.mint !== toPubString(SOLMint))
}

function isAnIncludedMint(collector: TokenInfoCollector, mint: string) {
  return (
    collector.officialMints.has(mint) ||
    collector.unOfficialMints.has(mint) ||
    collector.devMints.has(mint) ||
    collector.unNamedMints.has(mint) ||
    collector.otherLiquiditySupportedMints.has(mint)
  )
}

/**
 * **mutate** token collector
 * @param collector TokenInfoCollector
 * @param tokens TokenJson[]
 * @param lowPriority default tokenJsonInfo has low propirty
 */
function addToken(
  collector: TokenInfoCollector,
  tokens: TokenJson[],
  options?: {
    /** token info can be replaced by others or not  */
    lowPriority?: boolean
  }
) {
  for (const tokenJsonInfo of tokens) {
    collector.tokens[tokenJsonInfo.mint] = options?.lowPriority
      ? { ...tokenJsonInfo, ...collector.tokens[tokenJsonInfo.mint] }
      : { ...collector.tokens[tokenJsonInfo.mint], ...tokenJsonInfo }
  }
}

async function mainTokenFetch(response: RaydiumTokenListJsonInfo, collector: TokenInfoCollector): Promise<void> {
  if (!response.official || !response.unOfficial || !response.blacklist || !response.unNamed) return
  const tmpDelNativeSolToken = deleteFetchedNativeSOLToken(response.official)
  const officialMints = tmpDelNativeSolToken.map(({ mint }) => mint)
  officialMints.forEach((mint) => collector.officialMints.add(mint))
  const unOfficialMints = response.unOfficial.map(({ mint }) => mint)
  unOfficialMints.forEach((mint) => collector.unOfficialMints.add(mint))
  const unNamedMints = response.unNamed.map(({ mint }) => mint)
  unNamedMints.forEach((mint) => collector.unNamedMints.add(mint))
  addToken(collector, tmpDelNativeSolToken)
  addToken(collector, response.unOfficial)
  addToken(
    collector,
    response.unNamed.map((originalTokenJson) => {
      const tokenJson: TokenJson = {
        ...originalTokenJson,
        symbol: originalTokenJson.mint.slice(0, 6),
        name: originalTokenJson.mint.slice(0, 12),
        extensions: {},
        icon: '',
        hasFreeze: originalTokenJson.hasFreeze
      }
      return tokenJson
    }),
    { lowPriority: true }
  )
  const blackListTokenMints = response.blacklist
  blackListTokenMints.forEach((mint) => collector.blacklist.add(mint))

  // clean other liquidity supported mints
  for (const mint of [...officialMints, ...unOfficialMints, ...unNamedMints, ...blackListTokenMints]) {
    collector.otherLiquiditySupportedMints.delete(mint)
  }
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
  response.unOfficial.forEach(async (pool) => {
    for (const target of targets) {
      if (!isAnIncludedMint(collector, pool[target.mint])) {
        collector.otherLiquiditySupportedMints.add(pool[target.mint])
        const hasFreeze = await verifyToken(target.mint, { noLog: true })
        const token = {
          symbol: pool[target.mint].substring(0, 6),
          name: pool[target.mint].substring(0, 6),
          mint: pool[target.mint],
          decimals: pool[target.decimal],
          extensions: {
            coingeckoId: ''
          },
          icon: '',
          hasFreeze
        }
        addToken(collector, [token], { lowPriority: true })
      }
    }
  })
}
async function ClmmLiquidityPoolTokenFetch(
  response: { data: ApiAmmV3PoolsItem[] },
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
        collector.otherLiquiditySupportedMints.add(pool[target.mint])
        const hasFreeze = await verifyToken(target.mint, { noLog: true })
        const token = {
          symbol: pool[target.mint].substring(0, 6),
          name: pool[target.mint].substring(0, 6),
          mint: pool[target.mint],
          decimals: pool[target.decimal],
          extensions: {
            coingeckoId: ''
          },
          icon: '',
          hasFreeze
        }
        addToken(collector, [token], { lowPriority: true })
      }
    }
  })
}

interface TokenInfoCollector {
  devMints: Set<string>
  unOfficialMints: Set<string>
  officialMints: Set<string>
  otherLiquiditySupportedMints: Set<string>
  unNamedMints: Set<string>
  blacklist: Set<string>
  tokens: Record<string /* token mint */, TokenJson>
}

async function loadTokenList(
  configs: TokenListFetchConfigItem[],
  tokenCollector: TokenInfoCollector
): Promise<unknown> {
  return Promise.all(
    configs.map((raw) => {
      const task = async () => {
        // eslint-disable-next-line no-console
        console.time(`load ${raw.url()}`)
        const response = await jFetch<
          | RaydiumTokenListJsonInfo
          | RaydiumDevTokenListJsonInfo
          | LiquidityPoolsJsonFile
          | { data: ApiAmmV3PoolsItem[] }
        >(raw.url())
        if (response) {
          switch (raw.type) {
            case TokenListConfigType.RAYDIUM_MAIN: {
              const handledResponse = objectMap(response as RaydiumTokenListJsonInfo, (tokens) => {
                return isArray(tokens)
                  ? tokens.map((token) =>
                      isObject(token) && 'hasFreeze' in token
                        ? { ...token, hasFreeze: Boolean(token.hasFreeze) }
                        : token
                    )
                  : tokens
              })
              await mainTokenFetch(handledResponse as RaydiumTokenListJsonInfo, tokenCollector)
              break
            }
            case TokenListConfigType.LIQUIDITY_V2:
              await UnofficialLiquidityPoolTokenFetch(response as LiquidityPoolsJsonFile, tokenCollector)
              break
            case TokenListConfigType.LIQUIDITY_V3:
              await ClmmLiquidityPoolTokenFetch(response as { data: ApiAmmV3PoolsItem[] }, tokenCollector)
              break
            default:
              console.warn('token list type undetected, did you forgot to create this type of case?')
              break
          }
        }
        // eslint-disable-next-line no-console
        console.timeEnd(`load ${raw.url()}`)
      }
      return task()
    })
  )
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
    devMints: new Set(),
    unOfficialMints: new Set(),
    officialMints: new Set(),
    otherLiquiditySupportedMints: new Set(),
    unNamedMints: new Set(),
    blacklist: new Set(),
    tokens: {}
  }
  // eslint-disable-next-line no-console
  console.info('tokenList start fetching')

  // we need it execute in order (main->dev->v2->v3->...),
  // bcz RAYDIUM_MAIN contain almost 90% of tokens and we don't run "isAnIncludedMint" check w/ them
  // eslint-disable-next-line no-console
  console.time('load token list cost')
  await loadTokenList(rawListConfigs, tokenCollector)
  // eslint-disable-next-line no-console
  console.timeEnd('load token list cost')

  // eslint-disable-next-line no-console
  console.info('tokenList end fetching, total tokens #: ', Object.keys(tokenCollector.tokens).length)

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
  const output: {
    devMints: string[]
    unOfficialMints: string[]
    officialMints: string[]
    otherLiquiditySupportedMints: string[]
    unNamedMints: string[]
    tokens: TokenJson[]
    blacklist: string[]
  } = {
    devMints: Array.from(tokenCollector.devMints),
    unOfficialMints: Array.from(tokenCollector.unOfficialMints),
    officialMints: Array.from(tokenCollector.officialMints),
    otherLiquiditySupportedMints: Array.from(tokenCollector.otherLiquiditySupportedMints),
    unNamedMints: Array.from(tokenCollector.unNamedMints),
    tokens: Object.values(tokenCollector.tokens),
    blacklist: Array.from(tokenCollector.blacklist)
  }

  return output
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

async function loadTokens(inputTokenListConfigs: TokenListFetchConfigItem[]) {
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
  } = await fetchTokenLists(inputTokenListConfigs, tokenListSettings)
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

  const splTokenJsonInfos = listToMap(
    initiallySortTokens(unsortedTokenInfos, officialMints, unOfficialMints),
    (i) => i.mint
  )

  const pureTokens = objectMap(splTokenJsonInfos, (tokenJsonInfo) => createSplToken(tokenJsonInfo, customTokenIcons))

  /** have QSOL */
  const tokens = { ...pureTokens, [toPubString(QuantumSOL.mint)]: QuantumSOL }

  const verboseTokens = [
    QuantumSOLVersionSOL,
    ...Object.values(replaceValue(pureTokens, (v, k) => k === toPubString(WSOL.mint), QuantumSOLVersionWSOL))
  ]

  useToken.setState((s) => ({
    canFlaggedTokenMints: mergeWithOld(
      new Set(
        Object.values(tokens)
          .filter((token) => !officialMints.includes(toPubString(token.mint)))
          .map((token) => toPubString(token.mint))
      ),
      s.canFlaggedTokenMints
    ),
    blacklist: mergeWithOld(_blacklist, s.blacklist, (i) => i),
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
    tokenJsonInfos: mergeWithOld(
      listToMap(allTokens, (i) => i.mint),
      s.tokenJsonInfos
    ),
    tokens: mergeWithOld(tokens, s.tokens),
    pureTokens: mergeWithOld(pureTokens, s.pureTokens),
    verboseTokens: mergeWithOld(verboseTokens, s.verboseTokens)
  }))
}

/**
 * when api change, clear token cache
 */
function clearTokenCache() {
  useToken.setState((s) => ({
    canFlaggedTokenMints: new Set(),
    blacklist: [] as string[],
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
      [OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME],
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
