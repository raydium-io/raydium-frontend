import { ReplaceType, validateAndParsePublicKey } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

export function jsonInfo2PoolKeys<T>(jsonInfo: T): ReplaceType<T, string, PublicKey> {
  // @ts-expect-error no need type for inner code
  return Object.entries(jsonInfo).reduce((result, [key, value]) => {
    if (typeof value === 'string') {
      result[key] = validateAndParsePublicKey(value)
    } else if (value instanceof Array) {
      result[key] = value.map((k) => jsonInfo2PoolKeys(k))
    } else {
      result[key] = value
    }

    return result
  }, {})
}
