import { HydratedConcentratedInfo, UserPositionAccount } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConnection from '@/application/connection/useConnection'
import useToken from '@/application/token/useToken'
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

export function useConcentratedAprCalc({ ammPool }: { ammPool: HydratedConcentratedInfo | undefined }) {
  const tickLower = useConcentrated((s) => s.priceLowerTick)
  const tickUpper = useConcentrated((s) => s.priceUpperTick)
  const timeBasis = useConcentrated((s) => s.timeBasis)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const tokens = useToken((s) => s.tokens)
  const tokenDecimals = objectMap(tokens, (i) => i.decimals)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const aprCalcMethod = useConcentrated((s) => s.aprCalcMode)
  const apr = useMemo(
    () =>
      tickLower && tickUpper && ammPool
        ? ammPool.getApr({
            tickLower,
            tickUpper,
            tokenPrices,
            tokenDecimals,
            timeBasis: timeBasis.toLowerCase() as '24h' | '7d' | '30d',
            planType: aprCalcMethod,
            chainTimeOffsetMs: chainTimeOffset
          })
        : undefined,
    [chainTimeOffset, timeBasis, aprCalcMethod, tokens, tickLower, tickUpper, ammPool]
  )
  return apr
}
