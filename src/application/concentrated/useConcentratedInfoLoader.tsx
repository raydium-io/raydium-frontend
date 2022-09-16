import jFetch from '@/functions/dom/jFetch'
import toPubString from '@/functions/format/toMintString'
import { lazyMap } from '@/functions/lazyMap'
import { useEffectWithTransition } from '@/hooks/useEffectWithTransition'
import { AmmV3, ApiAmmV3Point, ApiAmmV3PoolInfo } from 'test-r-sdk'
import useConnection from '../connection/useConnection'
import useToken from '../token/useToken'
import useWallet from '../wallet/useWallet'
import hydrateConcentratedInfo from './hydrateConcentratedInfo'
import useConcentrated from './useConcentrated'

/**
 * will load concentrated info (jsonInfo, sdkParsedInfo, hydratedInfo)
 */
export default function useConcentratedInfoLoader() {
  const apiAmmPools = useConcentrated((s) => s.apiAmmPools)
  const sdkParsedAmmPools = useConcentrated((s) => s.sdkParsedAmmPools)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const connection = useConnection((s) => s.connection)
  const tokenAccounts = useWallet((s) => s.tokenAccountRawInfos)
  const owner = useWallet((s) => s.owner)
  const tokens = useToken((s) => s.tokens)

  /** fetch api json info list  */
  useEffectWithTransition(async () => {
    const response = await jFetch<{ data: ApiAmmV3PoolInfo[] }>('https://api.raydium.io/v2/ammV3/ammPools')
    if (response) useConcentrated.setState({ apiAmmPools: response.data })
  }, [])

  /**  api json info list ➡ SDK info list */
  useEffectWithTransition(async () => {
    if (!connection) return
    if (owner) {
      const sdkParsed = await AmmV3.fetchMultiplePoolInfos({
        poolKeys: apiAmmPools,
        connection,
        ownerInfo: {
          tokenAccounts: tokenAccounts,
          wallet: owner
        }
      })
      if (sdkParsed) useConcentrated.setState({ sdkParsedAmmPools: Object.values(sdkParsed) })
    }
  }, [apiAmmPools, connection, tokenAccounts, owner])

  /** SDK info list ➡ hydrated info list */
  useEffectWithTransition(async () => {
    if (!connection) return // don't hydrate when connection is not ready
    if (!Object.keys(tokens).length) return // don't hydrate when token is not loaded
    if (!sdkParsedAmmPools) return
    const sdkParsedAmmPoolsList = Object.values(sdkParsedAmmPools)
    const hydratedInfos = await lazyMap({
      source: sdkParsedAmmPoolsList,
      sourceKey: 'hydrate amm pool Info',
      loopFn: (sdkParsed) => hydrateConcentratedInfo(sdkParsed)
    })
    useConcentrated.setState({ hydratedAmmPools: hydratedInfos })
  }, [sdkParsedAmmPools, connection, tokens])

  /** select pool chart data */
  useEffectWithTransition(async () => {
    if (!currentAmmPool) return
    const chartResponse = await jFetch<{ data: ApiAmmV3Point[] }>(
      `https://api.raydium.io/v2/ammV3/positionLine?pool_id=${toPubString(currentAmmPool.state.id)}`
    )
    if (!chartResponse) return
    useConcentrated.setState({ chartPoints: chartResponse.data })
  }, [currentAmmPool])
}
