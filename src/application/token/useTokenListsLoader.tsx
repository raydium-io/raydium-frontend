import { LiquidityPoolsJsonFile, Token, WSOL } from '@raydium-io/raydium-sdk'

import { asyncMapAllSettled } from '@/functions/asyncMap'
import jFetch from '@/functions/dom/jFetch'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { isInBonsaiTest, isInLocalhost } from '@/functions/judgers/isSSR'
import { useEffectWithTransition } from '@/hooks/useEffectWithTransition'
import { HexAddress, PublicKeyish, SrcAddress } from '@/types/constants'

import { objectMap, replaceValue } from '../../functions/objectMethods'
import useFarms from '../farms/useFarms'
import useLiquidity from '../liquidity/useLiquidity'
import { usePools } from '../pools/usePools'
import { useSwap } from '../swap/useSwap'
import useWallet from '../wallet/useWallet'

import { QuantumSOL, QuantumSOLVersionSOL, QuantumSOLVersionWSOL, SOLUrlMint, WSOLMint } from './quantumSOL'
import {
  isRaydiumDevTokenListName, isRaydiumMainnetTokenListName, liquidityMainnetListUrl, rawTokenListConfigs
} from './rawTokenLists.config'
import {
  RaydiumDevTokenListJsonInfo, RaydiumTokenListJsonInfo, SplToken, TokenJson, TokenListFetchConfigItem
} from './type'
import useToken, {
  OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME, RAYDIUM_DEV_TOKEN_LIST_NAME, RAYDIUM_MAINNET_TOKEN_LIST_NAME,
  RAYDIUM_UNNAMED_TOKEN_LIST_NAME, SOLANA_TOKEN_LIST_NAME
} from './useToken'
import { SOLMint } from './wellknownToken.config'

export default function useTokenListsLoader() {
  const walletRefreshCount = useWallet((s) => s.refreshCount)
  const swapRefreshCount = useSwap((s) => s.refreshCount)
  const liquidityRefreshCount = useLiquidity((s) => s.refreshCount)
  // both farms pages and stake pages
  const farmRefreshCount = useFarms((s) => s.farmRefreshCount)
  const poolRefreshCount = usePools((s) => s.refreshCount)

  useEffectWithTransition(() => {
    loadTokens()
  }, [walletRefreshCount, swapRefreshCount, liquidityRefreshCount, farmRefreshCount, poolRefreshCount])
}

function deleteFetchedNativeSOLToken(tokenJsons: TokenJson[]) {
  return tokenJsons.filter((tj) => tj.mint !== toPubString(SOLMint))
}

// function uniqueItems<T>(items: T[], mapper?: (old: S)=>):T

interface UltraLiquidityPoolsJsonfile extends LiquidityPoolsJsonFile {
  baseDecimals: number
  quoteDecimals: number
  lpDecimals: number
}

function excludeAlreadyKnownMints(knownMints: string[], liquidityPools: UltraLiquidityPoolsJsonfile): TokenJson[] {
  const currentMints = [...knownMints]
  const remainTokenJsons: TokenJson[] = []
  liquidityPools.unOfficial.forEach((pool) => {
    if (!currentMints.includes(pool.baseMint)) {
      currentMints.push(pool.baseMint)
      remainTokenJsons.push({
        symbol: pool.baseMint.substring(0, 6),
        name: pool.baseMint.substring(0, 6),
        mint: pool.baseMint,
        decimals: (pool as unknown as UltraLiquidityPoolsJsonfile).baseDecimals,
        extensions: {
          coingeckoId: ''
        },
        icon: ''
      })
    }
    if (!currentMints.includes(pool.quoteMint)) {
      currentMints.push(pool.quoteMint)
      remainTokenJsons.push({
        symbol: pool.quoteMint.substring(0, 6),
        name: pool.quoteMint.substring(0, 6),
        mint: pool.quoteMint,
        decimals: (pool as unknown as UltraLiquidityPoolsJsonfile).quoteDecimals,
        extensions: {
          coingeckoId: ''
        },
        icon: ''
      })
    }
  })

  return remainTokenJsons
}

async function fetchTokenLists(rawListConfigs: TokenListFetchConfigItem[]): Promise<{
  devMints: string[]
  unOfficialMints: string[]
  officialMints: string[]
  otherLiquiditySupportedMints: string[]
  unNamedMints: string[]
  tokens: TokenJson[]
  blacklist: string[]
}> {
  const devMints: string[] = []
  const unOfficialMints: string[] = []
  const officialMints: string[] = []
  const otherLiquiditySupportedMints: string[] = []
  const unNamedMints: string[] = []
  const blacklist: string[] = []
  const tokens: TokenJson[] = []
  // eslint-disable-next-line no-console
  console.info('tokenList start fetching')
  await asyncMapAllSettled(rawListConfigs, async (raw) => {
    const response = await jFetch<RaydiumTokenListJsonInfo | RaydiumDevTokenListJsonInfo>(raw.url)
    if (isRaydiumMainnetTokenListName(response, raw.url)) {
      unOfficialMints.push(...response.unOfficial.map(({ mint }) => mint))
      officialMints.push(...deleteFetchedNativeSOLToken(response.official).map(({ mint }) => mint))
      unNamedMints.push(...response.unNamed.map((j) => j.mint))
      const fullUnnamed = response.unNamed.map(
        (j) => ({ ...j, symbol: j.mint.slice(0, 6), name: j.mint.slice(0, 12), extensions: {}, icon: '' } as TokenJson)
      )
      tokens.push(...deleteFetchedNativeSOLToken(response.official), ...response.unOfficial, ...fullUnnamed)
      blacklist.push(...response.blacklist)
    }
    if (isRaydiumDevTokenListName(response, raw.url) && (isInLocalhost || isInBonsaiTest)) {
      devMints.push(...response.tokens.map(({ mint }) => mint))
      tokens.push(...response.tokens)
    }
  })

  // we wait other token(mints above) finished their fetching, then cross match liquidity pool unofficial pool list
  // to find out the 'unknown' token, and add them to the list
  const liquidityPoolResponse = await jFetch<UltraLiquidityPoolsJsonfile>(liquidityMainnetListUrl)
  const excludesTokenJson = liquidityPoolResponse
    ? excludeAlreadyKnownMints(
        devMints.concat(unOfficialMints).concat(officialMints).concat(unNamedMints),
        liquidityPoolResponse
      )
    : undefined

  excludesTokenJson && otherLiquiditySupportedMints.push(...excludesTokenJson.map(({ mint }) => mint))
  excludesTokenJson && tokens.push(...excludesTokenJson)
  // eslint-disable-next-line no-console
  console.info('tokenList end fetching')

  return { devMints, unOfficialMints, unNamedMints, otherLiquiditySupportedMints, officialMints, tokens, blacklist }
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
  const customTokenIcons = await fetchTokenIconInfoList()
  const {
    devMints,
    unOfficialMints,
    officialMints,
    otherLiquiditySupportedMints,
    unNamedMints,
    tokens: allTokens,
    blacklist: _blacklist
  } = await fetchTokenLists(rawTokenListConfigs)
  // if length has not changed, don't parse again
  const { tokenListSettings } = useToken.getState()
  const mainnetOriginalMintsLength = tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME].mints?.size
  const solanaTokenOriginalMintsLength = tokenListSettings[SOLANA_TOKEN_LIST_NAME].mints?.size
  const devOriginalMintsLength = tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME].mints?.size
  const unnamedOriginalMintsLength = tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME].mints?.size
  if (
    devMints.length === devOriginalMintsLength &&
    officialMints.length === mainnetOriginalMintsLength &&
    unOfficialMints.length === solanaTokenOriginalMintsLength &&
    unNamedMints.length === unnamedOriginalMintsLength
  )
    return

  const blacklist = new Set(_blacklist)
  useToken.setState((s) => ({
    blacklist: _blacklist,
    tokenListSettings: {
      ...s.tokenListSettings,

      [RAYDIUM_MAINNET_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME],
        mints: new Set(officialMints)
      },

      [SOLANA_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[SOLANA_TOKEN_LIST_NAME],
        mints: new Set(unOfficialMints)
      },

      [RAYDIUM_DEV_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME],
        mints: new Set(devMints)
      },
      [OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[OTHER_LIQUIDITY_SUPPORTED_TOKEN_LIST_NAME],
        mints: new Set(otherLiquiditySupportedMints)
      },
      [RAYDIUM_UNNAMED_TOKEN_LIST_NAME]: {
        ...s.tokenListSettings[RAYDIUM_UNNAMED_TOKEN_LIST_NAME],
        mints: new Set(unNamedMints)
      }
    }
  }))

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
        .filter((token) => !s.tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME].mints?.has(String(token.mint)))
        .map((token) => String(token.mint))
    )
  }))

  /** NOTE -  getToken place 1 */
  /**
   * exact mode: 'so111111112' will be QSOl_WSOL; 'sol' will be QSOL_SOL
   * not exact mode: 'so111111112' will be QSOl(sol); 'sol' will be QSOL_SOL
   *
   */
  function getToken(mint: PublicKeyish | undefined, options?: { exact?: boolean }): SplToken | undefined {
    if (mint === SOLUrlMint || isMintEqual(mint, SOLMint) || (!options?.exact && isMintEqual(mint, WSOLMint))) {
      return QuantumSOLVersionSOL
    }
    if (options?.exact && isMintEqual(mint, WSOLMint)) {
      return QuantumSOLVersionWSOL
    }
    return tokens[toPubString(mint)]
  }

  useToken.setState({
    tokenJsonInfos: listToMap(allTokens, (i) => i.mint),
    tokens,
    pureTokens,
    verboseTokens,
    getToken
  })
}
