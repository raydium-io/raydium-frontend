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
    perDay: string
  }[]
}

export default function txSetRewards({ currentAmmPool, updateRewards, newRewards }: Props) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { tokenAccountRawInfos } = useWallet.getState()

    assert(currentAmmPool, 'not seleted amm pool')

    const updatedRewardInfos = Array.from(updateRewards).map((r) => ({
      mint: new PublicKey(r[0]),
      openTime: Math.floor(r[1].openTime.valueOf() / 1000),
      endTime: Math.floor(r[1].endTime.valueOf() / 1000),
      perSecond: toBN(r[1].perSecond)
    }))

    const newRewardInfos = newRewards.map((r) => ({
      mint: r.token.mint,
      openTime: Math.floor(r.openTime.valueOf() / 1000),
      endTime: Math.floor(r.endTime.valueOf() / 1000),
      perSecond: toBN(div(mul(r.perDay || 0, 10 ** (r.token.decimals || 6)), 60 * 60 * 24))
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

    /* eslint-disable */
    console.log('====add more rewards======')
    updatedRewardInfos.forEach((r) => {
      console.log('**mint**', r.mint.toBase58())
      console.log('perSecond', r.perSecond.toString())
      console.log('openTime', r.openTime)
      console.log('endTime', r.endTime)
    })
    /* eslint-enable */

    if (updatedRewardInfos.length) {
      const { transaction: setRewardTx, signers: setRewardTxSigners } = await AmmV3.makeSetRewardsTransaction({
        ...commonParams,
        rewardInfos: updatedRewardInfos
      })

      transactionCollector.add(await loadTransaction({ transaction: setRewardTx, signers: setRewardTxSigners }), {
        txHistoryInfo: {
          title: 'Update rewards',
          description: `Update rewards in ${currentAmmPool.idString.slice(0, 6)}`
        }
      })
    }

    /* eslint-disable */
    console.log('====new rewards======')
    newRewardInfos.forEach((r) => {
      console.log('**mint**', r.mint.toBase58())
      console.log('perSecond', r.perSecond.toString())
      console.log('openTime', r.openTime)
      console.log('endTime', r.endTime)
    })
    /* eslint-enable */

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
        }
      })
    }
  })
}
