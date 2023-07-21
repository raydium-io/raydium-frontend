import { Fraction } from '@raydium-io/raydium-sdk'

export function shakeFractionDecimal(n: Fraction, roundDirection: 'up' | 'down' = 'down'): string {
  const [, sign = '', int = '', dec = ''] = n.toFixed(2).match(/(-?)(\d*)\.?(\d*)/) ?? []
  if (roundDirection === 'up' && Number(dec) > 0) return `${sign}${BigInt(int) + BigInt(1)}`
  return `${sign}${int}`
}
