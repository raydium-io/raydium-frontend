import useAsyncEffect from '@/hooks/useAsyncEffect'

import useConnection from '../connection/useConnection'
import { usePools } from '../pools/usePools'
import useToken from '../token/useToken'
import useWallet from '../wallet/useWallet'
import useFarms from './useFarms'
import { fetchFarmJsonInfos, hydrateFarmInfo, mergeSdkFarmInfo } from './handleFarmInfo'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { jsonInfo2PoolKeys } from '@raydium-io/raydium-sdk'
import { useMemo } from 'react'
import { Connection } from '@solana/web3.js'
import jFetch from '@/functions/dom/jFetch'
import { Endpoint } from '@/application/connection/fetchRPCConfig'

export default function useFarmInfoFetcher() {
  const { jsonInfos, sdkParsedInfos, farmRefreshCount } = useFarms()
  const liquidityJsonInfos = useLiquidity((s) => s.jsonInfos)
  const pairs = usePools((s) => s.jsonInfos)
  const getToken = useToken((s) => s.getToken)
  const getLpToken = useToken((s) => s.getLpToken)
  const lpTokens = useToken((s) => s.lpTokens)
  const tokenPrices = useToken((s) => s.tokenPrices)

  const connection = useConnection((s) => s.connection)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const currentEndPoint = useConnection((s) => s.currentEndPoint)
  const owner = useWallet((s) => s.owner)
  const lpPrices = usePools((s) => s.lpPrices)

  const aprs = useMemo(() => Object.fromEntries(pairs.map((i) => [i.ammId, i.apr7d])), [pairs])

  // auto fetch json farm info when init
  useAsyncEffect(async () => {
    const farmJsonInfos = await fetchFarmJsonInfos()
    if (farmJsonInfos) useFarms.setState({ jsonInfos: farmJsonInfos })
  }, [farmRefreshCount])

  // auto fetch json farm info when init
  useAsyncEffect(async () => {
    useFarms.setState({ haveUpcomingFarms: jsonInfos.some((info) => info.upcoming) })
  }, [jsonInfos])

  // auto sdkParse
  useAsyncEffect(async () => {
    if (!jsonInfos || !connection) return
    if (!jsonInfos?.length) return
    const sdkParsedInfos = await mergeSdkFarmInfo(
      {
        connection,
        pools: jsonInfos.map(jsonInfo2PoolKeys),
        owner,
        config: { commitment: 'confirmed' }
      },
      { jsonInfos }
    )
    useFarms.setState({ sdkParsedInfos })
  }, [jsonInfos, connection, owner])

  // auto hydrate
  // hydrate action will depends on other state, so it will rerender many times
  useAsyncEffect(async () => {
    const blockSlotCountForSecond = await getSlotCountForSecond(currentEndPoint)
    const hydratedInfos = sdkParsedInfos?.map((farmInfo) =>
      hydrateFarmInfo(farmInfo, {
        getToken,
        getLpToken,
        lpPrices,
        tokenPrices,
        liquidityJsonInfos,
        blockSlotCountForSecond,
        chainTimeOffset,
        aprs
      })
    )

    useFarms.setState({ hydratedInfos, isLoading: hydratedInfos.length === 0 })

    useFarms.setState({ hydratedInfos, isLoading: hydratedInfos.length === 0 })
  }, [
    aprs,
    sdkParsedInfos,
    getToken,
    lpPrices,
    tokenPrices,
    getLpToken,
    lpTokens,
    liquidityJsonInfos,
    chainTimeOffset // when connection is ready, should get connection's chain time)
  ])
}

/**
 * to calc apr use true onChain block slot count
 */
export async function getSlotCountForSecond(currentEndPoint: Endpoint | undefined): Promise<number> {
  if (!currentEndPoint) return 2
  const result = await jFetch<{
    result: {
      numSlots: number
      numTransactions: number
      samplePeriodSecs: number
      slot: number
    }[]
  }>(currentEndPoint.url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 'getRecentPerformanceSamples',
      jsonrpc: '2.0',
      method: 'getRecentPerformanceSamples',
      params: [100]
    })
  })
  if (!result) return 2

  const performanceList = result.result
  const slotList = performanceList.map((item) => item.numSlots)
  return slotList.reduce((a, b) => a + b, 0) / slotList.length / 60
}
