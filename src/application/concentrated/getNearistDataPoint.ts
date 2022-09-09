import { recursivelyDecimalToFraction } from '@/application/txTools/decimal2Fraction'
import { AmmV3 } from 'test-r-sdk'

export function getNearistDataPoint(info: Parameters<typeof AmmV3['getPriceAndTick']>[0]) {
  const result = AmmV3.getPriceAndTick(info)
  return recursivelyDecimalToFraction(result)
}
