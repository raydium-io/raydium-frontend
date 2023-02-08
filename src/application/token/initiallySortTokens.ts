import toPubString from '@/functions/format/toMintString'
import { SplToken, TokenJson } from './type'

const startWithSymbol = (s: string | undefined) => Boolean(s) && !/^[a-zA-Z]/.test(s!)

/**
 * use in initial load
 */
export function initiallySortTokens<T extends SplToken | TokenJson>(
  tokens: T[],
  _officialMints: Iterable<string>,
  _unOfficialMints: Iterable<string>
): T[] {
  const officialMints = new Set(_officialMints)
  const unOfficialMints = new Set(_unOfficialMints)
  const tokenWithPriority = tokens.map((token) => ({
    token,
    order: officialMints.has(toPubString(token.mint)) ? 1 : unOfficialMints.has(toPubString(token.mint)) ? 2 : 3
  }))
  const result = tokenWithPriority.sort((a, b) => {
    const priorityOrderDiff = a.order - b.order
    if (priorityOrderDiff === 0) {
      const aStartWithSymbol = startWithSymbol(a.token.symbol)
      const bStartWithSymbol = startWithSymbol(b.token.symbol)
      if (aStartWithSymbol && !bStartWithSymbol) return 1
      if (!aStartWithSymbol && bStartWithSymbol) return -1
      return (a.token.symbol ?? '').localeCompare(b.token.symbol ?? '')
    } else {
      return priorityOrderDiff
    }
  })
  return result.map((r) => r.token)
}
