import { clearSdkCache } from '@/models/ammAndLiquidity'
import { useEffect } from 'react'
import useLiquidity from '../liquidity/useLiquidity'
import { useSwap } from '../swap/useSwap'

export default function useAutoCleanSwapInfoCache() {
  const swapRefresh = useSwap((s) => s.refreshCount)
  const liquidityRefresh = useLiquidity((s) => s.refreshCount)

  useEffect(() => {
    clearSdkCache()
  }, [swapRefresh, liquidityRefresh])
}
