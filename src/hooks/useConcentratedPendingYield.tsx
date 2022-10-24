import { useMemo } from 'react'

import { Fraction, Token } from 'test-r-sdk'

import { UserPositionAccount } from '@/application/concentrated/type'
import useToken from '@/application/token/useToken'
import toPubString from '@/functions/format/toMintString'
import { add, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { Numberish } from '@/types/constants'

export default function useConcentratedPendingYield(targetUserPositionAccount?: UserPositionAccount) {
  const tokenPrices = useToken((s) => s.tokenPrices)

  return useMemo(() => {
    if (!targetUserPositionAccount) return undefined
    const rewardsVolume: { token?: Token; volume?: Numberish }[] =
      targetUserPositionAccount?.rewardInfos.map((info) => ({
        token: info.penddingReward?.token,
        volume: mul(info.penddingReward, tokenPrices[toPubString(info.penddingReward?.token.mint)])
      })) ?? []

    const feesVolume: { token?: Token; volume?: Numberish }[] = targetUserPositionAccount
      ? [
          {
            token: targetUserPositionAccount?.tokenFeeAmountA?.token,
            volume: mul(
              targetUserPositionAccount?.tokenFeeAmountA,
              tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountA?.token.mint)]
            )
          },
          {
            token: targetUserPositionAccount?.tokenFeeAmountB?.token,
            volume: mul(
              targetUserPositionAccount?.tokenFeeAmountB,
              tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountB?.token.mint)]
            )
          }
        ]
      : []
    const totalVolume = rewardsVolume
      .concat(feesVolume)
      .reduce(
        (acc, { volume }) => (volume ? add(acc ?? toFraction(0), volume) : acc),
        undefined as Fraction | undefined
      )

    return totalVolume
  }, [tokenPrices, targetUserPositionAccount])
}
