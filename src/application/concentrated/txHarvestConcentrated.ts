import { ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { AmmV3, ZERO } from '@raydium-io/raydium-sdk'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import { toString } from '@/functions/numberish/toString'

import useAppSettings from '../common/useAppSettings'
import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import { loadTransaction } from '../txTools/createTransaction'
import txHandler, { TransactionQueue } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import { HydratedConcentratedInfo, UserPositionAccount } from './type'
import useConcentrated from './useConcentrated'

export default function txHarvestConcentrated({
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
        title: 'Harvested Rewards',
        description: `Harvested: ${currentAmmPool.base?.symbol ?? '--'} - ${currentAmmPool.quote?.symbol ?? '--'}`
      }
    })
  })
}

export async function txHarvestAllConcentrated() {
  const { originSdkParsedAmmPools } = useConcentrated.getState()
  const { tokenAccountRawInfos } = useWallet.getState()
  const { logInfo } = useNotification.getState()
  const connection = useConnection.getState().connection
  const { owner } = useWallet.getState()

  // the rpc/wallet is not connected, do nothing
  if (!connection || !owner) {
    return {
      allSuccess: true,
      txids: []
    }
  }

  // call sdk to get the txs, and check if user has harvestable position
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

  // no harvestable position, show notification
  if (Array.isArray(transactions) && transactions.length === 0) {
    logInfo('No harvestable position')
    return {
      allSuccess: true,
      txids: []
    }
  }

  // if there are some harvest rewards, then the process ongoing to txHandler
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const signedTransactions = shakeUndifindedItem(
      await asyncMap(transactions, (merged) => {
        if (!merged) return
        const { transaction, signer: signers } = merged
        return loadTransaction({ transaction: transaction, signers })
      })
    )

    const queue = transactions.map((tx, idx) => [
      tx,
      {
        txHistoryInfo: {
          title: 'Harvested All Rewards',
          description: `Harvested all CLMM rewards`
        }
      }
    ]) as TransactionQueue

    transactionCollector.addQueue(queue)
  })
}
