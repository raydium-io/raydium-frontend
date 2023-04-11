import { HydratedConcentratedInfo, UserPositionAccount } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConnection from '@/application/connection/useConnection'
import useToken from '@/application/token/useToken'
import { toPercent } from '@/functions/format/toPercent'
import { div } from '@/functions/numberish/operations'
import { objectMap } from '@/functions/objectMethods'
import BN from 'bn.js'
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

export function useConcentratedTickAprCalc({
  ammPool,
  forceInfo
}: {
  ammPool: HydratedConcentratedInfo | undefined
  forceInfo?: { tickLower?: number; tickUpper?: number; liquidity?: BN } // NOTE: 💩💩💩, in prev, it is only clmm's page state, but, when migration ui is on, it is clmm's component state. formInfo is the info from component, default is info from page state. It's wrong and urgly 💩💩💩
}) {
  const tickLower =
    forceInfo && 'tickLower' in forceInfo ? forceInfo.tickLower : useConcentrated((s) => s.priceLowerTick)
  const tickUpper =
    forceInfo && 'tickUpper' in forceInfo ? forceInfo.tickUpper : useConcentrated((s) => s.priceUpperTick)
  const liquidity = forceInfo && 'liquidity' in forceInfo ? forceInfo.liquidity : useConcentrated((s) => s.liquidity)

  const timeBasis = useConcentrated((s) => s.timeBasis)
  const planType = useConcentrated((s) => s.aprCalcMode)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const aprCalcMethod = useConcentrated((s) => s.aprCalcMode)

  const tokens = useToken((s) => s.tokens)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const token = useToken((s) => s.tokens)
  const tokenDecimals = objectMap(token, (i) => i.decimals)
  const apr = useMemo(
    () =>
      tickLower != null && tickUpper != null && ammPool && liquidity
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
      percentInTotal: toPercent(div(ra, totalApr)),
      token: ammPool.rewardInfos[idx]?.rewardToken
    })),
    apr: totalApr
  }
}
