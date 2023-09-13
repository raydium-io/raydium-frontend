import { mergeObjectsWithConfigs } from '@/functions/mergeObjects'
import { SplToken, TokenJson } from './type'
import toPubString from '@/functions/format/toMintString'

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

  return mergeObjectsWithConfigs([oldTokenA, newTokenB], ({ key, valueA, valueB }) => {
    if (key === 'symbol' && valueA) {
      const isSystemDefaultValue = valueB === 'UNKNOWN'
      const isCustomizedDefaultValue = valueB.length >= 6 && toPubString(newTokenB['mint'])?.startsWith(valueB)
      const needIgnore = isSystemDefaultValue || isCustomizedDefaultValue
      return needIgnore ? valueA : valueB
    } else if (key === 'name' && valueA) {
      const isSystemDefaultValue = valueB === 'UNKNOWN'
      const isCustomizedDefaultValue = valueB.length >= 12 && toPubString(newTokenB['mint'])?.startsWith(valueB)
      const needIgnore = isSystemDefaultValue || isCustomizedDefaultValue
      return needIgnore ? valueA : valueB
    } else {
      return valueB ?? valueA
    }
  })
}
