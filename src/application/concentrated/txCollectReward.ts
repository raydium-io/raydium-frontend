import assert from '@/functions/assert'
import { Clmm, TokenAmount } from '@raydium-io/raydium-sdk'

import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import txHandler, { lookupTableCache } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import useNotification from '../notification/useNotification'
import { isToken2022 } from '../token/isToken2022'
import { openToken2022ClmmAmountConfirmPanel } from '../token/openToken2022ClmmPositionConfirmPanel'
import { HydratedConcentratedInfo, HydratedConcentratedRewardInfo } from './type'

export default async function txCollectReward({
  claimableAmount,
  currentAmmPool,
  rewardInfo
}: {
  claimableAmount: TokenAmount
  rewardInfo: HydratedConcentratedRewardInfo
  currentAmmPool: HydratedConcentratedInfo
}) {
  // check token 2022
  const needConfirm = [rewardInfo.tokenMint].some((i) => isToken2022(i) && i)
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmAmountConfirmPanel({ amount: claimableAmount })
    // const { hasConfirmed } = openToken2022ClmmHavestConfirmPanel({ ammPool: currentAmmPool, onlyMints: [rewardInfo] })
    userHasConfirmed = await hasConfirmed
  } else {
    userHasConfirmed = true
  }
  if (!userHasConfirmed) {
    useNotification.getState().logError('Canceled by User', 'The operation is canceled by user')
    return
  }

  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { tokenAccountRawInfos, txVersion } = useWallet.getState()
    assert(currentAmmPool, 'not seleted amm pool')

    const tokenSymbol = currentAmmPool.rewardInfos.find((r) => r.tokenMint.equals(rewardInfo.tokenMint))!.rewardToken!
      .symbol

    const { innerTransactions } = await Clmm.makeCollectRewardInstructionSimple({
      connection: connection,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true
      },
      rewardMint: rewardInfo.tokenMint,
      associatedOnly: false,
      computeBudgetConfig: await getComputeBudgetConfig(),
      checkCreateATAOwner: true,
      makeTxVersion: txVersion,
      lookupTableCache
    })
    transactionCollector.add(innerTransactions, {
      txHistoryInfo: {
        title: 'Harvested Reward',
        description: `Harvested: ${tokenSymbol} reward`
      }
    })
  })
}
