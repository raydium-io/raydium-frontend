import BN from 'bn.js'
import { Fraction } from '@raydium-io/raydium-sdk'

import { Numberish } from '@/types/constants'

/**
 * @example
 * parseNumberInfo(0.34) //=> { numerator: '34', denominator: '100'}
 * parseNumberInfo('0.34') //=> { numerator: '34', denominator: '100'}
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
  const [, sign = '', int = '', dec = '', expN] = s.replace(',', '').match(/(-?)(\d*)\.?(\d*)(?:e(-?\d+))?/) ?? []
  if (expN) {
    // have scientific notion part
    const nexpN = Number(expN)
    const n = offsetDecimalDot(`${sign}${int}.${dec}`, nexpN)
    return parseNumberInfo(n)
  } else {
    const nexpN = Number(expN)
    const denominator = '1' + '0'.repeat(dec.length + (nexpN < 0 ? -expN : 0))
    const numerator = sign + (int === '0' ? '' : int) + dec || '0'
    return { denominator, numerator, sign, int, dec }
  }
}

/** offset:  negative is more padding start zero */
function offsetDecimalDot(s: string, offset: number) {
  const [, sign = '', int = '', dec = ''] = s.replace(',', '').match(/(-?)(\d*)\.?(\d*)(?:e(-?\d+))?/) ?? []
  const oldDecLength = dec.length
  const newDecLength = oldDecLength - offset
  if (newDecLength > int.length + dec.length) {
    return `${sign}0.${(int + dec).padStart(newDecLength, '0')}`
  } else {
    return `${sign}${(int + dec).slice(0, -newDecLength)}.${(int + dec).slice(-newDecLength)}`
  }
}
