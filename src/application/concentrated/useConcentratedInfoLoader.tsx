import jFetch from '@/functions/dom/jFetch'
import toPubString from '@/functions/format/toMintString'

import { useEffectWithTransition } from '@/hooks/useEffectWithTransition'
import { AmmV3, ApiAmmPoint, ApiAmmPoolInfo } from 'test-r-sdk'
import useConnection from '../connection/useConnection'
import useConcentrated from './useConcentrated'

/**
 * will load concentrated info (jsonInfo, sdkParsedInfo, hydratedInfo)
 */
export default function useConcentratedInfoLoader() {
  const apiAmmPools = useConcentrated((s) => s.apiAmmPools)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const connection = useConnection((s) => s.testConnection)

  /** fetch api json info list  */
  useEffectWithTransition(async () => {
    const response = await jFetch<{ data: ApiAmmPoolInfo[] }>('http://192.168.60.31:8000/v2/ammV3/ammPools')
    if (response) useConcentrated.setState({ apiAmmPools: response.data })
  }, [])

  /**  api json info list ➡ SDK info list */
  useEffectWithTransition(async () => {
    if (!connection) return
    const sdkParsed = await AmmV3.fetchMultipleInfos({ poolKeys: apiAmmPools, connection })
    if (sdkParsed) useConcentrated.setState({ sdkParsedAmmPools: sdkParsed })
  }, [apiAmmPools, connection])

  /** select pool chart data */
  useEffectWithTransition(async () => {
    if (!currentAmmPool) return
    const chartResponse = await jFetch<{ data: ApiAmmPoint[] }>(
      `http://192.168.60.31:8000/v2/ammV3/positionLine?pool_id=${toPubString(currentAmmPool.state.id)}`
    )
    if (!chartResponse) return
    useConcentrated.setState({ chartPoints: chartResponse.data })
  }, [currentAmmPool])
}
