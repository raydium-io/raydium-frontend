import { recursivelyDecimalToFraction } from '@/application/txTools/decimal2Fraction'
import { AmmV3 } from 'test-r-sdk'

export function getPriceAndTick(info: Parameters<typeof AmmV3['getPriceAndTick']>[0]) {
  const result = AmmV3.getPriceAndTick(info)
  return recursivelyDecimalToFraction(result)
}

export function getNextPriceAndTick(info: Parameters<typeof AmmV3['getTickPrice']>[0]) {
  const result = AmmV3.getTickPrice(info)
  return recursivelyDecimalToFraction(result)
}

export function getPrevPriceAndTick(info: Parameters<typeof AmmV3['getTickPrice']>[0]) {
  const result = AmmV3.getTickPrice(info)
  return recursivelyDecimalToFraction(result)
}
