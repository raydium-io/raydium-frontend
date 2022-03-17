import { useEffect } from 'react'

import useLiquidity from '../liquidity/useLiquidity'
import { freshKLineChartPrices } from './klinePrice'
import { useSwap } from './useSwap'

export function useKlineDataFetcher() {
  const coin1 = useSwap((s) => s.coin1)
  const coin2 = useSwap((s) => s.coin2)
  const jsonInfos = useLiquidity((s) => s.jsonInfos)
  const refreshCount = useSwap((s) => s.refreshCount)

  useEffect(() => {
    freshKLineChartPrices()
  }, [coin1, coin2, jsonInfos, refreshCount])
}
