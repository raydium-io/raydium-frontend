/**
 * `/models` are the data center of `/application`
 * while `/application` is the interface of `/pages` and `/pageComponents`
 * @todo not burn old yet
 */

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import { deUIToken, deUITokenAmount } from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import assert from '@/functions/assert'
import jFetch from '@/functions/dom/jFetch'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { Numberish } from '@/types/constants'
import { Connection, PublicKey } from '@solana/web3.js'
import {
  AmmV3,
  AmmV3PoolInfo,
  AmmV3PoolPersonalPosition,
  ApiAmmV3PoolInfo,
  LiquidityPoolsJsonFile,
  ReturnTypeFetchMultiplePoolTickArrays,
  TradeV2
} from 'test-r-sdk'

const apiCache = {} as {
  ammV3?: ApiAmmV3PoolInfo[]
  liquidity?: LiquidityPoolsJsonFile
}

type PairKeyString = string

type SimulatePoolCacheType = Promise<Awaited<ReturnType<typeof TradeV2['fetchMultipleInfo']>> | undefined>

type TickCache = Promise<ReturnTypeFetchMultiplePoolTickArrays | undefined>

// TODO: timeout-map
const sdkCaches: Map<
  PairKeyString,
  {
    routes: ReturnType<typeof TradeV2['getAllRoute']>
    tickCache: TickCache
    poolInfosCache: SimulatePoolCacheType
  }
> = new Map()

export function clearSdkCache() {
  sdkCaches.clear()
}
export function clearApiCache() {
  apiCache.ammV3 = undefined
  apiCache.liquidity = undefined
}

async function getAmmV3PoolKeys() {
  const response = await jFetch<{ data: ApiAmmV3PoolInfo[] }>('https://api.raydium.io/v2/ammV3/ammPools')
  if (response) {
    return response.data
  } else {
    return []
  }
}

async function getOldKeys() {
  const response = await jFetch<LiquidityPoolsJsonFile>('https://api.raydium.io/v2/sdk/liquidity/mainnet.json')
  return response
}

const parsedAmmV3PoolInfoCache = new Map<
  string,
  {
    state: AmmV3PoolInfo
    positionAccount?: AmmV3PoolPersonalPosition[] | undefined
  }
>()

async function getParsedAmmV3PoolInfo({
  connection,
  apiAmmPools
}: {
  connection: Connection
  apiAmmPools: ApiAmmV3PoolInfo[]
}) {
  const needRefetchApiAmmPools = apiAmmPools.filter(({ id }) => !parsedAmmV3PoolInfoCache.has(toPubString(id)))

  if (needRefetchApiAmmPools.length) {
    const sdkParsed = await AmmV3.fetchMultiplePoolInfos({
      poolKeys: needRefetchApiAmmPools,
      connection,
      batchRequest: true
    })
    Object.values(sdkParsed).forEach((sdk) => {
      parsedAmmV3PoolInfoCache.set(toPubString(sdk.state.id), sdk)
    })
  }

  const apiAmmPoolsArray = apiAmmPools.map(({ id }) => parsedAmmV3PoolInfoCache.get(toPubString(id))!)
  const map = listToMap(apiAmmPoolsArray, (i) => toPubString(i.state.id))
  return map
}

async function getApiInfos() {
  if (!apiCache.ammV3) {
    apiCache.ammV3 = await getAmmV3PoolKeys()
  }
  if (!apiCache.liquidity) {
    apiCache.liquidity = await getOldKeys()
  }
  return apiCache
}
/**
 * have data cache
 */
function getSDKCacheInfos({
  connection,
  inputMint,
  outputMint,

  apiPoolList,
  sdkParsedAmmV3PoolInfo
}: {
  connection: Connection
  inputMint: PublicKey
  outputMint: PublicKey

  apiPoolList: LiquidityPoolsJsonFile
  sdkParsedAmmV3PoolInfo: Awaited<ReturnType<typeof AmmV3['fetchMultiplePoolInfos']>>
}) {
  const key = toPubString(inputMint) + toPubString(outputMint)
  if (!sdkCaches.has(key)) {
    const routes = TradeV2.getAllRoute({
      inputMint,
      outputMint,
      apiPoolList: apiPoolList,
      ammV3List: Object.values(sdkParsedAmmV3PoolInfo).map((i) => i.state)
    })
    const tickCache = AmmV3.fetchMultiplePoolTickArrays({
      connection,
      poolKeys: routes.needTickArray,
      batchRequest: false
    }).catch((err) => {
      sdkCaches.delete(key)
      return undefined
    })

    const poolInfosCache = TradeV2.fetchMultipleInfo({
      connection,
      pools: routes.needSimulate,
      batchRequest: false
    }).catch((err) => {
      sdkCaches.delete(key)
      return undefined
    })

    sdkCaches.set(key, { routes, tickCache, poolInfosCache })
  }
  return sdkCaches.get(key)!
}

export async function getAddLiquidityDefaultPool({
  connection,
  input,
  output
}: {
  connection: Connection
  input: SplToken
  output: SplToken
}) {
  const { ammV3, liquidity: apiPoolList } = await getApiInfos()
  assert(ammV3, 'ammV3 api must be loaded')
  assert(apiPoolList, 'liquidity api must be loaded')

  const sdkParsedAmmV3PoolInfo = await getParsedAmmV3PoolInfo({ connection, apiAmmPools: ammV3 })
  const { routes, poolInfosCache } = getSDKCacheInfos({
    connection,
    inputMint: input.mint,
    outputMint: output.mint,
    apiPoolList: apiPoolList,
    sdkParsedAmmV3PoolInfo: sdkParsedAmmV3PoolInfo
  })
  const awaitedPoolInfosCache = await poolInfosCache
  if (!awaitedPoolInfosCache) return
  const addLiquidityDefaultPool = TradeV2.getAddLiquidityDefaultPool({
    addLiquidityPools: routes.addLiquidityPools,
    poolInfosCache: awaitedPoolInfosCache
  })
  return addLiquidityDefaultPool
}

export async function getAllSwapableRouteInfos({
  connection = useConnection.getState().connection,
  slippageTolerance = useAppSettings.getState().slippageTolerance,
  input,
  output,
  inputAmount
}: {
  connection?: Connection
  slippageTolerance?: Numberish
  input: SplToken
  output: SplToken
  inputAmount: Numberish
}) {
  const { ammV3, liquidity: apiPoolList } = await getApiInfos()
  if (!connection) return
  assert(
    connection,
    "no connection provide. it will default useConnection's connection, but can still appointed by user"
  )
  assert(ammV3, 'ammV3 api must be loaded')
  assert(apiPoolList, 'liquidity api must be loaded')
  const { chainTimeOffset } = useConnection.getState()
  const chainTime = ((chainTimeOffset ?? 0) + Date.now()) / 1000

  const sdkParsedAmmV3PoolInfo = await getParsedAmmV3PoolInfo({ connection, apiAmmPools: ammV3 })
  const { routes, poolInfosCache, tickCache } = getSDKCacheInfos({
    connection,
    inputMint: input.mint,
    outputMint: output.mint,
    apiPoolList: apiPoolList,
    sdkParsedAmmV3PoolInfo: sdkParsedAmmV3PoolInfo
  })

  const awaitedSimulateCache = await poolInfosCache
  if (!awaitedSimulateCache) return

  const awaitedTickCache = await tickCache
  if (!awaitedTickCache) return

  const routeList = await TradeV2.getAllRouteComputeAmountOut({
    directPath: routes.directPath,
    routePathDict: routes.routePathDict,
    simulateCache: awaitedSimulateCache,
    tickCache: awaitedTickCache,
    inputTokenAmount: deUITokenAmount(toTokenAmount(input, inputAmount, { alreadyDecimaled: true })),
    outputToken: deUIToken(output),
    slippage: toPercent(slippageTolerance),
    chainTime
  })

  return routeList
}
