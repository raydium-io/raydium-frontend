import toPubString from '@/functions/format/toMintString'
import { useEffect } from 'react'
import useFarms from '../farms/useFarms'
import { usePools } from '../pools/usePools'
import { useSwap } from '../swap/useSwap'
import { cleanCachedLiquidityInfo } from './sdkParseJsonLiquidityInfo'
import useLiquidity from './useLiquidity'

export default function useAutoCleanLiquidityInfoCache() {
  const swapRefresh = useSwap((s) => s.refreshCount)
  const coin1 = useSwap((s) => s.coin1)
  const coin2 = useSwap((s) => s.coin2)
  const coin1Mint = coin1?.mintString
  const coin2Mint = coin2?.mintString

  const liquidityRefresh = useLiquidity((s) => s.refreshCount)
  const poolsRefresh = usePools((s) => s.refreshCount)
  const farmsRefresh = useFarms((s) => s.farmRefreshCount)

  useEffect(() => {
    cleanCachedLiquidityInfo()
  }, [swapRefresh, liquidityRefresh, poolsRefresh, farmsRefresh, coin1Mint, coin2Mint])
}
