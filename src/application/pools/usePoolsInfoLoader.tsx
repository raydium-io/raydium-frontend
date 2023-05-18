import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'

import { Price } from '@raydium-io/raydium-sdk'

import { shallow } from 'zustand/shallow'

import { unifyItem } from '@/functions/arrayMethods'
import jFetch from '@/functions/dom/jFetch'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import toTokenPrice from '@/functions/format/toTokenPrice'
import { isPubEqual } from '@/functions/judgers/areEqual'
import { lazyMap } from '@/functions/lazyMap'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useTransitionedEffect } from '@/hooks/useTransitionedEffect'
import { HexAddress } from '@/types/constants'

import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import useFarms from '../farms/useFarms'
import useLiquidity from '../liquidity/useLiquidity'
import useToken from '../token/useToken'
import useWallet from '../wallet/useWallet'

import { hydratedPairInfo } from './hydratedPairInfo'
import { JsonPairItemInfo } from './type'
import { usePools } from './usePools'

export default function usePoolsInfoLoader() {
  const jsonInfos = usePools((s) => s.jsonInfos, shallow)
  const rawJsonInfos = usePools((s) => s.rawJsonInfos)
  const liquidityJsonInfos = useLiquidity((s) => s.jsonInfos)
  const stableLiquidityJsonInfoLpMints = useMemo(
    () => unifyItem(liquidityJsonInfos.filter((j) => j.version === 5).map((j) => j.lpMint)),
    [liquidityJsonInfos]
  )

  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const getLpToken = useToken((s) => s.getLpToken)
  const lpTokens = useToken((s) => s.lpTokens)
  const balances = useWallet((s) => s.balances)
  const { pathname } = useRouter()
  const refreshCount = usePools((s) => s.refreshCount)
  const farmRefreshCount = useFarms((s) => s.farmRefreshCount)
  const programIds = useAppAdvancedSettings((s) => s.programIds)
  const apiUrls = useAppAdvancedSettings((s) => s.apiUrls)
  const pairsUrl = useAppAdvancedSettings((s) => s.apiUrls.pairs)

  const shouldLoadInfo = useMemo(() => !pathname.includes('swap'), [pathname.includes('swap')])

  useRecordedEffect(
    async ([prevRefreshCount, prevFarmRefreshCount]) => {
      if (!shouldLoadInfo) return
      if (
        prevRefreshCount === refreshCount &&
        prevFarmRefreshCount === farmRefreshCount &&
        usePools.getState().jsonInfos.length
      )
        return
      const pairJsonInfo = await jFetch<JsonPairItemInfo[]>(pairsUrl, {
        cacheFreshTime: 5 * 60 * 1000
      })
      if (!pairJsonInfo) return
      usePools.setState({
        jsonInfos: pairJsonInfo,
        rawJsonInfos: pairJsonInfo
      })
    },
    [refreshCount, farmRefreshCount, pairsUrl, shouldLoadInfo]
  )

  // TODO: currently also fetch info when it's not
  useEffect(() => {
    if (!pathname.includes('/pools/') && !pathname.includes('/liquidity/')) return
    const timeoutId = setInterval(usePools.getState().refreshPools, 15 * 60 * 1000)
    return () => clearInterval(timeoutId)
  }, [pathname])

  const lpPrices = useMemo<Record<HexAddress, Price>>(
    () =>
      Object.fromEntries(
        rawJsonInfos
          .map((value) => {
            const token = lpTokens[value.lpMint]
            const price = token && value.lpPrice ? toTokenPrice(token, value.lpPrice, { alreadyDecimaled: true }) : null
            return [value.lpMint, price]
          })
          .filter(([lpMint, price]) => lpMint != null && price != null)
      ),
    [rawJsonInfos, lpTokens]
  )

  useEffect(() => {
    usePools.setState({ lpPrices })
  }, [lpPrices])

  const liquidityJsonInfosMap = useMemo(() => listToMap(liquidityJsonInfos, (i) => i.id), [liquidityJsonInfos])
  const isPairInfoOpenBook = (ammId: string) => {
    const itemMarketProgramId = liquidityJsonInfosMap[ammId]?.marketProgramId as string | undefined
    return isPubEqual(itemMarketProgramId, programIds.OPENBOOK_MARKET)
  }
  useTransitionedEffect(async () => {
    const hydratedInfos = await lazyMap({
      source: jsonInfos,
      loopTaskName: 'pair jsonInfo',
      loopFn: (pair) =>
        hydratedPairInfo(pair, {
          lpToken: getLpToken(pair.lpMint),
          lpBalance: balances[toPubString(pair.lpMint)],
          isStable: stableLiquidityJsonInfoLpMints.includes(pair.lpMint),
          isOpenBook: isPairInfoOpenBook(pair.ammId)
        }),
      options: { priority: pathname.includes('pools') || pathname.includes('liquidity') ? 1 : 0 }
    })
    usePools.setState({ hydratedInfos })
  }, [jsonInfos, lpTokens, getLpToken, balances, stableLiquidityJsonInfoLpMints, userAddedTokens])
}
