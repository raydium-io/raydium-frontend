import { useCallback, useEffect, useRef } from 'react'

import jFetch from '@/functions/dom/jFetch'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { useRouter } from 'next/router'
import useAppAdvancedSettings from './common/useAppAdvancedSettings'

interface HomeInfo {
  tvl: number
  totalvolume: number
}

function fetchHomeInfo() {
  const infoUrl = useAppAdvancedSettings.getState().apiUrls.info
  return jFetch(infoUrl, { ignoreCache: true })
}

export function useHomeInfo() {
  const [forceUpdateCount] = useForceUpdate({ loop: 1000 * 60 })

  const [tvl, setTvl] = useLocalStorageItem<number>('tvl')
  const [totalvolume, setTotalvolume] = useLocalStorageItem<number>('totalVolume')

  const homeInfoUrl = useAppAdvancedSettings((s) => s.apiUrls.info)
  const intervalId = useRef<NodeJS.Timer | number>()
  const { pathname } = useRouter()

  const fetchInfo = useCallback(async () => {
    const result = (await fetchHomeInfo()) as HomeInfo | undefined
    const { tvl: resTvl, totalvolume: resTotalvolume } = result ?? {}
    if (resTvl != null && resTvl != tvl) {
      setTvl(resTvl)
    }
    if (resTotalvolume != null && resTotalvolume != totalvolume) {
      setTotalvolume(resTotalvolume)
    }
  }, [forceUpdateCount, tvl, totalvolume, homeInfoUrl])

  useEffect(() => {
    if (pathname !== '/') return
    fetchInfo()
    intervalId.current = setInterval(fetchInfo, 1000 * 60)
    return () => {
      clearInterval(intervalId.current as any)
    }
  }, [pathname])

  return { tvl, totalvolume }
}
