/**
 * `/models` are the data center of `/application`
 * while `/application` is the interface of `/pages` and `/pageComponents`
 * @todo not burn old
 */

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import sdkParseJsonLiquidityInfo from '@/application/liquidity/sdkParseJsonLiquidityInfo'
import { deUIToken, deUITokenAmount, isQuantumSOLVersionSOL } from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import { SOLMint } from '@/application/token/wellknownToken.config'
import assert from '@/functions/assert'
import jFetch from '@/functions/dom/jFetch'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { HexAddress, Numberish } from '@/types/constants'
import { Connection, PublicKey } from '@solana/web3.js'
import {
  AmmV3,
  ApiAmmV3PoolInfo,
  LiquidityPoolJsonInfo,
  LiquidityPoolsJsonFile,
  TickCacheType,
  TokenAmount,
  Trade,
  TradeV2
} from 'test-r-sdk'

const apiCache = {} as {
  ammV3?: ApiAmmV3PoolInfo[]
  liquidity?: LiquidityPoolsJsonFile
}

type SDKPoolCache = ReturnType<typeof AmmV3['fetchMultiplePoolInfos']>
// IDEA: timeout-map
const sdkParsedAmmV3PoolInfo = {} as Record<string, SDKPoolCache>

type PairKeyString = string

type SimulatePoolCacheType = ReturnType<typeof TradeV2['fetchMultipleInfo']>

// TODO: timeout-map
const sdkCaches: Map<
  PairKeyString,
  {
    routes: ReturnType<typeof TradeV2['getAllRoute']>
    tickCache: Promise<TickCacheType>
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

//TODO: cache
async function getParsedAmmV3PoolInfo({
  connection,
  apiAmmPools
}: {
  connection: Connection
  apiAmmPools: ApiAmmV3PoolInfo[]
}) {
  // TODO cache for kick duplicated apiAmmPools
  const sdkParsed = await AmmV3.fetchMultiplePoolInfos({
    poolKeys: apiAmmPools,
    connection
    // ownerInfo: {
    //   tokenAccounts: tokenAccounts,
    //   wallet: owner
    // }
  })

  return sdkParsed
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
    // console.log('routes.needTickArray: ', routes.needTickArray.length)
    // console.log('routes.needSimulate: ', routes.needSimulate.length)
    // console.time('AmmV3.fetchMultiplePoolTickArrays')
    // const tickCache = await AmmV3.fetchMultiplePoolTickArrays({
    //   connection,
    //   poolKeys: routes.needTickArray,
    //   batchRequest: false
    // })
    // console.timeEnd('AmmV3.fetchMultiplePoolTickArrays')

    // console.time('TradeV2.fetchMultipleInfo')
    // const poolInfosCache = await TradeV2.fetchMultipleInfo({
    //   connection,
    //   pools: routes.needSimulate,
    //   batchRequest: false
    // })
    // console.timeEnd('TradeV2.fetchMultipleInfo')
    const [tickCache, poolInfosCache] = [
      AmmV3.fetchMultiplePoolTickArrays({ connection, poolKeys: routes.needTickArray, batchRequest: false }).catch(
        (err) => {
          console.error('AmmV3.fetchMultiplePoolTickArrays error', err)
          return err
        }
      ),
      TradeV2.fetchMultipleInfo({ connection, pools: routes.needSimulate, batchRequest: false }).catch((err) => {
        console.error('TradeV2.fetchMultipleInfo error', err)
        return err
      })
    ]
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

  const sdkParsedAmmV3PoolInfo = getParsedAmmV3PoolInfo({ connection, apiAmmPools: ammV3 })
  const { routes, poolInfosCache } = getSDKCacheInfos({
    connection,
    inputMint: input.mint,
    outputMint: output.mint,
    apiPoolList: apiPoolList,
    sdkParsedAmmV3PoolInfo: await sdkParsedAmmV3PoolInfo
  })
  const addLiquidityDefaultPool = TradeV2.getAddLiquidityDefaultPool({
    addLiquidityPools: routes.addLiquidityPools,
    poolInfosCache: await poolInfosCache
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
  assert(
    connection,
    "no connection provide. it will default useConnection's connection, but can still appointed by user"
  )
  assert(ammV3, 'ammV3 api must be loaded')
  assert(apiPoolList, 'liquidity api must be loaded')
  const sdkParsedAmmV3PoolInfo = await getParsedAmmV3PoolInfo({ connection, apiAmmPools: ammV3 })
  const { routes, poolInfosCache, tickCache } = await getSDKCacheInfos({
    connection,
    inputMint: input.mint,
    outputMint: output.mint,
    apiPoolList: apiPoolList,
    sdkParsedAmmV3PoolInfo
  })
  // console.log('getAllRouteComputeAmountOut params: ', {
  //   directPath: routes.directPath,
  //   routePathDict: routes.routePathDict,
  //   simulateCache: poolInfosCache,
  //   tickCache,
  //   inputTokenAmount: deUITokenAmount(toTokenAmount(input, inputAmount)),
  //   outputToken: deUIToken(output),
  //   slippage: toPercent(slippageTolerance)
  // })
  const routeList = await TradeV2.getAllRouteComputeAmountOut({
    directPath: routes.directPath,
    // routePathDict: {},
    routePathDict: routes.routePathDict,
    simulateCache: await poolInfosCache,
    tickCache: await tickCache,
    inputTokenAmount: deUITokenAmount(toTokenAmount(input, inputAmount)),
    outputToken: deUIToken(output),
    slippage: toPercent(slippageTolerance)
  })
  // console.log('routeList: ', routeList)
  return routeList
}
