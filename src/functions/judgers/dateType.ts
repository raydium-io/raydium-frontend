import { PublicKey } from '@solana/web3.js'

import BN from 'bn.js'
import Decimal from 'decimal.js'
import { Fraction, Token, TokenAmount } from '@raydium-io/raydium-sdk'

import { AnyFn, Numberish, Primitive, StringNumber } from '@/types/constants'

import toPubString, { toPub } from '../format/toMintString'
import tryCatch from '../tryCatch'

export const isArray = Array.isArray
export const isSet = (v: unknown): v is Set<unknown> => {
  return v instanceof Set
}
export const isMap = (v: unknown): v is Map<unknown, unknown> => {
  return v instanceof Map
}
export function isFunction(value: unknown): value is AnyFn {
  return typeof value === 'function'
}

export function isObject(val: unknown): val is Record<string | number, any> | Array<any> {
  return !(val === null) && typeof val === 'object'
}

export function isUndefined(val: unknown): val is undefined {
  return val === undefined
}
/**
 * @example
 * inArray(2, [1, 2, 3]) // true
 * inArray('hello', ['hello', 'world']) // true
 */

export function inArray<T>(val: T, arr: T[]): boolean {
  return arr.includes(val)
}
/**
 * @example
 * notEmptyObject({}) //=> false
 */

export function notEmptyObject(target: Record<string, any>): boolean {
  return Boolean(Object.keys(target).length)
}
/**
 * @example
 * notEmptyObject({}) //=> true
 */

export function isEmptyObject(target: Record<string, any>): boolean {
  return !notEmptyObject(target)
}

export function isRegExp(target: unknown): target is RegExp {
  return isObject(target) && target instanceof RegExp
}

export function isNumber(val: unknown): val is number {
  return typeof val === 'number'
}

export function isFinite(val: unknown): val is number {
  return Number.isFinite(val)
}

export function isNaN(val: unknown): val is number {
  return Number.isNaN(val)
}

export function isBoolean(val: unknown): val is boolean {
  return typeof val === 'boolean'
}

/**
 * @example
 * isBigInt(2n) //=> true
 * isBigInt(Bigint(3)) //=> true
 * isBigInt('3') //=> false
 */
export function isBigInt(val: unknown): val is bigint {
  return typeof val === 'bigint'
}

export function isString(val: unknown): val is string {
  return typeof val === 'string'
}

export function isPrimitive(val: unknown): val is Primitive {
  return isBoolean(val) || isNumber(val) || isString(val) || isBigInt(val)
}

export function isEmtyObject(obj: any): boolean {
  return (isArray(obj) && obj.length === 0) || (isObject(obj) && Object.keys(obj).length === 0)
}

export function isEmtyString(v: any): boolean {
  return v === ''
}

export function isBN(val: unknown): val is BN {
  return val instanceof BN
}

export function isFraction(val: unknown): val is Fraction {
  return val instanceof Fraction
}

//#region -------------------  -------------------
export function isNumberish(val: any): val is Numberish {
  return isNumber(val) || BN.isBN(val) || isBigInt(val) || isStringNumber(val) || val instanceof Fraction
}

export function isStringNumber(val: any): val is StringNumber {
  if (Number.isNaN(Number(val))) return false
  return isNumber(Number(val))
}
//#endregion

export function isToken(val: any): val is Token {
  return val instanceof Token
}

export function isTokenAmount(val: any): val is TokenAmount {
  return val instanceof TokenAmount
}

export function isPubKey(val: unknown): val is PublicKey {
  return val instanceof PublicKey
}

export function isPubKeyish<T extends PublicKey | string>(val: T): val is T
export function isPubKeyish(val: any): val is PublicKey | string
export function isPubKeyish(val: any): val is PublicKey | string {
  return typeof val === 'string' || val instanceof PublicKey
}

export function isDecimal(val: unknown): val is Decimal {
  return val instanceof Decimal
}

export function isValidPublicKey(val: string | undefined): val is string
export function isValidPublicKey(val: PublicKey | undefined): val is PublicKey
export function isValidPublicKey(val: string | PublicKey | undefined): val is string {
  if (!val) return false
  if (val instanceof PublicKey) return true
  try {
    new PublicKey(val)
  } catch (err) {
    return false
  }
  return true
}
