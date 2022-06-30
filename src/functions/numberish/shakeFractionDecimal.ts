import { Fraction } from '@raydium-io/raydium-sdk'

export function shakeFractionDecimal(n: Fraction): string {
  const [, sign = '', int = '', dec = ''] = n.toFixed(2).match(/(-?)(\d*)\.?(\d*)/) ?? []
  return `${sign}${int}`
}
