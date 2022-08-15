import { LiquidityPoolsJsonFile } from '@raydium-io/raydium-sdk'

import useConnection from '@/application/connection/useConnection'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import jFetch from '@/functions/dom/jFetch'
import { isExist } from '@/functions/judgers/nil'
import { gt } from '@/functions/numberish/compare'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { HexAddress } from '@/types/constants'

import useLiquidity from './useLiquidity'
import hydrateLiquidityInfo from './hydrateLiquidityInfo'
import sdkParseJsonLiquidityInfo from './sdkParseJsonLiquidityInfo'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { areShallowEqual } from '@/functions/judgers/areEqual'
import { useEffectWithTransition } from '@/hooks/useEffectWithTransition'
import { toHumanReadable } from '@/functions/format/toHumanReadable'

/**
 * will load liquidity info (jsonInfo, sdkParsedInfo, hydratedInfo)
 */
export default function useLiquidityInfoLoader({ disabled }: { disabled?: boolean } = {}) {
  const { jsonInfos, sdkParsedInfos, currentJsonInfo, currentSdkParsedInfo, userExhibitionLiquidityIds } =
    useLiquidity()
  const getToken = useToken((s) => s.getToken)
  const getLpToken = useToken((s) => s.getLpToken)
  const isLpToken = useToken((s) => s.isLpToken)
  const refreshCount = useLiquidity((s) => s.refreshCount)
  const connection = useConnection((s) => s.connection)
  const pureRawBalances = useWallet((s) => s.pureRawBalances)

  /** fetch json info list  */
  useEffectWithTransition(async () => {
    if (disabled) return
    const response = await jFetch<LiquidityPoolsJsonFile>('https://api.raydium.io/v2/sdk/liquidity/mainnet.json', {
      ignoreCache: true
    })
    const blacklist = await jFetch<HexAddress[]>('/amm-blacklist.json')
    const liquidityInfoList = [...(response?.official ?? []), ...(response?.unOfficial ?? [])]
      // no raydium blacklist amm
      .filter((info) => !(blacklist ?? []).includes(info.id))
    const officialIds = new Set(response?.official?.map((i) => i.id))
    const unOfficialIds = new Set(response?.unOfficial?.map((i) => i.id))
    if (liquidityInfoList) useLiquidity.setState({ jsonInfos: liquidityInfoList, officialIds, unOfficialIds })
  }, [disabled])

  /** get userExhibitionLiquidityIds */
  useEffectWithTransition(async () => {
    // when refresh, it will refresh twice. one for rawBalance, one for liquidityRefreshCount
    if (disabled) return
    if (!jsonInfos) return
    const liquidityLpMints = new Set(jsonInfos.map((jsonInfo) => jsonInfo.lpMint))
    const allLpBalance = Object.entries(pureRawBalances).filter(
      ([mint, tokenAmount]) => liquidityLpMints.has(mint) && gt(tokenAmount, 0)
    )
    const allLpBalanceMint = allLpBalance.map(([mint]) => mint)
    const userExhibitionLiquidityIds = jsonInfos
      .filter((jsonInfo) => allLpBalanceMint.includes(jsonInfo.lpMint))
      .map((jsonInfo) => jsonInfo.id)

    useLiquidity.setState({ userExhibitionLiquidityIds })
  }, [disabled, jsonInfos, pureRawBalances, isLpToken, refreshCount])

  /** json infos ➡ sdkParsed infos (only wallet's LP)  */
  useRecordedEffect(
    async ([prevDisabled, prevConnection, prevJsonInfos, prevUserExhibitionLiquidityIds, prevRefreshCount]) => {
      if (disabled) return
      if (!connection || !jsonInfos.length || !userExhibitionLiquidityIds.length) return

      if (
        prevRefreshCount == refreshCount &&
        areShallowEqual(prevUserExhibitionLiquidityIds, userExhibitionLiquidityIds)
      )
        return

      const sdkParsedInfos = await sdkParseJsonLiquidityInfo(
        jsonInfos.filter((i) => userExhibitionLiquidityIds.includes(i.id)),
        connection
      )
      useLiquidity.setState({ sdkParsedInfos: shakeUndifindedItem(sdkParsedInfos) })
    },
    [disabled, connection, jsonInfos, userExhibitionLiquidityIds, refreshCount] as const
  )

  /** sdkParsed infos (only wallet's LP) ➡  hydrated infos (only wallet's LP)*/
  useEffectWithTransition(async () => {
    if (disabled) return
    const hydratedInfos = sdkParsedInfos.map((liquidityInfo) => {
      const lpBalance = pureRawBalances[String(liquidityInfo.lpMint)]
      return hydrateLiquidityInfo(liquidityInfo, { getToken, getLpToken, lpBalance })
    })
    useLiquidity.setState({ hydratedInfos })
  }, [disabled, sdkParsedInfos, pureRawBalances, getToken, getLpToken])

  /** CURRENT jsonInfo ➡ current sdkParsedInfo  */
  useEffectWithTransition(async () => {
    if (disabled) return
    if (connection && currentJsonInfo) {
      useLiquidity.setState({
        currentSdkParsedInfo: (await sdkParseJsonLiquidityInfo([currentJsonInfo], connection))?.[0]
      })
    } else {
      useLiquidity.setState({ currentSdkParsedInfo: undefined })
    }
  }, [disabled, currentJsonInfo, connection, refreshCount])

  /** CURRENT sdkParsedInfo ➡ current hydratedInfo  */
  useEffectWithTransition(async () => {
    if (disabled) return
    if (connection && currentSdkParsedInfo) {
      const lpBalance = pureRawBalances[String(currentSdkParsedInfo.lpMint)]
      const hydrated = await hydrateLiquidityInfo(currentSdkParsedInfo, { getToken, getLpToken, lpBalance })
      useLiquidity.setState({
        currentHydratedInfo: hydrated
      })
    } else {
      useLiquidity.setState({ currentHydratedInfo: undefined })
    }
  }, [disabled, currentSdkParsedInfo, getToken, getLpToken])
}
