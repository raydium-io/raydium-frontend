import toPubString, { toPub } from '@/functions/format/toMintString'
import { MayArray, PublicKeyish } from '@/types/constants'
import { ReturnTypeFetchMultipleMintInfos, fetchMultipleMintInfos } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
import { createTimeoutMap } from '@/functions/createTimeoutMap'

const mintInfoCache = createTimeoutMap<PublicKeyish, Promise<ReturnTypeFetchMultipleMintInfos>>({
  maxAgeMs: 10 * 60 * 1000
})

/**
 *
 * @todo cache for 10min
 */
export async function getMultiMintInfos({ mints }: { mints: MayArray<PublicKeyish> }) {
  const { connection } = useConnection.getState()
  if (!connection) return Promise.reject('connection is not ready')
  const allMints = [mints].flat()
  const key = allMints.map((i) => toPubString(i)).join(',')
  const v = mintInfoCache.get(key)
  if (!v) {
    const i = fetchMultipleMintInfos({ connection, mints: allMints.map((i) => toPub(i)) })
    mintInfoCache.set(key, i)
    return i
  } else {
    return v
  }
}
