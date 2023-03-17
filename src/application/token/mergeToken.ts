import toPubString from '@/functions/format/toMintString'
import { SplToken, TokenJson } from './type'

export function mergeToken(oldTokenA: TokenJson | undefined, newTokenB: TokenJson): TokenJson
export function mergeToken(oldTokenA: SplToken | undefined, newTokenB: SplToken): SplToken
export function mergeToken(oldTokenA: TokenJson, newTokenB: TokenJson | undefined): TokenJson
export function mergeToken(oldTokenA: SplToken, newTokenB: SplToken | undefined): SplToken
export function mergeToken(oldTokenA: TokenJson | undefined, newTokenB: TokenJson | undefined): TokenJson | undefined
export function mergeToken(oldTokenA: SplToken | undefined, newTokenB: SplToken | undefined): SplToken | undefined
export function mergeToken(
  oldTokenA: SplToken | TokenJson | undefined,
  newTokenB: SplToken | TokenJson | undefined
): SplToken | TokenJson | undefined {
  if (!oldTokenA) return newTokenB
  if (!newTokenB) return oldTokenA
  const diffInfo = Object.fromEntries(
    Object.entries(newTokenB).filter(([k, vB]) => {
      if (k === 'symbol' && oldTokenA[k]) {
        const isSystemDefaultValue = vB === 'UNKNOWN'
        const isCustomizedDefaultValue = vB.length >= 6 && newTokenB[k]?.startsWith(vB)
        const needIgnore = isSystemDefaultValue || isCustomizedDefaultValue
        return !needIgnore
      }
      if (k === 'name' && oldTokenA[k]) {
        const isSystemDefaultValue = vB === 'UNKNOWN'
        const isCustomizedDefaultValue = vB.length >= 12 && newTokenB[k]?.startsWith(vB)
        const needIgnore = isSystemDefaultValue || isCustomizedDefaultValue
        return !needIgnore
      }
      return oldTokenA[k] !== vB
    })
  )
  return Object.assign({}, oldTokenA, diffInfo)
}
