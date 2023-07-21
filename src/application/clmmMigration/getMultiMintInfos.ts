import { createTimeoutMap } from '@/functions/createTimeoutMap'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { MayArray, PublicKeyish } from '@/types/constants'
import { ReturnTypeFetchMultipleMintInfo, fetchMultipleMintInfos } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
import { shakeUndifindedItem } from '@/functions/arrayMethods'

// cache for 10 mins
const mintInfoCache = createTimeoutMap<string, Promise<ReturnTypeFetchMultipleMintInfo>>({
  maxAgeMs: 10 * 60 * 1000
})

export async function getMultiMintInfos({ mints }: { mints: MayArray<PublicKeyish> }) {
  const { connection } = useConnection.getState()
  if (!connection) return Promise.reject('connection is not ready')
  const allMints = [mints].flat()

  const alreadyCachedInfos = Object.fromEntries(
    shakeUndifindedItem(
      allMints.map((m) =>
        mintInfoCache.has(toPubString(m)) ? [toPubString(m), mintInfoCache.get(toPubString(m))!] : undefined
      )
    )
  )
  const needCheckMints = allMints.filter((m) => !mintInfoCache.has(toPubString(m)))

  if (needCheckMints.length !== 0) {
    const infos = fetchMultipleMintInfos({ connection, mints: allMints.map((i) => toPub(i)) })
    needCheckMints.forEach((needCheckMint) => {
      mintInfoCache.set(
        toPubString(needCheckMint),
        infos.then((i) => i[toPubString(needCheckMint)])
      )
    })
    return Promise.all([infos, awaitAllObjectValue(alreadyCachedInfos)]).then(([infos, alreadyCachedInfos]) => ({
      ...alreadyCachedInfos,
      ...infos
    }))
  } else {
    return awaitAllObjectValue(alreadyCachedInfos)
  }
}

/**
 * { a: Promise<'hello'>, b: Promise<'world'>} => Promise<{a: 'hello', b: 'world'}>
 */
function awaitAllObjectValue<T extends Record<string, any>>(o: T): Record<keyof T, Awaited<T[keyof T]>> {
  return Promise.all(Object.values(o)).then((values) => {
    const result = {}
    for (const [idx, key] of Object.keys(o).entries()) {
      const v = values[idx]
      result[key] = v
    }
    return result
  }) as any
}
