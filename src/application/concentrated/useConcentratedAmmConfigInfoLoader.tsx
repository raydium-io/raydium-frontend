import { ApiAmmV3ConfigInfo } from 'test-r-sdk'

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
      ? {
          AjUvAGNuLJiXXGRQ1uiH4v6fBUJm1zwjBwyfK1qe27Ce: {
            id: 'AjUvAGNuLJiXXGRQ1uiH4v6fBUJm1zwjBwyfK1qe27Ce',
            index: 0,
            protocolFeeRate: 12000,
            tradeFeeRate: 100,
            fundFeeRate: 100,
            fundOwner: '',
            tickSpacing: 1,
            description: 'Dev'
          },
          ABPi23j9qDjCeK5WwutWn6XG8sMRV7AiG1Z5bP8cViuz: {
            id: 'ABPi23j9qDjCeK5WwutWn6XG8sMRV7AiG1Z5bP8cViuz',
            index: 0,
            protocolFeeRate: 12000,
            tradeFeeRate: 2500,
            fundFeeRate: 2500,
            fundOwner: '',
            tickSpacing: 60,
            description: 'Dev'
          },
          '85JxuepKfJsmb29ZKThuod3yeBS4dXmsCQUbeo1utpeX': {
            id: '85JxuepKfJsmb29ZKThuod3yeBS4dXmsCQUbeo1utpeX',
            index: 0,
            protocolFeeRate: 12000,
            tradeFeeRate: 100,
            fundFeeRate: 100,
            fundOwner: '',
            tickSpacing: 10,
            description: 'Dev'
          }
        }
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
