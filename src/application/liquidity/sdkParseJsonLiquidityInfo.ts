import useConnection from '@/application/connection/useConnection'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { jsonInfo2PoolKeys, Liquidity, LiquidityPoolJsonInfo as LiquidityJsonInfo } from '@raydium-io/raydium-sdk'

import { SDKParsedLiquidityInfo } from './type'

let refreshFlag = 1

const cache = new Map<number, Record<LiquidityJsonInfo['id'], SDKParsedLiquidityInfo>>()

export function cleanCachedLiquidityInfo() {
  cache.delete(refreshFlag)
  refreshFlag += 1
}

export default async function sdkParseJsonLiquidityInfo(
  liquidityJsonInfos: LiquidityJsonInfo[],
  connection = useConnection.getState().connection
): Promise<SDKParsedLiquidityInfo[]> {
  if (!connection) return []
  if (!liquidityJsonInfos.length) return [] // no jsonInfo
  const allCachedSDKLiquidityInfos = shakeUndifindedItem(liquidityJsonInfos.map((i) => cache.get(refreshFlag)?.[i.id]))
  const allCachedSDKLiquidityInfosMap = listToMap(allCachedSDKLiquidityInfos, (i) => toPubString(i.id))
  const allCachedIDs = allCachedSDKLiquidityInfos.map((i) => toPubString(i.id))
  const allNeedSDKParsedLiquidityInfos = liquidityJsonInfos.filter((jsonInfo) => !allCachedIDs.includes(jsonInfo.id))

  const info = await (allNeedSDKParsedLiquidityInfos.length
    ? Liquidity.fetchMultipleInfo({
        connection,
        pools: allNeedSDKParsedLiquidityInfos.map(jsonInfo2PoolKeys)
      }).catch(() => [])
    : [])

  const sdkParsed: SDKParsedLiquidityInfo[] = info.map((sdkParsed, idx) => ({
    jsonInfo: allNeedSDKParsedLiquidityInfos[idx],
    ...jsonInfo2PoolKeys(allNeedSDKParsedLiquidityInfos[idx]),
    ...sdkParsed
  }))
  const sdkParsedMap = listToMap(sdkParsed, (i) => toPubString(i.id))
  cache.set(refreshFlag, { ...cache.get(refreshFlag), ...sdkParsedMap })
  const merged = { ...allCachedSDKLiquidityInfosMap, ...sdkParsedMap }
  return liquidityJsonInfos.map((jsonInfo) => merged[jsonInfo.id])
}
