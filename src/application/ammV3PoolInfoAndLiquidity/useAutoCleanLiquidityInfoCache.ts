import { clearSdkCache } from '@/application/ammV3PoolInfoAndLiquidity/ammAndLiquidity'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import useLiquidity from '../liquidity/useLiquidity'
import { useSwap } from '../swap/useSwap'

// 💡 may belong to /model/ammAndLiquidity
export default function useAutoCleanSwapInfoCache() {
  const swapRefresh = useSwap((s) => s.refreshCount)
  const liquidityRefresh = useLiquidity((s) => s.refreshCount)

  useIsomorphicLayoutEffect(() => {
    clearSdkCache()
  }, [swapRefresh, liquidityRefresh])
}
