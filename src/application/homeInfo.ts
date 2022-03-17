import { useCallback, useEffect, useRef } from 'react'

import jFetch from '@/functions/dom/jFetch'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { useRouter } from 'next/router'

interface HomeInfo {
  tvl: number
  totalvolume: number
}

function fetchHomeInfo() {
  return jFetch('https://api.raydium.io/v2/main/info', { ignoreCache: true })
}

export function useHomeInfo() {
  const [forceUpdateCount] = useForceUpdate({ loop: 1000 * 60 })

  const [tvl, setTvl] = useLocalStorageItem<number>('tvl')
  const [totalvolume, setTotalvolume] = useLocalStorageItem<number>('totalVolume')

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
  }, [forceUpdateCount, tvl, totalvolume])

  useEffect(() => {
    if (pathname !== '/') return
    fetchInfo()
    intervalId.current = setInterval(fetchInfo, 1000 * 60)
    return () => {
      //@ts-expect-error force
      clearInterval(intervalId.current)
    }
  }, [pathname])

  return { tvl, totalvolume }
}
