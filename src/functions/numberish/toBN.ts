import BN from 'bn.js'

import { Numberish } from '@/types/constants'
import { BigNumberish, TEN } from '@raydium-io/raydium-sdk'

import toFraction from './toFraction'
import { shakeFractionDecimal } from './shakeFractionDecimal'

/**
 * only int part will become BN
 */
export default function toBN(n: undefined): undefined
export default function toBN(n: Numberish, decimal?: BigNumberish): BN
export default function toBN(n: Numberish | undefined, decimal: BigNumberish = 0): BN | undefined {
  if (n == null) return undefined
  if (n instanceof BN) return n
  return new BN(shakeFractionDecimal(toFraction(n).mul(TEN.pow(new BN(String(decimal))))))
}
