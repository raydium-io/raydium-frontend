import { ApiAmmV3Point } from 'test-r-sdk'
import { SplToken } from '@/application/token/type'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { ChartPoint } from './type'

export function canTokenPairBeSelected(targetToken: SplToken | undefined, candidateToken: SplToken | undefined) {
  return !isMintEqual(targetToken?.mint, candidateToken?.mint)
}

export function toXYChartFormat(points: ApiAmmV3Point[]): ChartPoint[] {
  return points.map(({ liquidity, price }) => ({
    x: Number(price),
    y: Number(liquidity)
  }))
}
