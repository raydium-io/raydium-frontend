import { PublicKey } from '@solana/web3.js'

import { PublicKeyish } from '@raydium-io/raydium-sdk'

import { isArray, isObject, isString } from '../judgers/dateType'
import { objectMap } from '../objectMethods'
import tryCatch from '../tryCatch'

const pubCache = new WeakMap<PublicKey, string>()
const reversePubCache = new Map<string, WeakRef<PublicKey>>()

export default function toPubString(mint: PublicKeyish | undefined | null): string {
  if (!mint) return ''
  if (isString(mint)) return mint
  if (pubCache.has(mint)) {
    return pubCache.get(mint)!
  } else {
    const mintString = mint.toBase58()
    pubCache.set(mint, mintString)
    reversePubCache.set(mintString, new WeakRef(mint))
    return mintString
  }
}

// TODO: use mintCache
export function toPub(mint: PublicKeyish): PublicKey
export function toPub(mint: undefined): undefined
export function toPub(mint: PublicKeyish | undefined): PublicKey | undefined
export function toPub(mint: PublicKeyish | undefined): PublicKey | undefined {
  if (!mint) return undefined
  if (mint instanceof PublicKey) return mint
  if (reversePubCache.has(mint)) {
    return reversePubCache.get(mint)!.deref()
  } else {
    const pub = (() => {
      try {
        return new PublicKey(mint)
      } catch {
        return undefined
      }
    })()
    pub && reversePubCache.set(mint, new WeakRef(pub))
    pub && pubCache.set(pub, mint)
    return pub
  }
}

export function tryToPub<T>(v: T): T | PublicKey {
  return isString(v)
    ? tryCatch(
        () => new PublicKey(v),
        // @ts-expect-error public or string
        () => v
      )
    : v
}

/**
 * just push the result to cache
 */
export function recordPubString(...args: Parameters<typeof toPubString>): void {
  toPubString(...args)
}

export function ToPubPropertyValue(obj: unknown) {
  if (!isObject(obj)) return tryToPub(obj)
  if (isArray(obj)) return obj.map((i) => ToPubPropertyValue(i))
  return objectMap(obj, (v) => ToPubPropertyValue(v))
}
