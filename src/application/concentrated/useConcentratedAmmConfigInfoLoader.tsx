import { ApiAmmV3ConfigInfo } from '@raydium-io/raydium-sdk'

import jFetch from '@/functions/dom/jFetch'
import { toPercent } from '@/functions/format/toPercent'
import { div } from '@/functions/numberish/operations'
import useAsyncEffect from '@/hooks/useAsyncEffect'

import useAppSettings from '../common/useAppSettings'

import useConcentrated from './useConcentrated'

/**
 * will load concentrated info (jsonInfo, sdkParsedInfo, hydratedInfo)
 * @todo just register hooks in specific component
 */
export default function useConcentratedAmmConfigInfoLoader() {
  const availableAmmConfigFeeOptions = useConcentrated((s) => s.availableAmmConfigFeeOptions)
  const inDev = useAppSettings((s) => s.inDev)

  /** fetch api json info list  */
  useAsyncEffect(async () => {
    if (availableAmmConfigFeeOptions?.length) return
    const response = await jFetch<{ data: Record<string, ApiAmmV3ConfigInfo> }>(
      'https://api.raydium.io/v2/ammV3/ammConfigs'
    )
    const data = inDev // dev data
      ? {}
      : response?.data
    if (data) {
      useConcentrated.setState({
        availableAmmConfigFeeOptions: Object.values(data).map((i) => {
          return {
            ...i,
            original: i,
            protocolFeeRate: toPercent(div(i.protocolFeeRate, 10 ** 4), { alreadyDecimaled: true }),
            tradeFeeRate: toPercent(div(i.tradeFeeRate, 10 ** 4), { alreadyDecimaled: true })
          }
        })
      })
    }
  }, [inDev])
}
