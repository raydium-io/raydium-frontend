import { Percent } from '@raydium-io/raydium-sdk'

import { gt } from '../numberish/compare'
import toFraction from '../numberish/toFraction'

import toPercentString from './toPercentString'

const MAX_APR = 9999.99

export function formatApr(
  apr: Percent | number | string | undefined,
  option?: {
    alreadyPercented: boolean
  }
): string {
  let fractionN = toFraction(apr ?? 0)
  if (!option?.alreadyPercented) {
    fractionN = fractionN.mul(100)
  }

  if (gt(fractionN, MAX_APR)) {
    return '>9,999.99%'
  }

  return toPercentString(fractionN, { alreadyPercented: true })
}
