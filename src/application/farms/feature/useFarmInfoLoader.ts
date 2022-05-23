import { ReplaceType, validateAndParsePublicKey } from '@raydium-io/raydium-sdk'

import useAsyncEffect from '@/hooks/useAsyncEffect'

import useConnection from '../../connection/useConnection'
import { usePools } from '../../pools/usePools'
import useToken from '../../token/useToken'
import useWallet from '../../wallet/useWallet'
import useFarms from '../useFarms'
import { fetchFarmJsonInfos, hydrateFarmInfo, mergeSdkFarmInfo } from '../utils/handleFarmInfo'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { PublicKey } from '@solana/web3.js'

export default function useFarmInfoFetcher() {
  const { jsonInfos, sdkParsedInfos, farmRefreshCount } = useFarms()
  const liquidityJsonInfos = useLiquidity((s) => s.jsonInfos)
  const getToken = useToken((s) => s.getToken)
  const getLpToken = useToken((s) => s.getLpToken)
  const lpTokens = useToken((s) => s.lpTokens)
  const tokenPrices = useToken((s) => s.tokenPrices)

  const { connection } = useConnection()
  const owner = useWallet((s) => s.owner)
  const lpPrices = usePools((s) => s.lpPrices)

  // auto fetch json farm info when init
  useAsyncEffect(async () => {
    const farmJsonInfos = await fetchFarmJsonInfos()
    if (farmJsonInfos) useFarms.setState({ jsonInfos: farmJsonInfos })
  }, [farmRefreshCount])

  // auto fetch json farm info when init
  useAsyncEffect(async () => {
    useFarms.setState({ haveUpcomingFarms: jsonInfos.some((info) => info.upcoming) })
  }, [jsonInfos])

  // auto sdkParse
  useAsyncEffect(async () => {
    if (!jsonInfos || !connection) return
    if (!jsonInfos?.length) return
    const sdkParsedInfos = await mergeSdkFarmInfo(
      {
        connection,
        pools: jsonInfos.map(jsonInfo2PoolKeys),
        owner,
        config: { commitment: 'confirmed' }
      },
      { jsonInfos }
    )
    useFarms.setState({ sdkParsedInfos })
  }, [jsonInfos, connection, owner])

  // auto hydrate
  // hydrate action will depends on other state, so it will rerender many times
  useAsyncEffect(async () => {
    const hydratedInfos = sdkParsedInfos?.map((farmInfo) =>
      hydrateFarmInfo(farmInfo, { getToken, getLpToken, lpPrices, tokenPrices, liquidityJsonInfos })
    )
    useFarms.setState({ hydratedInfos, isLoading: hydratedInfos.length === 0 })
  }, [sdkParsedInfos, getToken, lpPrices, tokenPrices, getLpToken, lpTokens, liquidityJsonInfos])
}

export function jsonInfo2PoolKeys<T>(jsonInfo: T): ReplaceType<T, string, PublicKey> {
  // @ts-expect-error no need type for inner code
  return Object.entries(jsonInfo).reduce((result, [key, value]) => {
    if (typeof value === 'string') {
      result[key] = validateAndParsePublicKey(value)
    } else if (value instanceof Array) {
      result[key] = value.map((k) => jsonInfo2PoolKeys(k))
    } else {
      result[key] = value
    }

    return result
  }, {})
}
