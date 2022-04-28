import BN from 'bn.js'

import { Numberish, StringNumber } from '@/types/constants'
import { Fraction } from '@raydium-io/raydium-sdk'

/**
 *
 * @example
 * getIntInfo(0.34) //=> { numerator: '34', denominator: '100'}
 * getIntInfo('0.34') //=> { numerator: '34', denominator: '100'}
 */
export default function parseNumberInfo(n: Numberish | undefined): {
  denominator: string
  numerator: string
  sign?: string
  int?: string
  dec?: string
} {
  if (n === undefined) return { denominator: '1', numerator: '0' }
  if (n instanceof BN) {
    return { numerator: n.toString(), denominator: '1' }
  }

  if (n instanceof Fraction) {
    return { denominator: n.denominator.toString(), numerator: n.numerator.toString() }
  }

  const s = String(n)
  const [, sign = '', int = '', dec = ''] = s.match(/(-?)(\d*)\.?(\d*)/) ?? []
  const denominator = '1' + '0'.repeat(dec.length)
  const numerator = sign + (int === '0' ? '' : int) + dec || '0'
  return { denominator, numerator, sign, int, dec }
}
