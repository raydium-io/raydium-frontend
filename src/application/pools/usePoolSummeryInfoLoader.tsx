import { useEffect } from 'react'

import jFetch from '@/functions/dom/jFetch'

import { usePools } from './usePools'

type InfoResponse = {
  tvl: string | number
  totalvolume: string | number
  volume24h: string | number
}

/** load tvl and volumn24h */
export default function usePoolSummeryInfoLoader() {
  const refreshCount = usePools((s) => s.refreshCount)

  const fetchSummeryInfo = async () => {
    const summeryInfo = await jFetch<InfoResponse>('https://api.raydium.io/v2/main/info', {
      ignoreCache: true
    })
    if (!summeryInfo) return

    usePools.setState({ tvl: summeryInfo.tvl, volume24h: summeryInfo.volume24h })
  }

  useEffect(() => {
    fetchSummeryInfo()
  }, [refreshCount])
}
