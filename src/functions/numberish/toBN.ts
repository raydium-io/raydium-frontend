import BN from 'bn.js'

import { Numberish } from '@/types/constants'
import { BigNumberish, TEN } from '@raydium-io/raydium-sdk'

import toFraction from './toFraction'

/**
 * only int part will become BN
 */
export default function toBN(n: Numberish, decimal: BigNumberish = 0): BN {
  if (n instanceof BN) return n
  return new BN(
    toFraction(n)
      .mul(TEN.pow(new BN(String(decimal))))
      .toFixed(0)
  )
}
