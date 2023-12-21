import { use, useMemo } from 'react'
import { useRouter } from 'next/router'

import { Clmm, ApiClmmPoolsItem } from '@raydium-io/raydium-sdk'

import useToken from '@/application/token/useToken'
import jFetch from '@/functions/dom/jFetch'
import toPubString from '@/functions/format/toMintString'
import { lazyMap } from '@/functions/lazyMap'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useTransitionedEffect } from '@/hooks/useTransitionedEffect'

import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import useConnection from '../connection/useConnection'
import useWallet from '../wallet/useWallet'

import hydrateConcentratedInfo from './hydrateConcentratedInfo'
import useConcentrated from './useConcentrated'
import { getSDKParsedClmmPoolInfo } from '../common/getSDKParsedClmmPoolInfo'
import { useIdleEffect } from '@/hooks/useIdleEffect'

/**
 * will load concentrated info (jsonInfo, sdkParsedInfo, hydratedInfo)
 * @todo just register hooks in specific component
 */
let timerId = 0
export default function useConcentratedInfoLoader() {
  const apiAmmPools = useConcentrated((s) => s.apiAmmPools)
  const sdkParsedAmmPools = useConcentrated((s) => s.sdkParsedAmmPools)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const refreshCount = useConcentrated((s) => s.refreshCount)
  const lazyLoadChart = useConcentrated((s) => s.lazyLoadChart)
  const loadChartPointsAct = useConcentrated((s) => s.loadChartPointsAct)
  const connection = useConnection((s) => s.connection)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const tokenAccounts = useWallet((s) => s.tokenAccountRawInfos)
  const owner = useWallet((s) => s.owner)
  const tokenAccountsOwner = useWallet((s) => s.tokenAccountsOwner)
  const tokens = useToken((s) => s.tokens)
  const hydratedAmmPools = useConcentrated((s) => s.hydratedAmmPools)
  const { pathname } = useRouter()
  const apiUrls = useAppAdvancedSettings((s) => s.apiUrls)
  const clmmPoolsUrl = useAppAdvancedSettings((s) => s.apiUrls.clmmPools)

  const shouldLoadInfo = true // temp always load position info to detect if user has position
  const inClmmPage = useMemo(() => pathname.includes('clmm'), [pathname.includes('clmm')])
  const inLiquidityPage = useMemo(() => pathname.includes('liquidity'), [pathname.includes('liquidity')])
  const inFarmPage = useMemo(() => pathname.includes('farm'), [pathname.includes('farm')])
  const inCreatePoolPage = useMemo(() => pathname.includes('create-pool'), [pathname.includes('create-pool')])
  const shouldLoadHydrateInfo = inClmmPage || inLiquidityPage || inFarmPage
  const shouldLoadChartPoints = inClmmPage && !inCreatePoolPage

  /** fetch api json info list  */
  useRecordedEffect(
    async ([prevRefreshCount]) => {
      const shouldForceRefresh = prevRefreshCount != null && refreshCount !== prevRefreshCount
      if (!apiAmmPools) return // only bug in localhost HMR, it's not a real problem
      if (!shouldForceRefresh && !shouldLoadInfo) return
      if (prevRefreshCount === refreshCount && apiAmmPools.length) return
      const response = await jFetch<{ data: ApiClmmPoolsItem[] }>(clmmPoolsUrl) // note: previously Rudy has Test API for dev
      if (clmmPoolsUrl !== apiUrls.clmmPools) return
      useConcentrated.setState({ apiAmmPools: response?.data })
    },
    [refreshCount, clmmPoolsUrl, shouldLoadInfo]
  )

  /**  api json info list ➡ SDK info list */
  useIdleEffect(async () => {
    clearTimeout(timerId)
    if (!connection) return
    if (chainTimeOffset == null) return
    if (!apiAmmPools || apiAmmPools.length === 0) return
    const isWaitingTokenAcc = !!owner && !tokenAccounts.length
    timerId = window.setTimeout(
      async () => {
        const sdkParsed = await getSDKParsedClmmPoolInfo({
          connection,
          apiClmmPoolItems: apiAmmPools,
          ownerInfo: owner ? { tokenAccounts: tokenAccounts, wallet: owner } : undefined
        })
        if (sdkParsed) {
          useConcentrated.setState({ sdkParsedAmmPools: Object.values(sdkParsed), originSdkParsedAmmPools: sdkParsed })
        }
      },
      // if is waiting token acc, wait longer, if it's refresh wait 500ms, if it's firs time loading set to 0
      (isWaitingTokenAcc ? 1000 : useConcentrated.getState().sdkParsedAmmPools.length > 0 ? 500 : 0) +
        50 /* ensure token parse is after cache clear */
    )
  }, [apiAmmPools, connection, toPubString(owner), toPubString(tokenAccountsOwner), chainTimeOffset, tokenAccounts])

  /** SDK info list ➡ hydrated info list */
  useTransitionedEffect(async () => {
    if (!connection) return // don't hydrate when connection is not ready
    if (!Object.keys(tokens).length) return // don't hydrate when token is not loaded
    if (!sdkParsedAmmPools || sdkParsedAmmPools.length === 0) return
    if (!shouldLoadHydrateInfo) return
    const sdkParsedAmmPoolsList = Object.values(sdkParsedAmmPools)

    const hydratedInfos = await lazyMap({
      source: sdkParsedAmmPoolsList,
      loopTaskName: 'hydrate clmm pool Info',
      loopFn: (sdkParsed) => hydrateConcentratedInfo(sdkParsed),
      options: { priority: shouldLoadInfo ? 1 : 0 }
    })

    useConcentrated.setState({ hydratedAmmPools: hydratedInfos, loading: hydratedInfos.length === 0 })

    // update current amm pool
    const oldAmmPoolId = useConcentrated.getState().currentAmmPool?.id
    if (oldAmmPoolId) {
      const updateAmmPool = hydratedInfos.find((i) => i.id.equals(oldAmmPoolId))
      if (updateAmmPool) {
        useConcentrated.setState({ currentAmmPool: updateAmmPool })
      }

      const oldUserPositionNftMint = useConcentrated.getState().targetUserPositionAccount?.nftMint
      const updatedUserPosition =
        oldUserPositionNftMint &&
        updateAmmPool?.userPositionAccount?.find((p) => p.nftMint.equals(oldUserPositionNftMint))
      if (updatedUserPosition) {
        useConcentrated.setState({ targetUserPositionAccount: updatedUserPosition })
      }
    }
  }, [sdkParsedAmmPools, connection, tokens, shouldLoadInfo, shouldLoadHydrateInfo])

  /** select pool chart data */
  useTransitionedEffect(async () => {
    if (lazyLoadChart) return
    if (!currentAmmPool) {
      useConcentrated.setState({ chartPoints: [] })
      return
    }
    if (!shouldLoadChartPoints) return
    loadChartPointsAct(toPubString(currentAmmPool.state.id))
  }, [currentAmmPool?.idString, tokens, lazyLoadChart, loadChartPointsAct, shouldLoadChartPoints])

  /** update currentAmmPool */
  useTransitionedEffect(async () => {
    if (!currentAmmPool || !currentAmmPool.idString) return
    if (hydratedAmmPools) {
      const targetPool = hydratedAmmPools.filter((i) => i.idString === currentAmmPool.idString)
      if (targetPool.length === 1) {
        useConcentrated.setState({ currentAmmPool: targetPool[0] })
      }
    }
  }, [currentAmmPool?.idString, hydratedAmmPools])

  // auto clean chart data
  useAsyncEffect(async () => {
    useConcentrated.setState({ chartPoints: undefined })
  }, [pathname])

  /** reload points chart */
  useAsyncEffect(async () => {
    if (!currentAmmPool) return
    if (!shouldLoadChartPoints) return
    loadChartPointsAct(toPubString(currentAmmPool.state.id), { force: true })
  }, [refreshCount, shouldLoadChartPoints])
}
