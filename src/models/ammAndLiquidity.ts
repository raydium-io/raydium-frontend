/**
 * `/models` are the data center of `/application`
 * while `/application` is the interface of `/pages` and `/pageComponents`
 * @todo not burn old yet
 */

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import { useSwap } from '@/application/swap/useSwap'
import { deUIToken, deUITokenAmount } from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import assert from '@/functions/assert'
import jFetch from '@/functions/dom/jFetch'
import listToMap from '@/functions/format/listToMap'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'
import { Connection, PublicKey } from '@solana/web3.js'
import {
  AmmV3,
  AmmV3PoolInfo,
  AmmV3PoolPersonalPosition,
  ApiAmmV3PoolInfo,
  LiquidityPoolsJsonFile,
  TickCacheType,
  TradeV2,
  ZERO
} from 'test-r-sdk'

const apiCache = {} as {
  ammV3?: ApiAmmV3PoolInfo[]
  liquidity?: LiquidityPoolsJsonFile
}

type SDKPoolCache = ReturnType<typeof AmmV3['fetchMultiplePoolInfos']>

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
  // console.log('ammV3: ', ammV3)

  const { chainTimeOffset } = useConnection.getState()
  const chainTime = (chainTimeOffset ?? 0 + Date.now()) / 1000

  // console.time('getParsedAmmV3PoolInfo')
  // TODO: can Promised function be aborted
  const sdkParsedAmmV3PoolInfo = await getParsedAmmV3PoolInfo({ connection, apiAmmPools: ammV3 })
  // console.log('sdkParsedAmmV3PoolInfo: ', sdkParsedAmmV3PoolInfo)
  const { routes, poolInfosCache, tickCache } = getSDKCacheInfos({
    connection,
    inputMint: input.mint,
    outputMint: output.mint,
    apiPoolList: apiPoolList,
    sdkParsedAmmV3PoolInfo
  })
  // console.timeEnd('getParsedAmmV3PoolInfo')

  // console.log(
  // 'getAllRouteComputeAmountOut params: ',
  // toHumanReadable({
  // directPath: routes.directPath,
  //     routePathDict: routes.routePathDict,
  //     simulateCache: poolInfosCache,
  //     tickCache,
  //     inputTokenAmount: deUITokenAmount(toTokenAmount(input, inputAmount)),
  //     outputToken: deUIToken(output),
  //     slippage: toPercent(slippageTolerance)
  //   }),
  //   toString(inputAmount)
  // )
  // console.time('1')
  const simulateCache = await poolInfosCache
  // console.timeEnd('1')

  // console.time('2')
  const tickCache2 = await tickCache
  // console.timeEnd('2')

  const routeList = await TradeV2.getAllRouteComputeAmountOut({
    directPath: routes.directPath,
    routePathDict: routes.routePathDict,
    simulateCache: simulateCache,
    tickCache: tickCache2,
    inputTokenAmount: deUITokenAmount(toTokenAmount(input, inputAmount, { alreadyDecimaled: true })),
    outputToken: deUIToken(output),
    slippage: toPercent(slippageTolerance),
    chainTime
  })

  // console.log(
  //   'params: ',
  //   toHumanReadable({
  //     directPath: routes.directPath,
  //     routePathDict: routes.routePathDict,
  //     simulateCache: simulateCache,
  //     tickCache: tickCache2,
  //     inputTokenAmount: deUITokenAmount(toTokenAmount(input, inputAmount, { alreadyDecimaled: true })),
  //     outputToken: deUIToken(output),
  //     slippage: toPercent(slippageTolerance),
  //     chainTime
  //   })
  // )

  // console.log('routeList: ', routeList)
  // console.log(
  //   routeList.map((i) =>
  //     i.routeType === 'amm'
  //       ? {
  //           type: i.routeType,
  //           inValue: i.amountIn.toFixed(),
  //           value: i.amountOut.toFixed(),
  //           v1: i.poolKey[0].version,
  //           p1: String(i.poolKey[0].id),
  //           priceI: i.priceImpact.denominator.eq(ZERO) ? 0 : i.priceImpact.toFixed(5)
  //         }
  //       : {
  //           type: i.routeType,
  //           inValue: i.amountIn.toFixed(),
  //           value: i.amountOut.toFixed(),
  //           v1: i.poolKey[0].version,
  //           v2: i.poolKey[1].version,
  //           p1: String(i.poolKey[0].id),
  //           p2: String(i.poolKey[1].id),
  //           priceI: i.priceImpact.denominator.eq(ZERO) ? 0 : i.priceImpact.toFixed(5)
  //         }
  //   )
  // )
  // console.log('routeList', routeList.length)

  return routeList
}
