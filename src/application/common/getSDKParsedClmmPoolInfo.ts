import { ApiClmmPoolsItem, Clmm, ClmmPoolInfo, ClmmPoolPersonalPosition, TokenAccount } from '@raydium-io/raydium-sdk'
import { Connection, PublicKey } from '@solana/web3.js'
import useConnection from '@/application/connection/useConnection'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'

const parsedClmmPoolInfoCache = new Map<
  string,
  Promise<{
    state: ClmmPoolInfo
    positionAccount?: ClmmPoolPersonalPosition[] | undefined
  }>
>()

export function clearSDKClmmPoolInfoCache() {
  parsedClmmPoolInfoCache.clear()
}
export async function getSDKParsedClmmPoolInfo({
  connection,
  apiClmmPoolItems,
  ownerInfo,
  chainTimeOffset = useConnection.getState().chainTimeOffset ?? 0
}: {
  connection: Connection
  apiClmmPoolItems: ApiClmmPoolsItem[]
  ownerInfo?: { tokenAccounts: TokenAccount[]; wallet: PublicKey }
  chainTimeOffset?: number
}) {
  const needRefetchApiAmmPools = apiClmmPoolItems.filter(({ id }) => !parsedClmmPoolInfoCache.has(toPubString(id)))
  if (needRefetchApiAmmPools.length) {
    const sdkParsedPromise = Clmm.fetchMultiplePoolInfos({
      poolKeys: needRefetchApiAmmPools,
      connection,
      batchRequest: true,
      ownerInfo: ownerInfo,
      chainTime: (Date.now() + chainTimeOffset) / 1000
    })
    needRefetchApiAmmPools.forEach((apiAmmV3Pool) => {
      const id = toPubString(apiAmmV3Pool.id)
      parsedClmmPoolInfoCache.set(
        id,
        sdkParsedPromise.then((sdk) => sdk[id])
      )
    })
  }

  const apiAmmPoolsArray = await Promise.all(
    apiClmmPoolItems.map(({ id }) => parsedClmmPoolInfoCache.get(toPubString(id))!)
  )
  const map = listToMap(apiAmmPoolsArray, (i) => toPubString(i.state.id))
  return map
}
