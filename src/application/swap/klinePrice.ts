import jFetch from '@/functions/dom/jFetch'
import { HexAddress } from '@/types/constants'

import { useSwap } from './useSwap'

export function recordKLineData({ marketId, priceData }: { marketId: HexAddress; priceData: number[] }): void {
  useSwap.setState((s) => ({ klineData: { ...s.klineData, [marketId]: { priceData, updateTime: Date.now() } } }))
}

export async function getCoingeckoChartPriceData(coingeckoId: string | undefined): Promise<number[]> {
  if (!coingeckoId) return []
  const response = await jFetch(
    `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=1`,
    { cacheFreshTime: 1000 * 60 }
  )
  if (!response) return []
  return response.prices.map(([, price]) => price)
}
