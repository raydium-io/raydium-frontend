import { SplToken, TokenJson } from './type'

export function mergeToken(oldTokenA: TokenJson | undefined, newTokenB: TokenJson): TokenJson
export function mergeToken(oldTokenA: SplToken | undefined, newTokenB: SplToken): SplToken
export function mergeToken(
  oldTokenA: SplToken | TokenJson | undefined,
  newTokenB: SplToken | TokenJson
): SplToken | TokenJson {
  if (!oldTokenA) return newTokenB
  const diffInfo = Object.fromEntries(
    Object.entries(newTokenB).filter(([k, v]) => {
      if (k === 'mint') return false
      if (k === 'name') {
        const vA = oldTokenA[k]
        if (v === 'UNKNOWN') return false // 'UNKNOWN' is a SDK's Token's default value
        if (vA === v) return false
        return true
      }
      if (k === 'symbol') {
        const vA = oldTokenA[k]
        if (v === 'UNKNOWN') return false // 'UNKNOWN' is a SDK's Token's default value
        if (vA === v) return false
        return true
      }
      return oldTokenA[k] !== v
    })
  )
  return Object.assign(oldTokenA, diffInfo)
}
