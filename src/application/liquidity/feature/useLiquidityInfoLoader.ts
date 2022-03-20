import { LiquidityPoolsJsonFile } from '@raydium-io/raydium-sdk'

import useConnection from '@/application/connection/useConnection'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import jFetch from '@/functions/dom/jFetch'
import { isExist } from '@/functions/judgers/nil'
import { gt } from '@/functions/numberish/compare'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { HexAddress } from '@/types/constants'

import useLiquidity from '../useLiquidity'
import hydrateLiquidityInfo from '../utils/hydrateLiquidityInfo'
import sdkParseJsonLiquidityInfo from '../utils/sdkParseJsonLiquidityInfo'

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
  const rawBalances = useWallet((s) => s.rawBalances)

  /** fetch json info list  */
  useAsyncEffect(async () => {
    if (disabled) return
    const response = await jFetch<LiquidityPoolsJsonFile>('https://api.raydium.io/v2/sdk/liquidity/mainnet.json')
    const blacklist = await jFetch<HexAddress[]>('/amm-blacklist.json')
    const liquidityInfoList = [...(response?.official ?? []), ...(response?.unOfficial ?? [])]
      // no raydium blacklist amm
      .filter((info) => !(blacklist ?? []).includes(info.id))
    const officialIds = new Set(response?.official?.map((i) => i.id))
    const unOfficialIds = new Set(response?.unOfficial?.map((i) => i.id))
    if (liquidityInfoList) useLiquidity.setState({ jsonInfos: liquidityInfoList, officialIds, unOfficialIds })
  }, [disabled])

  /** get userExhibitionLiquidityIds */
  useAsyncEffect(async () => {
    // when refresh, it will refresh twice. one for rawBalance, one for liquidityRefreshCount
    if (disabled) return
    if (!jsonInfos) return
    const liquidityLpMints = new Set(jsonInfos.map((jsonInfo) => jsonInfo.lpMint))
    const allLpBalance = Object.entries(rawBalances).filter(
      ([mint, tokenAmount]) => liquidityLpMints.has(mint) && gt(tokenAmount, 0)
    )
    const allLpBalanceMint = allLpBalance.map(([mint]) => String(mint))
    const userExhibitionLiquidityIds = jsonInfos
      .filter((jsonInfo) => allLpBalanceMint.includes(jsonInfo.lpMint))
      .map((jsonInfo) => jsonInfo.id)

    useLiquidity.setState({ userExhibitionLiquidityIds })
  }, [disabled, jsonInfos, rawBalances, isLpToken, refreshCount])

  /** json infos ➡ sdkParsed infos (only wallet's LP)  */
  useAsyncEffect(async () => {
    if (disabled) return
    if (!connection || !jsonInfos || !userExhibitionLiquidityIds) return

    const sdkParsedInfosTasks = jsonInfos
      .filter((i) => userExhibitionLiquidityIds.includes(i.id))
      .map(async (jsonInfo) => sdkParseJsonLiquidityInfo([jsonInfo], connection))

    Promise.all(sdkParsedInfosTasks).then((sdkParsedInfos) => {
      useLiquidity.setState({ sdkParsedInfos: sdkParsedInfos.flat().filter(isExist) })
    })
  }, [disabled, connection, jsonInfos, userExhibitionLiquidityIds, refreshCount])

  /** sdkParsed infos (only wallet's LP) ➡  hydrated infos (only wallet's LP)*/
  useAsyncEffect(async () => {
    if (disabled) return
    const hydratedInfos = sdkParsedInfos.map((liquidityInfo) => {
      const lpBalance = rawBalances[String(liquidityInfo.lpMint)]
      return hydrateLiquidityInfo(liquidityInfo, { getToken, getLpToken, lpBalance })
    })
    useLiquidity.setState({ hydratedInfos })
  }, [disabled, sdkParsedInfos, rawBalances, getToken, getLpToken])

  /** CURRENT jsonInfo ➡ current sdkParsedInfo  */
  useAsyncEffect(async () => {
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
  useAsyncEffect(async () => {
    if (disabled) return
    if (connection && currentSdkParsedInfo) {
      const lpBalance = rawBalances[String(currentSdkParsedInfo.lpMint)]
      useLiquidity.setState({
        currentHydratedInfo: await hydrateLiquidityInfo(currentSdkParsedInfo, { getToken, getLpToken, lpBalance })
      })
    } else {
      useLiquidity.setState({ currentHydratedInfo: undefined })
    }
  }, [disabled, currentSdkParsedInfo, getToken, getLpToken])
}
