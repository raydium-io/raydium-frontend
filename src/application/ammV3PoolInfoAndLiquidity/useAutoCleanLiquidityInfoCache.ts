import { clearSDKCacheOfSwap } from '@/application/ammV3PoolInfoAndLiquidity/ammAndLiquidity'
import { clearSDKClmmPoolInfoCache } from '../common/getSDKParsedClmmPoolInfo'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import useLiquidity from '../liquidity/useLiquidity'
import { useSwap } from '../swap/useSwap'

// 💡 may belong to /model/ammAndLiquidity
export default function useAutoCleanSwapInfoCache() {
  const swapRefresh = useSwap((s) => s.refreshCount)
  const liquidityRefresh = useLiquidity((s) => s.refreshCount)

  useIsomorphicLayoutEffect(() => {
    clearSDKCacheOfSwap()
    clearSDKClmmPoolInfoCache()
  }, [swapRefresh, liquidityRefresh])
}
