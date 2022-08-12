import jFetch from '@/functions/dom/jFetch'

import useInit from '@/hooks/useInit'
import useUpdate from '@/hooks/useUpdate'
import { usePools } from './usePools'

type InfoResponse = {
  tvl: string | number
  totalvolume: string | number
  volume24h: string | number
}

/** load tvl and volumn24h */
export default function usePoolSummeryInfoLoader() {
  const refreshCount = usePools((s) => s.refreshCount)
  const tvl = usePools((s) => s.tvl)
  const volume24h = usePools((s) => s.volume24h)

  const fetchSummeryInfo = async () => {
    const summeryInfo = await jFetch<InfoResponse>('https://api.raydium.io/v2/main/info')
    if (!summeryInfo) return
    usePools.setState({ tvl: summeryInfo.tvl, volume24h: summeryInfo.volume24h })
  }

  useInit(() => {
    if (!tvl || !volume24h) {
      fetchSummeryInfo()
    }
  })

  useUpdate(() => {
    fetchSummeryInfo()
  }, [refreshCount])
}
