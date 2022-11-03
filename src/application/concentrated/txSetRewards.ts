import { AmmV3, Fraction } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import assert from '@/functions/assert'
import { loadTransaction } from '../txTools/createTransaction'
import txHandler from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'
import { SplToken } from '@/application/token/type'
import { HydratedConcentratedInfo } from './type'
import { mul, div } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import Decimal from 'decimal.js'
import { fractionToDecimal } from '../txTools/decimal2Fraction'

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
      perSecond: fractionToDecimal(div(mul(r.perWeek || 0, 10 ** (r.token.decimals || 6)), 7 * 60 * 60 * 24), 20)
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
      const { transaction: setRewardTx, signers: setRewardTxSigners } = await AmmV3.makeSetRewardsTransaction({
        ...commonParams,
        rewardInfos: updatedRewardInfos
      })

      transactionCollector.add(await loadTransaction({ transaction: setRewardTx, signers: setRewardTxSigners }), {
        txHistoryInfo: {
          title: 'Update rewards',
          description: `Update rewards in ${currentAmmPool.idString.slice(0, 6)}`
        },
        onTxSuccess: !newRewardInfos.length ? onTxSuccess : undefined
      })
    }

    if (newRewardInfos.length) {
      const { transaction: addRewardTx, signers: addRewardSigners } = await AmmV3.makeInitRewardsTransaction({
        ...commonParams,
        rewardInfos: newRewardInfos
      })
      transactionCollector.add(await loadTransaction({ transaction: addRewardTx, signers: addRewardSigners }), {
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
