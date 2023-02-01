import assert from '@/functions/assert'
import { AmmV3 } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

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

    const tokenSymbol = currentAmmPool.rewardInfos.find((r) => r.tokenMint.equals(rewardMint))!.rewardToken!.symbol

    const { innerTransactions } = await AmmV3.makeCollectRewardInstructionSimple({
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
    transactionCollector.add(innerTransactions, {
      txHistoryInfo: {
        title: 'Harvested Reward',
        description: `Harvested: ${tokenSymbol} reward`
      }
    })
  })
}
