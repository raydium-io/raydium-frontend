import { SplToken } from '@/application/token/type'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import { toPub } from '@/functions/format/toMintString'
import { div, mul } from '@/functions/numberish/operations'
import { AmmV3, Fraction } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
import { getTokenProgramId, isToken2022 } from '../token/isToken2022'
import { fractionToDecimal } from '../txTools/decimal2Fraction'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import txHandler from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'
import { HydratedConcentratedInfo } from './type'
import { Numberish } from '@/types/constants'
import useNotification from '../notification/useNotification'
import { openToken2022ClmmAmountConfirmPanel } from '../token/openToken2022ClmmPositionConfirmPanel'
import useToken from '../token/useToken'
import { toTokenAmount } from '@/functions/format/toTokenAmount'

interface Props {
  currentAmmPool: HydratedConcentratedInfo
  updateRewards: Map<
    string,
    {
      openTime: number
      endTime: number
      perSecond: Fraction
      amount?: Numberish
    }
  >
  newRewards: {
    token: SplToken
    openTime: Date
    endTime: Date
    perWeek: Numberish
    amount?: Numberish
  }[]
  onTxSuccess?: () => void
}

export default async function txSetRewards({ currentAmmPool, updateRewards, newRewards, onTxSuccess }: Props) {
  const { getToken } = useToken.getState()
  const updatedRewardInfos = await asyncMap(Array.from(updateRewards), async ([mint, reward]) => ({
    programId: getTokenProgramId(mint),
    mint: toPub(mint),
    openTime: Math.floor(reward.openTime.valueOf() / 1000),
    endTime: Math.floor(reward.endTime.valueOf() / 1000),
    perSecond: fractionToDecimal(reward.perSecond, 20),
    amount: toTokenAmount(getToken(mint), mul(reward.perSecond, (reward.endTime - reward.openTime) / 1000)),
    rawAmount: toTokenAmount(getToken(mint), reward.amount, { alreadyDecimaled: true })
  }))

  const newRewardInfos = await asyncMap(newRewards, async (reward) => ({
    programId: getTokenProgramId(reward.token.mint),
    mint: reward.token.mint,
    openTime: Math.floor(reward.openTime.valueOf() / 1000),
    endTime: Math.floor(reward.endTime.valueOf() / 1000),
    perSecond: fractionToDecimal(div(mul(reward.perWeek || 0, 10 ** reward.token.decimals), 7 * 60 * 60 * 24), 20),
    amount: toTokenAmount(
      reward.token,
      mul(
        div(mul(reward.perWeek || 0, 10 ** reward.token.decimals), 7 * 60 * 60 * 24),
        (reward.endTime.getTime() - reward.openTime.getTime()) / 1000
      )
    ),
    rawAmount: toTokenAmount(reward.token, reward.amount, { alreadyDecimaled: true })
  }))
  assert(currentAmmPool, 'not seleted amm pool')

  const newAmount = [...updatedRewardInfos.map((i) => i.rawAmount), ...newRewardInfos.map((i) => i.rawAmount)]
  // check token 2022
  const needConfirm = [...updatedRewardInfos.map((i) => i.mint), ...newRewardInfos.map((i) => i.mint)].some(
    (i) => isToken2022(i) && i
  )
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmAmountConfirmPanel({ amount: newAmount })
    userHasConfirmed = await hasConfirmed
  } else {
    userHasConfirmed = true
  }
  if (!userHasConfirmed) {
    useNotification.getState().logError('Canceled by User', 'The operation is canceled by user')
    return
  }

  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { tokenAccountRawInfos } = useWallet.getState()

    const commonParams = {
      connection: connection,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true
      }
    }

    if (updatedRewardInfos.length) {
      const { chainTimeOffset } = useConnection.getState()
      const chainTime = ((chainTimeOffset ?? 0) + Date.now()) / 1000
      const { innerTransactions } = await AmmV3.makeSetRewardsInstructionSimple({
        ...commonParams,
        chainTime,
        rewardInfos: updatedRewardInfos,
        computeBudgetConfig: await getComputeBudgetConfig(),
        checkCreateATAOwner: true
      })

      transactionCollector.add(innerTransactions, {
        txHistoryInfo: {
          title: 'Update rewards',
          description: `Update rewards in ${currentAmmPool.idString.slice(0, 6)}`
        },
        onTxSuccess: !newRewardInfos.length ? onTxSuccess : undefined
      })
    }

    if (newRewardInfos.length) {
      const { innerTransactions } = await AmmV3.makeInitRewardsInstructionSimple({
        ...commonParams,
        rewardInfos: newRewardInfos,
        computeBudgetConfig: await getComputeBudgetConfig(),
        checkCreateATAOwner: true
      })
      transactionCollector.add(innerTransactions, {
        txHistoryInfo: {
          title: 'Added new rewards',
          description: `Added ${newRewards.map((r) => r.token.symbol).join(',')} to ${currentAmmPool.idString.slice(
            0,
            6
          )}`
        },
        onTxSuccess
      })
    }
  })
}
