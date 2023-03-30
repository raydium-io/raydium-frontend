import { useMemo } from 'react'
import { useRouter } from 'next/router'

import { Endpoint } from '@/application/connection/type'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { offsetDateTime } from '@/functions/date/dateFormat'
import jFetch from '@/functions/dom/jFetch'
import { lazyMap } from '@/functions/lazyMap'
import { useTransitionedEffect } from '@/hooks/useTransitionedEffect'

import useConnection from '../connection/useConnection'
import { usePools } from '../pools/usePools'
import useToken from '../token/useToken'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'

import { fetchFarmAprJsonInfos, fetchFarmJsonInfos, hydrateFarmInfo, mergeSdkFarmInfo } from './handleFarmInfo'
import useFarms from './useFarms'
import useAppSettings from '../common/useAppSettings'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { isInBonsaiTest, isInLocalhost } from '@/functions/judgers/isSSR'

export default function useFarmInfoLoader() {
  const { pathname } = useRouter()
  const { jsonInfos, sdkParsedInfos, farmRefreshCount, blockSlotCount } = useFarms()
  const liquidityJsonInfos = useLiquidity((s) => s.jsonInfos)
  const pairs = usePools((s) => s.rawJsonInfos)
  const getToken = useToken((s) => s.getToken)
  const getLpToken = useToken((s) => s.getLpToken)
  const lpTokens = useToken((s) => s.lpTokens)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset) ?? 0
  const currentBlockChainDate = offsetDateTime(Date.now() + chainTimeOffset, { minutes: 0 /* force */ })

  const apiUrls = useAppAdvancedSettings((s) => s.apiUrls)
  const farmInfoApi = useAppAdvancedSettings((s) => s.apiUrls.farmInfo)
  const farmAprInfo = useAppAdvancedSettings((s) => s.apiUrls.farmApr)
  const programIds = useAppAdvancedSettings((s) => s.programIds)

  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)
  const lpPrices = usePools((s) => s.lpPrices)
  const aprs = useMemo(
    () => Object.fromEntries(pairs.map((i) => [i.ammId, { apr30d: i.apr30d, apr7d: i.apr7d, apr24h: i.apr24h }])),
    [pairs]
  )
  const shouldLoadInfo = useMemo(() => !pathname.includes('swap'), [pathname.includes('swap')])

  // auto fetch json farm info when init
  useRecordedEffect(
    async ([prevRefreshCount]) => {
      if (!shouldLoadInfo) return
      if (prevRefreshCount === farmRefreshCount && useFarms.getState().jsonInfos.length) return
      const farmJsonInfos = await fetchFarmJsonInfos()
      if (farmInfoApi !== apiUrls.farmInfo) return
      if (farmJsonInfos) useFarms.setState({ jsonInfos: farmJsonInfos })
    },
    [farmRefreshCount, shouldLoadInfo, farmInfoApi]
  )

  // auto fetch json farm apr info when init
  useRecordedEffect(
    async ([prevRefreshCount]) => {
      if (!shouldLoadInfo) return
      if (prevRefreshCount === farmRefreshCount && useFarms.getState().jsonFarmAprInfos.length) return
      const farmAprJsonInfos = await fetchFarmAprJsonInfos()
      if (farmAprInfo !== apiUrls.farmApr) return
      if (farmAprJsonInfos) useFarms.setState({ jsonFarmAprInfos: farmAprJsonInfos })
    },
    [farmRefreshCount, farmAprInfo, shouldLoadInfo]
  )

  // auto fetch json farm info when init
  useTransitionedEffect(async () => {
    useFarms.setState({ haveUpcomingFarms: jsonInfos.some((info) => info.upcoming) })
  }, [jsonInfos])

  // auto sdkParse
  useTransitionedEffect(async () => {
    if (!jsonInfos || !connection) return
    if (!jsonInfos?.length) return
    const sdkParsedInfos = await mergeSdkFarmInfo(
      {
        connection,
        pools: jsonInfos.map(jsonInfo2PoolKeys),
        owner,
        config: { commitment: 'confirmed', batchRequest: !isInLocalhost && !isInBonsaiTest },
        chainTime: (Date.now() + chainTimeOffset) / 1000
      },
      { jsonInfos }
    )
    useFarms.setState({ sdkParsedInfos })
  }, [jsonInfos, connection, owner, programIds])

  // auto hydrate
  // hydrate action will depends on other state, so it will rerender many times
  useTransitionedEffect(async () => {
    const hydratedInfos = await lazyMap({
      source: sdkParsedInfos,
      loopTaskName: 'hydrate farm info',
      loopFn: (farmInfo) =>
        farmInfo &&
        hydrateFarmInfo(farmInfo, {
          getToken,
          getLpToken,
          lpPrices,
          tokenPrices,
          liquidityJsonInfos,
          blockSlotCountForSecond: blockSlotCount,
          aprs,
          currentBlockChainDate, // same as chainTimeOffset
          chainTimeOffset // same as currentBlockChainDate
        }),
      options: { priority: pathname.includes('farm') ? 1 : 0 }
    })
    const shaked = shakeUndifindedItem(hydratedInfos)

    useFarms.setState({ hydratedInfos: shaked, isLoading: false })
  }, [
    aprs,
    sdkParsedInfos,
    getToken,
    lpPrices,
    tokenPrices,
    getLpToken,
    lpTokens,
    liquidityJsonInfos,
    chainTimeOffset, // when connection is ready, should get connection's chain time),
    blockSlotCount
  ])
}

/**
 * to calc apr use true onChain block slot count
 */
export async function getSlotCountForSecond(currentEndPoint: Endpoint | undefined) {
  if (!currentEndPoint) {
    useFarms.setState({ blockSlotCount: 2 })
    return
  }
  const result = await jFetch<{
    result: {
      numSlots: number
      numTransactions: number
      samplePeriodSecs: number
      slot: number
    }[]
  }>(currentEndPoint.url, {
    method: 'post',
    ignoreCache: true,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: 'getRecentPerformanceSamples',
      jsonrpc: '2.0',
      method: 'getRecentPerformanceSamples',
      params: [4]
    })
  })
  if (!result) {
    useFarms.setState({ blockSlotCount: 2 })
    return
  }

  const performanceList = result.result
  const slotList = performanceList.map((item) => item.numSlots)
  useFarms.setState({ blockSlotCount: slotList.reduce((a, b) => a + b, 0) / slotList.length / 60 })
  return
}
