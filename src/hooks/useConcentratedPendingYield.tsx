import { useMemo } from 'react'

import { Fraction, Token } from '@raydium-io/raydium-sdk'

import { UserPositionAccount } from '@/application/concentrated/type'
import useToken from '@/application/token/useToken'
import toPubString from '@/functions/format/toMintString'
import { gt } from '@/functions/numberish/compare'
import { add, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { Numberish } from '@/types/constants'

export default function useConcentratedPendingYield(targetUserPositionAccount?: UserPositionAccount) {
  const tokenPrices = useToken((s) => s.tokenPrices)

  return useMemo(() => {
    if (!targetUserPositionAccount) return { pendingTotalVolume: toFraction(0), isHarvestable: false }

    let hasRewardTokenAmount = false
    const rewardsVolume: { token?: Token; volume?: Numberish }[] =
      targetUserPositionAccount?.rewardInfos.map((info) => {
        if (gt(info.penddingReward, 0)) {
          hasRewardTokenAmount = true
        }

        return {
          token: info.penddingReward?.token,
          volume: mul(info.penddingReward, tokenPrices[toPubString(info.penddingReward?.token.mint)])
        }
      }) ?? []

    let hasFeeTokenAmount = false
    if (
      targetUserPositionAccount &&
      ((targetUserPositionAccount.tokenFeeAmountA && gt(targetUserPositionAccount.tokenFeeAmountA, 0)) ||
        (targetUserPositionAccount.tokenFeeAmountB && gt(targetUserPositionAccount.tokenFeeAmountB, 0)))
    ) {
      hasFeeTokenAmount = true
    }
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
    const pendingTotalVolume = rewardsVolume
      .concat(feesVolume)
      .reduce(
        (acc, { volume }) => (volume ? add(acc ?? toFraction(0), volume) : acc),
        undefined as Fraction | undefined
      )

    const isHarvestable = gt(pendingTotalVolume, 0) || hasRewardTokenAmount || hasFeeTokenAmount ? true : false

    return { pendingTotalVolume: pendingTotalVolume, isHarvestable: isHarvestable }
  }, [tokenPrices, targetUserPositionAccount])
}
