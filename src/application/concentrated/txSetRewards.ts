import { AmmV3, Fraction } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { SplToken } from '@/application/token/type'
import assert from '@/functions/assert'
import { div, mul } from '@/functions/numberish/operations'

import useConnection from '../connection/useConnection'
import { fractionToDecimal } from '../txTools/decimal2Fraction'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import txHandler from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import { HydratedConcentratedInfo } from './type'

interface Props {
  currentAmmPool: HydratedConcentratedInfo
  updateRewards: Map<
    string,
    {
      openTime: number
      endTime: number
      perSecond: Fraction
    }
  >
  newRewards: {
    token: SplToken
    openTime: Date
    endTime: Date
    perWeek: string
  }[]
  onTxSuccess?: () => void
}

export default function txSetRewards({ currentAmmPool, updateRewards, newRewards, onTxSuccess }: Props) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { tokenAccountRawInfos } = useWallet.getState()

    assert(currentAmmPool, 'not seleted amm pool')

    const updatedRewardInfos = Array.from(updateRewards).map((r) => ({
      mint: new PublicKey(r[0]),
      openTime: Math.floor(r[1].openTime.valueOf() / 1000),
      endTime: Math.floor(r[1].endTime.valueOf() / 1000),
      perSecond: fractionToDecimal(r[1].perSecond, 20)
    }))

    const newRewardInfos = newRewards.map((r) => ({
      mint: r.token.mint,
      openTime: Math.floor(r.openTime.valueOf() / 1000),
      endTime: Math.floor(r.endTime.valueOf() / 1000),
      perSecond: fractionToDecimal(div(mul(r.perWeek || 0, 10 ** (r.token.decimals)), 7 * 60 * 60 * 24), 20)
    }))

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
