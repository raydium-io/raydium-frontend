import { useEffect } from 'react'
import { clearApiCache, clearSdkCache } from '../ammV3PoolInfoAndLiquidity/ammAndLiquidity'
import { useAppAdvancedSettings } from './useAppAdvancedSettings'

/**
 * reflect api change
 */

export function useApiUrlChange() {
  const programIds = useAppAdvancedSettings.getState().programIds
  const ammPoolsUrl = useAppAdvancedSettings.getState().apiUrls.ammV3Pools
  const liquidityPoolsUrl = useAppAdvancedSettings.getState().apiUrls.poolInfo
  useEffect(() => {
    clearApiCache()
    clearSdkCache()
  }, [ammPoolsUrl, liquidityPoolsUrl, programIds])
}
