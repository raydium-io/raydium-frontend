import toPubString from '@/functions/format/toMintString'
import { SplToken } from './type'

export function getTokenSignature(token: SplToken | undefined) {
  if (!token) return ''
  return toPubString(token.mint) + token.decimals + token.symbol + token.icon
}
