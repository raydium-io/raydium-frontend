import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { PublicKeyish } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
import useToken from '../token/useToken'
import useWallet from '../wallet/useWallet'
import hydrateLiquidityInfo from './hydrateLiquidityInfo'
import sdkParseJsonLiquidityInfo from './sdkParseJsonLiquidityInfo'
import useLiquidity from './useLiquidity'

/**
 * ** Dangerous (it's over bonsai system) **
 *
 * it will load liquidity without any check or refresh
 * syn -> json + sdk + hydrate
 * so, it is a function-base new load system for bonsai
 *
 * @todo  use lazyPromise instead of promise to avoid promise init issue
 */
export function smashSYNLiquidity(ammIds: PublicKeyish[]) {
  let aborted = false
  const abort = () => {
    aborted = true
  }
  const useLiquidityStore = useLiquidity.getState()
  const { jsonInfos, sdkParsedInfos } = useLiquidityStore // isolate from old system totally may cause cache issue, so use old json data now
  const useConnectionStore = useConnection.getState()
  const { connection } = useConnectionStore

  // sdk part
  const originalSdkParsedInfosMap = listToMap(sdkParsedInfos, (i) => toPubString(i.id))
  const checkOriginalSdkCached = (ammId: PublicKeyish) => Boolean(originalSdkParsedInfosMap[toPubString(ammId)])
  const sdkParsedInfosPromise = sdkParseJsonLiquidityInfo(
    jsonInfos.filter((i) => ammIds.includes(i.id) && !checkOriginalSdkCached(i.id)),
    connection
  ).then((sdkParsedInfos) => {
    const sdkParsedInfosMap = listToMap(sdkParsedInfos, (i) => toPubString(i.id))
    useLiquidity.setState((s) => ({ sdkParsedInfos: [...s.sdkParsedInfos, ...sdkParsedInfos] }))
    return { ...sdkParsedInfosMap, ...originalSdkParsedInfosMap }
  })

  // hydrate part
  const hydratedInfosPromise = sdkParsedInfosPromise.then((sdkParsedInfos) => {
    if (aborted) return
    const { getLpToken, getToken } = useToken.getState()
    const { pureRawBalances } = useWallet.getState()
    const { hydratedInfos: originalHydratedInfos } = useLiquidity.getState()

    const originalHydratedInfosMap = listToMap(originalHydratedInfos, (i) => toPubString(i.id))
    const checkOriginalHydratedCached = (ammId: PublicKeyish) => Boolean(originalHydratedInfosMap[toPubString(ammId)])

    const hydratedInfos = Object.values(sdkParsedInfos)

      .filter((i) => !checkOriginalHydratedCached(i.id))
      .map((liquidityInfo) =>
        hydrateLiquidityInfo(liquidityInfo, {
          getToken,
          getLpToken,
          lpBalance: pureRawBalances[toPubString(liquidityInfo.lpMint)]
        })
      )
    useLiquidity.setState((s) => ({ hydratedInfos: [...s.hydratedInfos, ...hydratedInfos] }))
    const hydratedInfosMap = listToMap(hydratedInfos, (i) => toPubString(i.id))
    return { ...originalHydratedInfosMap, ...hydratedInfosMap }
  })

  return { abort, hydrated: hydratedInfosPromise, sdkParsed: sdkParsedInfosPromise }
}
