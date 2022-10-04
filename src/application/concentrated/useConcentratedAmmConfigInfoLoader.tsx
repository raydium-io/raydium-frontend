import jFetch from '@/functions/dom/jFetch'
import { toPercent } from '@/functions/format/toPercent'
import { div } from '@/functions/numberish/operations'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { ApiAmmV3ConfigInfo } from 'test-r-sdk'
import useConcentrated from './useConcentrated'

/**
 * will load concentrated info (jsonInfo, sdkParsedInfo, hydratedInfo)
 * @todo just register hooks in specific component
 */
export default function useConcentratedAmmConfigInfoLoader() {
  const availableAmmConfigFeeOptions = useConcentrated((s) => s.availableAmmConfigFeeOptions)

  /** fetch api json info list  */
  useAsyncEffect(async () => {
    if (availableAmmConfigFeeOptions?.length) return
    const response = await jFetch<{ data: Record<string, ApiAmmV3ConfigInfo> }>(
      'https://api.raydium.io/v2/ammV3/ammConfigs'
    )
    if (response)
      useConcentrated.setState({
        availableAmmConfigFeeOptions: Object.values(response.data).map((i) => ({
          ...i,
          protocolFeeRate: toPercent(div(i.protocolFeeRate, 10 ** 4), { alreadyDecimaled: true }),
          tradeFeeRate: toPercent(div(i.tradeFeeRate, 10 ** 4), { alreadyDecimaled: true })
        }))
      })
  }, [])
}
