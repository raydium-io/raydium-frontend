import { UserPositionAccount } from '@/application/concentrated/type'
import { getTransferFeeInfo } from '@/application/token/getTransferFeeInfos'
import useToken from '@/application/token/useToken'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { gt } from '@/functions/numberish/compare'
import { add, minus, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { Fraction, TokenAmount } from '@raydium-io/raydium-sdk'
import { useMemo } from 'react'

export default function useConcentratedPendingYield(
  targetUserPositionAccount: UserPositionAccount | undefined,
  options?: {
    shouldCalcFee?: boolean
  }
) {
  const tokenPrices = useToken((s) => s.tokenPrices)

  return useMemo(() => {
    if (!targetUserPositionAccount) return { pendingTotalVolume: toFraction(0), isHarvestable: false }

    let hasRewardTokenAmount = false
    const rewardsAmountsWithFees: (TokenAmount | undefined)[] =
      targetUserPositionAccount?.rewardInfos.map((info) => {
        if (gt(info.penddingReward, 0)) {
          hasRewardTokenAmount = true
        }
        return toTokenAmount(
          info.penddingReward?.token,
          mul(info.penddingReward, tokenPrices[toPubString(info.penddingReward?.token.mint)])
        )
      }) ?? []

    let hasFeeTokenAmount = false
    if (
      targetUserPositionAccount &&
      ((targetUserPositionAccount.tokenFeeAmountA && gt(targetUserPositionAccount.tokenFeeAmountA, 0)) ||
        (targetUserPositionAccount.tokenFeeAmountB && gt(targetUserPositionAccount.tokenFeeAmountB, 0)))
    ) {
      hasFeeTokenAmount = true
    }

    const feesAmountsWithFees: (TokenAmount | undefined)[] = targetUserPositionAccount
      ? [
          toTokenAmount(
            targetUserPositionAccount?.tokenFeeAmountA?.token,
            mul(
              targetUserPositionAccount?.tokenFeeAmountA,
              tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountA?.token.mint)]
            )
          ),
          toTokenAmount(
            targetUserPositionAccount?.tokenFeeAmountB?.token,
            mul(
              targetUserPositionAccount?.tokenFeeAmountB,
              tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountB?.token.mint)]
            )
          )
        ]
      : []

    const pendingTotalWithFees = rewardsAmountsWithFees
      .concat(feesAmountsWithFees)
      .reduce((acc, volume) => (volume ? add(acc ?? toFraction(0), volume) : acc), undefined as Fraction | undefined)

    // const pendingTotal = Promise.resolve(pendingTotalWithFees) // dev
    const pendingTotal = minusFees(shakeUndifindedItem(rewardsAmountsWithFees.concat(feesAmountsWithFees))).then(
      (ps) =>
        ps?.reduce(
          (acc, volume) => (volume ? add(acc ?? toFraction(0), volume) : acc),
          undefined as Fraction | undefined
        ) ?? 0
    )

    const isHarvestable = gt(pendingTotalWithFees, 0) || hasRewardTokenAmount || hasFeeTokenAmount ? true : false

    return { pendingTotalVolume: pendingTotalWithFees, pendingTotal: pendingTotal, isHarvestable: isHarvestable }
  }, [tokenPrices, targetUserPositionAccount])
}

async function minusFees(tokenAmounts: TokenAmount[]): Promise<TokenAmount[] | undefined> {
  const infos = await getTransferFeeInfo({ amount: tokenAmounts })
  if (!infos) return undefined
  return tokenAmounts.map((amount, idx) => toTokenAmount(amount.token, minus(amount.raw, infos[idx].fee ?? 0)))
}
