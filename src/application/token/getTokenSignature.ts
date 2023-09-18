import toPubString from '@/functions/format/toMintString'
import { SplToken } from './type'

export function getTokenSignature(token: SplToken | undefined) {
  if (!token) return ''
  return token.mintString + token.decimals + token.symbol + token.icon
}
