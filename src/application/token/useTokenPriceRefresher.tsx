import jFetch from '@/functions/dom/jFetch'
import listToMap, { listToMultiItemsMap } from '@/functions/format/listToMap'
import toTokenPrice from '@/functions/format/toTokenPrice'
import { inServer } from '@/functions/judgers/isSSR'
import { objectMap, objectMapMultiEntry, objectShakeNil } from '@/functions/objectMethods'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { useEffect } from 'react'
import useToken from './useToken'

export default function useTokenPriceRefresher() {
  const tokenJsonInfos = useToken((s) => s.tokenJsonInfos)

  const refreshTokenCount = useToken((s) => s.refreshTokenCount)
  const refreshTokenPrice = useToken((s) => s.refreshTokenPrice)

  useEffect(() => {
    const timeIntervalId = setInterval(() => {
      if (inServer) return
      if (document.visibilityState === 'hidden') return
      refreshTokenPrice()
    }, 1000 * 60 * 2)
    return () => clearInterval(timeIntervalId)
  }, [])

  useAsyncEffect(async () => {
    if (!Object.values(tokenJsonInfos).length) return
    const coingeckoIds = Object.values(tokenJsonInfos)
      .map((t) => t?.extensions?.coingeckoId)
      .filter(Boolean)
    const coingeckoPrices: Record<string, { usd?: number }> | undefined = await jFetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd`,
      { ignoreCache: true }
    )

    const coingeckoIdMap = listToMultiItemsMap(Object.values(tokenJsonInfos), (i) => i.extensions?.coingeckoId)
    const coingeckoTokenPrices = objectShakeNil(
      objectMapMultiEntry(
        coingeckoPrices,
        ([key, value]) =>
          coingeckoIdMap[key]?.map((token) => [
            token.mint,
            value.usd ? toTokenPrice(token, value.usd, { alreadyDecimaled: true }) : undefined
          ]) ?? []
      )
    )

    const raydiumPrices = await jFetch<Record<string, number>>('https://api.raydium.io/v2/main/price')
    const raydiumTokenPrices = objectMap(raydiumPrices, (v, k) =>
      tokenJsonInfos[k] ? toTokenPrice(tokenJsonInfos[k], v, { alreadyDecimaled: true }) : undefined
    )
    const tokenPrices = objectShakeNil({ ...coingeckoTokenPrices, ...raydiumTokenPrices })

    useToken.setState({ tokenPrices })
  }, [tokenJsonInfos, refreshTokenCount])
}
