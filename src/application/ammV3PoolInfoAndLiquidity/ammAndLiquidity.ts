/**
 * `/models` are the data center of `/application`
 * while `/application` is the interface of `/pages` and `/pageComponents`
 * @todo not burn old yet
 */

import useAppSettings from '@/application/common/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import { deUIToken, deUITokenAmount } from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import { isDateAfter } from '@/functions/date/judges'
import jFetch from '@/functions/dom/jFetch'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isArray, isObject, isPubKeyish } from '@/functions/judgers/dateType'
import { Numberish } from '@/types/constants'
import {
  ApiClmmPoolsItem,
  ApiPoolInfo,
  Clmm,
  ClmmPoolInfo,
  PoolType,
  PublicKeyish,
  ReturnTypeFetchMultipleInfo,
  ReturnTypeFetchMultipleMintInfos,
  ReturnTypeFetchMultiplePoolTickArrays,
  ReturnTypeGetAllRouteComputeAmountOut,
  TradeV2,
  fetchMultipleMintInfos,
  ApiPoolInfoItem,
  Token
} from '@raydium-io/raydium-sdk'
import { Connection, PublicKey } from '@solana/web3.js'
import { getEpochInfo } from '../clmmMigration/getEpochInfo'
import { getSDKParsedClmmPoolInfo } from '../common/getSDKParsedClmmPoolInfo'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import { BestResultStartTimeInfo } from './type'
import useLiquidity from '../liquidity/useLiquidity'

const apiCache = {} as {
  ammV3?: ApiClmmPoolsItem[]
  liquidity?: ApiPoolInfo
}
export function clearApiCache() {
  apiCache.ammV3 = undefined
  apiCache.liquidity = undefined
  useLiquidity.setState({ extraPooInfos: [] })
}

async function getAmmV3PoolKeys() {
  const ammPoolsUrl = useAppAdvancedSettings.getState().apiUrls.clmmPools
  const response = await jFetch<{ data: ApiClmmPoolsItem[] }>(ammPoolsUrl) // note: previously Rudy has Test API for dev
  return response?.data
}

async function getOldKeys() {
  const liquidityPoolsUrl = useAppAdvancedSettings.getState().apiUrls.uiPoolInfo
  const response = await jFetch<ApiPoolInfo>(liquidityPoolsUrl)
  return response
}

async function getApiInfos(props?: { mint1: string; mint2: string }) {
  if (!apiCache.ammV3) {
    apiCache.ammV3 = await getAmmV3PoolKeys()
  }
  if (!apiCache.liquidity) {
    apiCache.liquidity = await getOldKeys()
  }
  if (props && apiCache.liquidity) {
    const [mint1, mint2] = props.mint1 < props.mint2 ? [props.mint1, props.mint2] : [props.mint2, props.mint1]
    const allPools = [...apiCache.liquidity.official, ...apiCache.liquidity.unOfficial]
    const { jsonInfos, officialIds, unOfficialIds, extraPooInfos } = useLiquidity.getState()

    if (
      !allPools.find(
        (pool) =>
          (pool.baseMint === mint1 && pool.quoteMint === mint2) || (pool.quoteMint === mint1 && pool.baseMint === mint2)
      ) ||
      !jsonInfos.find(
        (pool) =>
          (pool.baseMint === mint1 && pool.quoteMint === mint2) || (pool.quoteMint === mint1 && pool.baseMint === mint2)
      )
    ) {
      useLiquidity.setState({ extraPoolLoading: true })
      const liquidityPoolsUrl = useAppAdvancedSettings.getState().apiUrls.searchPool
      const response = await jFetch<ApiPoolInfoItem[]>(liquidityPoolsUrl + `${mint1}/${mint2}`, {
        cacheFreshTime: 1000 * 60 * 30
      })
      if (response && Array.isArray(response)) {
        const newPools = response.filter((pool) => !allPools.find((p) => p.id === pool.id))
        apiCache.liquidity.unOfficial.push(...newPools)

        const readyToUpdate = response.filter((pool) => !officialIds.has(pool.id) && !unOfficialIds.has(pool.id))
        useLiquidity.setState({
          currentJsonInfo: response[0],
          jsonInfos: [...jsonInfos, ...readyToUpdate],
          unOfficialIds: new Set([...Array.from(unOfficialIds), ...readyToUpdate.map((p) => p.id)]),
          extraPooInfos: [...extraPooInfos, ...readyToUpdate.filter((p) => !extraPooInfos.find((c) => c.id === p.id))]
        })
      }
    }
    useLiquidity.setState({ extraPoolLoading: false })
  }

  return apiCache
}

type PairKeyString = string

// TODO: timeout-map
const sdkCachesOfSwap: Map<
  PairKeyString,
  {
    mintInfos: Promise<ReturnTypeFetchMultipleMintInfos>
    routes: ReturnType<(typeof TradeV2)['getAllRoute']>
    tickCache: Promise<ReturnTypeFetchMultiplePoolTickArrays>
    poolInfosCache: ReturnType<(typeof TradeV2)['fetchMultipleInfo']>
  }
> = new Map()

export function clearSDKCacheOfSwap() {
  sdkCachesOfSwap.clear()
}

/**
 * have data cache
 */
function getSDKCacheInfosOfSwap({
  connection,
  inputMint,
  outputMint,

  apiPoolList,
  sdkParsedAmmV3PoolInfo
}: {
  connection: Connection
  inputMint: PublicKey
  outputMint: PublicKey

  apiPoolList: ApiPoolInfo
  sdkParsedAmmV3PoolInfo: Awaited<ReturnType<(typeof Clmm)['fetchMultiplePoolInfos']>>
}) {
  const key = toPubString(inputMint) + toPubString(outputMint)
  if (!sdkCachesOfSwap.has(key)) {
    const routes = TradeV2.getAllRoute({
      inputMint,
      outputMint,
      apiPoolList: apiPoolList,
      clmmList: Object.values(sdkParsedAmmV3PoolInfo).map((i) => i.state)
    })
    const mintInfos = fetchMultipleMintInfos({
      connection,
      mints: routes.needCheckToken.map((i) => toPub(i))
    }).catch((err) => {
      sdkCachesOfSwap.delete(key)
      throw err
    })
    const tickCache = Clmm.fetchMultiplePoolTickArrays({
      connection,
      poolKeys: routes.needTickArray,
      batchRequest: true
    }).catch((err) => {
      sdkCachesOfSwap.delete(key)
      throw err
    })
    const poolInfosCache = TradeV2.fetchMultipleInfo({
      connection,
      pools: routes.needSimulate,
      batchRequest: true
    }).catch((err) => {
      sdkCachesOfSwap.delete(key)
      throw err
    })

    sdkCachesOfSwap.set(key, { routes, tickCache, poolInfosCache, mintInfos })
  }
  return sdkCachesOfSwap.get(key)!
}

export async function getAddLiquidityDefaultPool({
  connection = useConnection.getState().connection,
  mint1,
  mint2
}: {
  connection?: Connection
  mint1: PublicKeyish
  mint2: PublicKeyish
}) {
  const { ammV3, liquidity: apiPoolList } = await getApiInfos({
    mint1: mint1.toString(),
    mint2: mint2.toString()
  })
  assert(isArray(ammV3), 'ammV3 api must be loaded')
  assert(apiPoolList, 'liquidity api must be loaded')
  assert(isArray(apiPoolList?.official), 'liquidity api must be loaded')
  assert(connection, 'need connection to get default')
  const isInputPublicKeyish = isPubKeyish(mint1)
  const isOutputPublicKeyish = isPubKeyish(mint2)
  if (!isInputPublicKeyish || !isOutputPublicKeyish) {
    console.error('input/output is not PublicKeyish')
    return
  }
  const sdkParsedAmmV3PoolInfo = await getSDKParsedClmmPoolInfo({ connection, apiClmmPoolItems: ammV3 })
  const { routes, poolInfosCache } = getSDKCacheInfosOfSwap({
    connection,
    inputMint: toPub(mint1),
    outputMint: toPub(mint2),
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
  const { ammV3, liquidity: apiPoolList } = await getApiInfos({
    mint1: input.mint.toBase58(),
    mint2: output.mint.toBase58()
  })
  assert(
    connection,
    "no connection provide. it will default useConnection's connection, but can still appointed by user"
  )
  assert(isArray(ammV3), 'ammV3 api must be loaded')
  assert(apiPoolList, 'liquidity api must be loaded')
  assert(isArray(apiPoolList?.official), 'liquidity api must be loaded')
  const { chainTimeOffset } = useConnection.getState()
  const chainTime = ((chainTimeOffset ?? 0) + Date.now()) / 1000

  const sdkParsedAmmV3PoolInfo = await getSDKParsedClmmPoolInfo({
    connection,
    apiClmmPoolItems: ammV3,
    cacheable: true
  })
  const { routes, poolInfosCache, tickCache, mintInfos } = getSDKCacheInfosOfSwap({
    connection,
    inputMint: input.mint,
    outputMint: output.mint,
    apiPoolList: apiPoolList,
    sdkParsedAmmV3PoolInfo: sdkParsedAmmV3PoolInfo
  })

  const [simulateResult, tickResult, mintInfosResult, nowEpochResult] = await Promise.allSettled([
    poolInfosCache,
    tickCache,
    mintInfos,
    getEpochInfo()
  ])
  if (simulateResult.status === 'rejected') return
  const awaitedSimulateCache = simulateResult.value
  if (tickResult.status === 'rejected') return
  const awaitedTickCache = tickResult.value
  if (mintInfosResult.status === 'rejected') return
  const awaitedMintInfos = mintInfosResult.value
  if (nowEpochResult.status === 'rejected') return
  const epochInfo = nowEpochResult.value

  const _outputToken = deUIToken(output)
  const outputToken = _outputToken instanceof Token ? new Token(new PublicKey(_outputToken.programId), new PublicKey(_outputToken.mint), _outputToken.decimals) : _outputToken
  const routeList = TradeV2.getAllRouteComputeAmountOut({
    directPath: routes.directPath,
    routePathDict: routes.routePathDict,
    simulateCache: awaitedSimulateCache,
    tickCache: awaitedTickCache,
    inputTokenAmount: deUITokenAmount(toTokenAmount(input, inputAmount, { alreadyDecimaled: true })),
    outputToken,
    slippage: toPercent(slippageTolerance),
    chainTime,
    epochInfo,
    mintInfos: awaitedMintInfos
  })

  // insufficientLiquidity
  const isInsufficientLiquidity =
    (routes.directPath.length > 0 || Object.keys(routes.routePathDict).length > 0) && routeList.length === 0

  const { bestResult, bestResultStartTimes } = getBestCalcResult(routeList, awaitedSimulateCache, chainTime) ?? {}
  return { routeList, bestResult, bestResultStartTimes, isInsufficientLiquidity }
}

function getBestCalcResult(
  routeList: ReturnTypeGetAllRouteComputeAmountOut,
  poolInfosCache: ReturnTypeFetchMultipleInfo | undefined,
  chainTime: number
):
  | {
    bestResult: ReturnTypeGetAllRouteComputeAmountOut[number]
    bestResultStartTimes?: BestResultStartTimeInfo[] /* only when bestResult is not ready */
  }
  | undefined {
  if (!routeList.length) return undefined
  const readyRoutes = routeList.filter((i) => i.poolReady)
  const hasReadyRoutes = Boolean(readyRoutes.length)
  if (hasReadyRoutes) {
    return { bestResult: readyRoutes[0] }
  } else {
    if (!poolInfosCache) return { bestResult: routeList[0] }

    const routeStartTimes = routeList[0].poolKey.map((i) => {
      const ammId = toPubString(i.id)
      const poolAccountInfo = i.version === 6 ? i : poolInfosCache[ammId]
      if (!poolAccountInfo) return undefined
      const startTime = Number(poolAccountInfo.startTime) * 1000
      const isPoolOpen = isDateAfter(chainTime, startTime)
      if (isPoolOpen) return undefined
      return { ammId, startTime, poolType: i, poolInfo: getPoolInfoFromPoolType(i) }
    })

    return { bestResult: routeList[0], bestResultStartTimes: shakeUndifindedItem(routeStartTimes) }
  }
}

function isAmmV3PoolInfo(poolType: PoolType): poolType is ClmmPoolInfo {
  return isObject(poolType) && 'protocolFeesTokenA' in poolType
}

function getPoolInfoFromPoolType(poolType: PoolType): BestResultStartTimeInfo['poolInfo'] {
  return {
    rawInfo: poolType,
    ammId: toPubString(poolType.id),
    baseMint: isAmmV3PoolInfo(poolType) ? toPubString(poolType.mintA.mint) : poolType.baseMint,
    quoteMint: isAmmV3PoolInfo(poolType) ? toPubString(poolType.mintB.mint) : poolType.quoteMint
  }
}
