import useConnection from '@/application/connection/useConnection'
import { jsonInfo2PoolKeys, Liquidity, LiquidityPoolJsonInfo as LiquidityJsonInfo } from '@raydium-io/raydium-sdk'

import { SDKParsedLiquidityInfo } from '../type'

// TODO: SDK support get multi multi liquidity info at once. but no time to support it.
export default async function sdkParseJsonLiquidityInfo(
  liquidityJsonInfos: LiquidityJsonInfo[],
  connection = useConnection.getState().connection
): Promise<SDKParsedLiquidityInfo[]> {
  if (!connection) return []
  const info = await Liquidity.fetchMultipleInfo({ connection, pools: liquidityJsonInfos.map(jsonInfo2PoolKeys) })
  const result = info.map((sdkParsed, idx) => ({
    jsonInfo: liquidityJsonInfos[idx],
    ...jsonInfo2PoolKeys(liquidityJsonInfos[idx]),
    ...sdkParsed
  }))

  return result
}
