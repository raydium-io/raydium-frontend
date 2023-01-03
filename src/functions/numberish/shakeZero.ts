import { Numberish } from '@/types/constants'

import { eq } from './compare'
import { toString } from './toString'

/**
 * let zero be empty string
 */
export function shakeZero<T extends Numberish | undefined>(n: T): string {
  if (n === undefined || n.toString().includes('Infinity') || isNaN(n as number)) return ''
  const input = n ? toString(n) : ''
  return eq(input, 0) ? '' : input
}
