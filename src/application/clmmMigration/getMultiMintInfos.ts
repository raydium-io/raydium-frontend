import toPubString, { toPub } from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'
import { fetchMultipleMintInfos } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
import { createTimeoutMap } from '@/functions/createTimeoutMap'

const mintInfoCache = createTimeoutMap<PublicKeyish, any>({ maxAgeMs: 10 * 60 * 1000 })

/**
 *
 * @todo cache for 10min
 */
export async function getMultiMintInfos({ mints }: { mints: PublicKeyish[] }) {
  const { connection } = useConnection.getState()
  if (!connection) return Promise.reject('connection is not ready')
  const key = mints.map((i) => toPubString(i)).join(',')
  const v = mintInfoCache.get(key)
  if (!v) {
    const i = fetchMultipleMintInfos({ connection, mints: mints.map((i) => toPub(i)) })
    mintInfoCache.set(key, i)
    return i
  } else {
    return v
  }
}
