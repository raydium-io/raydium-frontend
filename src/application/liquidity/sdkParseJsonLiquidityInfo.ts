import {
  ApiPoolInfoItem,
  ApiPoolInfoItem as LiquidityJsonInfo,
  jsonInfo2PoolKeys,
  TradeV2
} from '@raydium-io/raydium-sdk'

import useConnection from '@/application/connection/useConnection'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'

import { SDKParsedLiquidityInfo } from './type'

const cache = new Map<LiquidityJsonInfo['id'], SDKParsedLiquidityInfo>()

export function cleanCachedLiquidityInfo() {
  cache.clear()
}

export default async function sdkParseJsonLiquidityInfo(
  liquidityJsonInfos: ApiPoolInfoItem[],
  connection = useConnection.getState().connection
): Promise<SDKParsedLiquidityInfo[]> {
  if (!connection) return []
  if (!liquidityJsonInfos.length) return [] // no jsonInfo
  const allCachedSDKLiquidityInfos = shakeUndifindedItem(liquidityJsonInfos.map((i) => cache.get(i.id)))
  const allCachedSDKLiquidityInfosMap = listToMap(allCachedSDKLiquidityInfos, (i) => toPubString(i.id))
  const allCachedIDs = allCachedSDKLiquidityInfos.map((i) => toPubString(i.id))
  const allNeedSDKParsedLiquidityInfos = liquidityJsonInfos.filter((jsonInfo) => !allCachedIDs.includes(jsonInfo.id))

  const info = await (allNeedSDKParsedLiquidityInfos.length
    ? TradeV2.fetchMultipleInfo({
        connection,
        pools: allNeedSDKParsedLiquidityInfos
      })
        .catch(() => [])
        .then((res) => Object.values(res))
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
