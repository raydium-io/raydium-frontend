import useConnection from '@/application/connection/useConnection'
import { jsonInfo2PoolKeys, Liquidity, LiquidityPoolJsonInfo as ConcentratedJsonInfo } from '@raydium-io/raydium-sdk'

import { SDKParsedConcentratedInfo } from './type'

// TODO: cache system
export default async function sdkParseJsonConcentratedInfo(
  concentratedJsonInfos: ConcentratedJsonInfo[],
  connection = useConnection.getState().connection
): Promise<SDKParsedConcentratedInfo[]> {
  if (!connection) return []
  if (!concentratedJsonInfos.length) return [] // no jsonInfo
  try {
    const info = await Liquidity.fetchMultipleInfo({
      connection,
      pools: concentratedJsonInfos.map(jsonInfo2PoolKeys)
    })
    const result = info.map((sdkParsed, idx) => ({
      jsonInfo: concentratedJsonInfos[idx],
      ...jsonInfo2PoolKeys(concentratedJsonInfos[idx]),
      ...sdkParsed
    }))
    return result
  } catch (err) {
    console.error(err)
    return []
  }
}
