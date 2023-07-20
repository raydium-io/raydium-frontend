import { getEpochInfo } from '@/application/clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '@/application/clmmMigration/getMultiMintInfos'
import { UserPositionAccount } from '@/application/concentrated/type'
import { getTransferFeeInfo } from '@/application/token/getTransferFeeInfos'
import useToken from '@/application/token/useToken'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import asyncMap from '@/functions/asyncMap'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import toPubString from '@/functions/format/toMintString'
import { gt } from '@/functions/numberish/compare'
import { add, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { Fraction, Price, TokenAmount } from '@raydium-io/raydium-sdk'
import { useMemo } from 'react'

export default function useConcentratedPendingYield(targetUserPositionAccount: UserPositionAccount | undefined) {
  const tokenPrices = useToken((s) => s.tokenPrices)

  return useMemo(() => {
    if (!targetUserPositionAccount) return { pendingTotalVolume: toFraction(0), isHarvestable: false }

    let hasRewardTokenAmount = false
    const rewardsAmountsWithFees: { amount: TokenAmount | undefined; price: Price | undefined }[] =
      targetUserPositionAccount?.rewardInfos.map((info) => {
        if (gt(info.penddingReward, 0)) {
          hasRewardTokenAmount = true
        }
        const price = tokenPrices[toPubString(info.penddingReward?.token.mint)]
        return { amount: info.penddingReward, price: price }
      }) ?? []

    let hasFeeTokenAmount = false
    if (
      targetUserPositionAccount &&
      ((targetUserPositionAccount.tokenFeeAmountA && gt(targetUserPositionAccount.tokenFeeAmountA, 0)) ||
        (targetUserPositionAccount.tokenFeeAmountB && gt(targetUserPositionAccount.tokenFeeAmountB, 0)))
    ) {
      hasFeeTokenAmount = true
    }

    const feesAmountsWithFees: { amount: TokenAmount | undefined; price: Price | undefined }[] =
      targetUserPositionAccount
        ? [
            {
              amount: targetUserPositionAccount?.tokenFeeAmountA,
              price: tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountA?.token.mint)]
            },
            {
              amount: targetUserPositionAccount.tokenFeeAmountB,
              price: tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountB?.token.mint)]
            }
          ]
        : []

    const pendingTotalWithFees = rewardsAmountsWithFees.concat(feesAmountsWithFees).reduce((acc, { amount, price }) => {
      if (!amount || !price) return acc
      return add(acc ?? toFraction(0), mul(amount, price))
    }, undefined as Fraction | undefined)

    // async
    const getPendingTotal = async () => {
      const mints = shakeUndifindedItem(
        rewardsAmountsWithFees.concat(feesAmountsWithFees).map((i) => i.amount?.token.mint)
      )
      const [epochInfo, mintInfos] = await Promise.all([getEpochInfo(), getMultiMintInfos({ mints })])
      const ams = await asyncMap(rewardsAmountsWithFees.concat(feesAmountsWithFees), async ({ amount, ...rest }) => {
        if (!amount) return
        const feeInfo = await getTransferFeeInfo({ amount, fetchedEpochInfo: epochInfo, fetchedMints: mintInfos })
        return { amount: feeInfo?.pure, ...rest }
      })
      return shakeUndifindedItem(ams).reduce((acc, { amount, price }) => {
        if (!amount || !price) return acc
        return add(acc ?? toFraction(0), mul(amount, price))
      }, undefined as Fraction | undefined)
    }

    const isHarvestable = gt(pendingTotalWithFees, 0) || hasRewardTokenAmount || hasFeeTokenAmount ? true : false

    return { pendingTotalVolume: pendingTotalWithFees, getPendingTotal: getPendingTotal, isHarvestable: isHarvestable }
  }, [tokenPrices, targetUserPositionAccount])
}
