import { PublicKeyish } from 'test-r-sdk'
import { PublicKey } from '@solana/web3.js'

import { SplToken, Token } from '@/application/token/type'

import toPubString from '../format/toMintString'
import { isObject, isUndefined } from './dateType'

export function areEqual(v1: any, v2: any) {
  return v1 === v2
}

/**
 * @example
 * areShallowEqual([1, 2], [1, 2]) // true
 * areShallowEqual({hello: 1}, {hello: 1}) // true
 */
export function areShallowEqual(v1: any, v2: any) {
  return isObject(v1) && isObject(v2)
    ? Object.keys(v1).length === Object.keys(v2).length &&
        Object.entries(v1).every(([key, value]) => areEqual(value, v2[key]))
    : areEqual(v1, v2)
}

/**
 * @example
 * areShallowShallowEqual([1, [2]], [1, [2]]) // true
 * areShallowShallowEqual({hello: {hi: 233}}, {hello: {hi: 233}}) // true
 */
export function areShallowShallowEqual(v1: any, v2: any) {
  return isObject(v1) && isObject(v2)
    ? Object.keys(v1).length === Object.keys(v2).length &&
        Object.entries(v1).every(([key, value]) => areShallowEqual(value, v2[key]))
    : areShallowEqual(v1, v2)
}

export function isMintEqual(p1: Token | PublicKeyish | undefined, p2: Token | PublicKeyish | undefined) {
  if (p1 == undefined || p2 == undefined) return false
  const publicKeyish1 = p1 instanceof Token ? p1.mint : p1
  const publicKeyish2 = p2 instanceof Token ? p2.mint : p2
  if (p1 instanceof PublicKey && p2 instanceof PublicKey) return p1.equals(p2)
  return toPubString(publicKeyish1) === toPubString(publicKeyish2)
}

export function areEqualToken(token1?: SplToken | Token, token2?: SplToken | Token) {
  return isMintEqual(token1?.mint, token2?.mint)
}

export function isStringInsensitivelyEqual(s1: string | undefined, s2: string | undefined) {
  if (isUndefined(s1) || isUndefined(s2)) return false
  return s1.toLowerCase() === s2.toLowerCase()
}

export function isStringInsensitivelyContain(s1: string | undefined, s2: string | undefined) {
  if (isUndefined(s1) || isUndefined(s2)) return false
  return s1.toLowerCase().includes(s2.toLowerCase())
}
