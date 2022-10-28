import { clearSdkCache } from '@/application/ammV3PoolInfoAndLiquidity/ammAndLiquidity'
import { useEffect } from 'react'
import useLiquidity from '../liquidity/useLiquidity'
import { useSwap } from '../swap/useSwap'

// 💡 may belong to /model/ammAndLiquidity
export default function useAutoCleanSwapInfoCache() {
  const swapRefresh = useSwap((s) => s.refreshCount)
  const liquidityRefresh = useLiquidity((s) => s.refreshCount)

  useEffect(() => {
    clearSdkCache()
  }, [swapRefresh, liquidityRefresh])
}
