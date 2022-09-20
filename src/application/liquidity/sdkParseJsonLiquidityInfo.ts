import useConnection from '@/application/connection/useConnection'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { jsonInfo2PoolKeys, Liquidity, LiquidityPoolJsonInfo as LiquidityJsonInfo } from 'test-r-sdk'

import { SDKParsedLiquidityInfo } from './type'

const cache = new Map<LiquidityJsonInfo['id'], SDKParsedLiquidityInfo>()

export function cleanCachedLiquidityInfo() {
  cache.clear()
}

export default async function sdkParseJsonLiquidityInfo(
  liquidityJsonInfos: LiquidityJsonInfo[],
  connection = useConnection.getState().connection
): Promise<SDKParsedLiquidityInfo[]> {
  if (!connection) return []
  if (!liquidityJsonInfos.length) return [] // no jsonInfo
  const allCachedSDKLiquidityInfos = shakeUndifindedItem(liquidityJsonInfos.map((i) => cache.get(i.id)))
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
  if (sdkParsed.length) {
    sdkParsed.forEach((i) => {
      cache.set(toPubString(i.id), i)
    })
  }
  const merged = { ...allCachedSDKLiquidityInfosMap, ...sdkParsedMap }
  return liquidityJsonInfos.map((jsonInfo) => merged[jsonInfo.id])
}
