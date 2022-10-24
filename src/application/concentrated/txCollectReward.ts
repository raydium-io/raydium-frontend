import { AmmV3, ZERO } from 'test-r-sdk'
import { PublicKey } from '@solana/web3.js'
import assert from '@/functions/assert'

import { loadTransaction } from '../txTools/createTransaction'
import txHandler from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import { HydratedConcentratedInfo } from './type'

export default function txCollectReward({
  currentAmmPool,
  rewardMint
}: {
  rewardMint: PublicKey
  currentAmmPool?: HydratedConcentratedInfo
}) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { tokenAccountRawInfos } = useWallet.getState()
    assert(currentAmmPool, 'not seleted amm pool')

    const token = currentAmmPool.rewardInfos.find((r) => r.tokenMint.equals(rewardMint))!.rewardToken!.symbol

    const { transaction, signers, address } = await AmmV3.makeCollectRewardTransaction({
      connection: connection,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true
      },
      rewardMint,
      associatedOnly: false
    })
    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Harvested Reward',
        description: `Harvested: ${token} reward`
      }
    })
  })
}
