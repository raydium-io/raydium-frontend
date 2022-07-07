import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'

import { Price } from '@raydium-io/raydium-sdk'

import shallow from 'zustand/shallow'

import jFetch from '@/functions/dom/jFetch'
import toTokenPrice from '@/functions/format/toTokenPrice'
import { HexAddress } from '@/types/constants'

import useToken from '../token/useToken'
import useWallet from '../wallet/useWallet'

import { unifyItem } from '@/functions/arrayMethods'
import { useEffectWithTransition } from '@/hooks/useEffectWithTransition'
import useLiquidity from '../liquidity/useLiquidity'
import { JsonPairItemInfo } from './type'
import { usePools } from './usePools'
import { hydratedPairInfo } from './hydratedPairInfo'
import { lazyMap } from '@/functions/lazyMap'

export default function usePoolsInfoLoader() {
  const jsonInfo = usePools((s) => s.jsonInfos, shallow)
  const liquidityJsonInfos = useLiquidity((s) => s.jsonInfos)
  const stableLiquidityJsonInfoLpMints = useMemo(
    () => unifyItem(liquidityJsonInfos.filter((j) => j.version === 5).map((j) => j.lpMint)),
    [liquidityJsonInfos]
  )

  const getToken = useToken((s) => s.getToken)
  const tokens = useToken((s) => s.tokens)
  const getLpToken = useToken((s) => s.getLpToken)
  const lpTokens = useToken((s) => s.lpTokens)
  const balances = useWallet((s) => s.balances)
  const { pathname } = useRouter()
  const refreshCount = usePools((s) => s.refreshCount)

  const fetchPairs = async () => {
    // console.time('load pair json')
    const pairJsonInfo = await jFetch<JsonPairItemInfo[]>('https://api.raydium.io/v2/main/pairs', {
      ignoreCache: true
    })
    if (!pairJsonInfo) return
    usePools.setState({ jsonInfos: pairJsonInfo.filter(({ name }) => !name.includes('unknown')) })
    // console.timeEnd('load pair json')
  }

  useEffectWithTransition(() => {
    fetchPairs()
  }, [refreshCount])

  // TODO: currently also fetch info when it's not
  useEffect(() => {
    if (!pathname.includes('/pools/') && !pathname.includes('/liquidity/')) return
    const timeoutId = setInterval(usePools.getState().refreshPools, 15 * 60 * 1000)
    return () => clearInterval(timeoutId)
  }, [pathname])

  const lpPrices = useMemo<Record<HexAddress, Price>>(
    () =>
      Object.fromEntries(
        jsonInfo
          .map((value) => {
            const token = lpTokens[value.lpMint]
            const price = token && value.lpPrice ? toTokenPrice(token, value.lpPrice, { alreadyDecimaled: true }) : null
            return [value.lpMint, price]
          })
          .filter(([lpMint, price]) => lpMint != null && price != null)
      ),
    [jsonInfo, lpTokens]
  )

  useEffect(() => {
    usePools.setState({ lpPrices })
  }, [lpPrices])

  useEffectWithTransition(() => {
    lazyMap({
      source: jsonInfo,
      sourceKey: 'pair jsonInfo',
      loopFn: (pair) =>
        hydratedPairInfo(pair, {
          lpToken: getLpToken(pair.lpMint),
          lpBalance: balances[String(pair.lpMint)],
          isStable: stableLiquidityJsonInfoLpMints.includes(pair.lpMint)
        }),
      onListChange: (hydratedInfos) => {
        usePools.setState({ hydratedInfos, loading: hydratedInfos.length === 0 })
      }
    })
  }, [jsonInfo, getToken, balances, lpTokens, tokens, stableLiquidityJsonInfoLpMints])
}
