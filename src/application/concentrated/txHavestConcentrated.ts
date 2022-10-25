import { AmmV3, ZERO } from '@raydium-io/raydium-sdk'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import { toString } from '@/functions/numberish/toString'

import useAppSettings from '../common/useAppSettings'
import { loadTransaction } from '../txTools/createTransaction'
import txHandler, { TransactionQueue } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import { HydratedConcentratedInfo, UserPositionAccount } from './type'
import useConcentrated from './useConcentrated'

export default function txHavestConcentrated({
  currentAmmPool = useConcentrated.getState().currentAmmPool,
  targetUserPositionAccount = useConcentrated.getState().targetUserPositionAccount
}: {
  currentAmmPool?: HydratedConcentratedInfo
  targetUserPositionAccount?: UserPositionAccount
} = {}) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { tokenAccountRawInfos } = useWallet.getState()
    const { coin1, coin2 } = useConcentrated.getState()
    const { slippageTolerance } = useAppSettings.getState()
    assert(currentAmmPool, 'not seleted amm pool')
    assert(targetUserPositionAccount, 'not set targetUserPositionAccount')
    const { transaction, signers, address } = await AmmV3.makeDecreaseLiquidityTransaction({
      connection: connection,
      liquidity: ZERO,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true,
        closePosition: false
      },
      slippage: Number(toString(slippageTolerance)),
      ownerPosition: targetUserPositionAccount.sdkParsed
    })
    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Havested Rewards',
        description: `Havested: ${currentAmmPool.base?.symbol ?? '--'} - ${currentAmmPool.quote?.symbol ?? '--'}`
      }
    })
  })
}

export function txHavestAllConcentrated() {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { originSdkParsedAmmPools } = useConcentrated.getState()
    const { tokenAccountRawInfos } = useWallet.getState()

    // eslint-disable-next-line no-console
    console.log('originSdkParsedAmmPools: ', originSdkParsedAmmPools)
    // eslint-disable-next-line no-console
    console.log('tokenAccountRawInfos: ', tokenAccountRawInfos)
    const { transactions, address } = await AmmV3.makeHarvestAllRewardTransaction({
      connection: connection,
      fetchPoolInfos: originSdkParsedAmmPools,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true
      },
      associatedOnly: true
    })
    // eslint-disable-next-line no-console
    console.log('SHOULD SHOW IS LINE IF CALL SDK SUCCESSFULLY')
    const signedTransactions = shakeUndifindedItem(
      await asyncMap(transactions, (merged) => {
        if (!merged) return
        const { transaction, signer: signers } = merged
        return loadTransaction({ transaction: transaction, signers })
      })
    )
    const queue = signedTransactions.map((tx, idx) => [
      tx,
      {
        txHistoryInfo: {
          title: 'Havested Rewards',
          description: `Havested: ${(idx + 1) / queue.length}`
        }
      }
    ]) as TransactionQueue
    transactionCollector.addQueue(queue)
  })
}
