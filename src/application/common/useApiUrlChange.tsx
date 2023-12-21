import { useEffect } from 'react'
import { clearApiCache, clearSdkCache } from '../ammV3PoolInfoAndLiquidity/ammAndLiquidity'
import { useAppAdvancedSettings } from './useAppAdvancedSettings'
import useLiquidity from '../liquidity/useLiquidity'

/**
 * reflect api change
 */

export function useApiUrlChange() {
  const programIds = useAppAdvancedSettings((s) => s.programIds)
  const ammPoolsUrl = useAppAdvancedSettings((s) => s.apiUrls.clmmPools)
  const liquidityPoolsUrl = useAppAdvancedSettings((s) => s.apiUrls.uiPoolInfo)
  const searchPoolUrl = useAppAdvancedSettings((s) => s.apiUrls.searchPool)
  useEffect(() => {
    clearApiCache()
    clearSdkCache()
    useLiquidity.setState({ apiCacheInfo: undefined })
  }, [ammPoolsUrl, liquidityPoolsUrl, programIds, searchPoolUrl])
}
