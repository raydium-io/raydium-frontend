import { HydratedConcentratedInfo, UserPositionAccount } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConnection from '@/application/connection/useConnection'
import useToken from '@/application/token/useToken'
import { toPercent } from '@/functions/format/toPercent'
import { div } from '@/functions/numberish/operations'
import { objectMap } from '@/functions/objectMethods'
import { useMemo } from 'react'

export function useConcentratedPositionAprCalc({
  positionAccount
}: {
  positionAccount: UserPositionAccount | undefined
}) {
  const timeBasis = useConcentrated((s) => s.timeBasis)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const token = useToken((s) => s.tokens)
  const tokenDecimals = objectMap(token, (i) => i.decimals)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const aprCalcMethod = useConcentrated((s) => s.aprCalcMode)
  const apr = useMemo(
    () =>
      positionAccount?.getApr({
        tokenPrices,
        tokenDecimals,
        timeBasis: timeBasis.toLowerCase() as '24h' | '7d' | '30d',
        planType: aprCalcMethod,
        chainTimeOffsetMs: chainTimeOffset
      }),
    [chainTimeOffset, timeBasis, aprCalcMethod, positionAccount]
  )
  return apr
}

export function useConcentratedTickAprCalc({ ammPool }: { ammPool: HydratedConcentratedInfo | undefined }) {
  const tickLower = useConcentrated((s) => s.priceLowerTick)
  const tickUpper = useConcentrated((s) => s.priceUpperTick)
  const timeBasis = useConcentrated((s) => s.timeBasis)
  const planType = useConcentrated((s) => s.aprCalcMode)
  const tokens = useToken((s) => s.tokens)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const aprCalcMethod = useConcentrated((s) => s.aprCalcMode)
  const liquidity = useConcentrated((s) => s.liquidity)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const token = useToken((s) => s.tokens)
  const tokenDecimals = objectMap(token, (i) => i.decimals)
  const apr = useMemo(
    () =>
      tickLower && tickUpper && ammPool && liquidity
        ? ammPool.getTickApr({
            timeBasis: timeBasis.toLowerCase() as '24h' | '7d' | '30d',
            tickLower,
            tickUpper,
            chainTimeOffsetMs: chainTimeOffset,
            planType,
            tokenDecimals,
            tokenPrices,
            liquidity
          })
        : undefined,
    [chainTimeOffset, timeBasis, aprCalcMethod, tokens, tickLower, tickUpper, ammPool, liquidity]
  )
  return apr
}
export function useConcentratedPoolAprCalc({ ammPool }: { ammPool: HydratedConcentratedInfo | undefined }) {
  const timeBasis = useConcentrated((s) => s.timeBasis)
  if (!ammPool) return
  const feeApr = ammPool[timeBasis === '24H' ? 'feeApr24h' : timeBasis === '7D' ? 'feeApr7d' : 'feeApr30d']
  const rewardsApr = ammPool[timeBasis === '24H' ? 'rewardApr24h' : timeBasis === '7D' ? 'rewardApr7d' : 'rewardApr30d']
  const totalApr = ammPool[timeBasis === '24H' ? 'totalApr24h' : timeBasis === '7D' ? 'totalApr7d' : 'totalApr30d']
  return {
    fee: {
      apr: feeApr,
      percentInTotal: toPercent(div(feeApr, totalApr))
    },
    rewards: rewardsApr.map((ra, idx) => ({
      apr: ra,
      percentInTotal: toPercent(div(feeApr, totalApr)),
      token: ammPool.rewardInfos[idx]?.rewardToken
    })),
    apr: totalApr
  }
}
