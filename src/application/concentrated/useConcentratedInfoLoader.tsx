import { LiquidityPoolsJsonFile } from '@raydium-io/raydium-sdk'

import useConnection from '@/application/connection/useConnection'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import jFetch from '@/functions/dom/jFetch'
import { gt } from '@/functions/numberish/compare'
import { HexAddress } from '@/types/constants'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { areShallowEqual } from '@/functions/judgers/areEqual'
import { useEffectWithTransition } from '@/hooks/useEffectWithTransition'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import hydrateConcentratedInfo from './hydrateConcentratedInfo'
import sdkParseJsonConcentratedInfo from './sdkParseJsonConcentratedInfo'
import useConcentrated from './useConcentrated'

/**
 * will load concentrated info (jsonInfo, sdkParsedInfo, hydratedInfo)
 */
export default function useConcentratedInfoLoader({ disabled }: { disabled?: boolean } = {}) {
  const { jsonInfos, sdkParsedInfos, currentJsonInfo, currentSdkParsedInfo, userExhibitionConcentratedIds } =
    useConcentrated()
  const getToken = useToken((s) => s.getToken)
  const getLpToken = useToken((s) => s.getLpToken)
  const isLpToken = useToken((s) => s.isLpToken)
  const refreshCount = useConcentrated((s) => s.refreshCount)
  const connection = useConnection((s) => s.connection)
  const rawBalances = useWallet((s) => s.rawBalances)

  /** fetch json info list  */
  useEffectWithTransition(async () => {
    if (disabled) return
    const response = await jFetch<LiquidityPoolsJsonFile>('https://api.raydium.io/v2/sdk/concentrated/mainnet.json', {
      ignoreCache: true
    })
    const blacklist = await jFetch<HexAddress[]>('/amm-blacklist.json')
    const concentratedInfoList = [...(response?.official ?? []), ...(response?.unOfficial ?? [])]
      // no raydium blacklist amm
      .filter((info) => !(blacklist ?? []).includes(info.id))
    const officialIds = new Set(response?.official?.map((i) => i.id))
    const unOfficialIds = new Set(response?.unOfficial?.map((i) => i.id))
    if (concentratedInfoList) useConcentrated.setState({ jsonInfos: concentratedInfoList, officialIds, unOfficialIds })
  }, [disabled])

  /** get userExhibitionConcentratedIds */
  useEffectWithTransition(async () => {
    // when refresh, it will refresh twice. one for rawBalance, one for concentratedRefreshCount
    if (disabled) return
    if (!jsonInfos) return
    const concentratedLpMints = new Set(jsonInfos.map((jsonInfo) => jsonInfo.lpMint))
    const allLpBalance = Object.entries(rawBalances).filter(
      ([mint, tokenAmount]) => concentratedLpMints.has(mint) && gt(tokenAmount, 0)
    )
    const allLpBalanceMint = allLpBalance.map(([mint]) => String(mint))
    const userExhibitionConcentratedIds = jsonInfos
      .filter((jsonInfo) => allLpBalanceMint.includes(jsonInfo.lpMint))
      .map((jsonInfo) => jsonInfo.id)
    useConcentrated.setState({ userExhibitionConcentratedIds })
  }, [disabled, jsonInfos, rawBalances, isLpToken, refreshCount])

  /** json infos ➡ sdkParsed infos (only wallet's LP)  */
  useRecordedEffect(
    async ([prevDisabled, prevConnection, prevJsonInfos, prevUserExhibitionConcentratedIds, prevRefreshCount]) => {
      if (disabled) return
      if (!connection || !jsonInfos.length || !userExhibitionConcentratedIds.length) return

      if (
        prevRefreshCount == refreshCount &&
        areShallowEqual(prevUserExhibitionConcentratedIds, userExhibitionConcentratedIds)
      )
        return

      const sdkParsedInfos = await sdkParseJsonConcentratedInfo(
        jsonInfos.filter((i) => userExhibitionConcentratedIds.includes(i.id)),
        connection
      )
      useConcentrated.setState({ sdkParsedInfos: shakeUndifindedItem(sdkParsedInfos) })
    },
    [disabled, connection, jsonInfos, userExhibitionConcentratedIds, refreshCount] as const
  )

  /** sdkParsed infos (only wallet's LP) ➡  hydrated infos (only wallet's LP)*/
  useEffectWithTransition(async () => {
    if (disabled) return
    const hydratedInfos = sdkParsedInfos.map((concentratedInfo) => {
      const lpBalance = rawBalances[String(concentratedInfo.lpMint)]
      return hydrateConcentratedInfo(concentratedInfo, { getToken, getLpToken, lpBalance })
    })
    useConcentrated.setState({ hydratedInfos })
  }, [disabled, sdkParsedInfos, rawBalances, getToken, getLpToken])

  /** CURRENT jsonInfo ➡ current sdkParsedInfo  */
  useEffectWithTransition(async () => {
    if (disabled) return
    if (connection && currentJsonInfo) {
      useConcentrated.setState({
        currentSdkParsedInfo: (await sdkParseJsonConcentratedInfo([currentJsonInfo], connection))?.[0]
      })
    } else {
      useConcentrated.setState({ currentSdkParsedInfo: undefined })
    }
  }, [disabled, currentJsonInfo, connection, refreshCount])

  /** CURRENT sdkParsedInfo ➡ current hydratedInfo  */
  useEffectWithTransition(async () => {
    if (disabled) return
    if (connection && currentSdkParsedInfo) {
      const lpBalance = rawBalances[String(currentSdkParsedInfo.lpMint)]
      const hydrated = await hydrateConcentratedInfo(currentSdkParsedInfo, { getToken, getLpToken, lpBalance })
      useConcentrated.setState({
        currentHydratedInfo: hydrated
      })
    } else {
      useConcentrated.setState({ currentHydratedInfo: undefined })
    }
  }, [disabled, currentSdkParsedInfo, getToken, getLpToken])
}
