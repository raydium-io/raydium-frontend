import { PublicKeyish, Token } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { isString } from '../judgers/dateType'

const mintCache = new WeakMap<PublicKey, string>()

//TODO: no token
export default function toPubString(mint: PublicKeyish | undefined): string {
  if (!mint) return ''
  if (isString(mint)) return mint
  if (mintCache.has(mint)) {
    return mintCache.get(mint)!
  } else {
    const mintString = mint.toBase58()
    mintCache.set(mint, mintString)
    return mintString
  }
}

export function toPub(mint: PublicKeyish): PublicKey
export function toPub(mint: undefined): undefined
export function toPub(mint: PublicKeyish | undefined): PublicKey | undefined
export function toPub(mint: PublicKeyish | undefined): PublicKey | undefined {
  if (!mint) return undefined
  return new PublicKey(mint)
}

export function recordPubString(...args: Parameters<typeof toPubString>): void {
  toPubString(...args)
}
