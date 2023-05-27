import { formatDate } from '@/functions/date/dateFormat'
import jFetch from '@/functions/dom/jFetch'
import useInit from '@/hooks/useInit'
import useUpdate from '@/hooks/useUpdate'

import useAppAdvancedSettings from '../common/useAppAdvancedSettings'

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
  const infoUrl = useAppAdvancedSettings((s) => s.apiUrls.info)

  const fetchSummeryInfo = async () => {
    const summaryInfo = await jFetch<InfoResponse>(infoUrl, {
      cacheFreshTime: 290000 // 4min50sec
    })
    if (!summaryInfo) return
    // eslint-disable-next-line no-console
    console.log('summaryInfo:', summaryInfo)
    usePools.setState({ tvl: summaryInfo.tvl, volume24h: summaryInfo.volume24h })
  }

  useInit(() => {
    if (!tvl || !volume24h) {
      fetchSummeryInfo()
    }
  })

  useUpdate(() => {
    fetchSummeryInfo()
  }, [refreshCount, infoUrl])
}
