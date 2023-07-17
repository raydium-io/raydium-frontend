import { ApiAmmV3PositionLinePoint, Fraction, Percent } from '@raydium-io/raydium-sdk'

import { SplToken } from '@/application/token/type'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { Numberish } from '@/types/constants'

import { ChartPoint } from './type'
import { toPercent } from '@/functions/format/toPercent'

export function canTokenPairBeSelected(targetToken: SplToken | undefined, candidateToken: SplToken | undefined) {
  return !isMintEqual(targetToken?.mint, candidateToken?.mint)
}

export function toXYChartFormat(points: ApiAmmV3PositionLinePoint[]): ChartPoint[] {
  return points.map(({ liquidity, price }) => ({
    x: Number(price),
    y: Number(liquidity)
  }))
}

interface CalculateProps {
  coin1Amount?: Numberish
  coin2Amount?: Numberish
  currentPrice?: Fraction
  coin1InputDisabled: boolean
  coin2InputDisabled: boolean
}
export function calculateRatio({
  coin1Amount,
  coin2Amount,
  currentPrice,
  coin1InputDisabled,
  coin2InputDisabled
}: CalculateProps): { ratio1?: Percent; ratio2?: Percent } {
  const [amount1, amount2] = [(coin1InputDisabled ? '0' : coin1Amount) || '0', coin2InputDisabled ? '0' : coin2Amount]
  const [amount1HasVal, amount2HasVal] = [gt(amount1, 0), gt(amount2, 0)]
  const amount2Fraction = toFraction(amount2 || '0')
  const denominator = currentPrice
    ? amount1HasVal
      ? mul(amount1, currentPrice).add(amount2Fraction)
      : amount2HasVal
      ? amount2Fraction
      : toFraction(1)
    : toFraction(1)

  try {
    const ratio1 = currentPrice ? div(mul(amount1, currentPrice), denominator) : toPercent(0)
    const ratio2 = currentPrice ? div(amount2Fraction, denominator) : toPercent(0)
    return { ratio1, ratio2 }
  } catch {
    return {}
  }
}
