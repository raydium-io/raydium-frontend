import assert from '@/functions/assert'
import { Clmm, ZERO } from '@raydium-io/raydium-sdk'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import txHandler, { TransactionQueue, lookupTableCache } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'
import { HydratedConcentratedInfo, UserPositionAccount } from './type'
import useConcentrated from './useConcentrated'
export default async function txHarvestConcentrated({
  currentAmmPool = useConcentrated.getState().currentAmmPool,
  targetUserPositionAccount = useConcentrated.getState().targetUserPositionAccount
}: {
  currentAmmPool?: HydratedConcentratedInfo
  targetUserPositionAccount?: UserPositionAccount
} = {}) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { tokenAccountRawInfos, txVersion } = useWallet.getState()
    assert(currentAmmPool, 'not seleted amm pool')
    assert(targetUserPositionAccount, 'not set targetUserPositionAccount')
    const { innerTransactions } = await Clmm.makeDecreaseLiquidityInstructionSimple({
      connection: connection,
      liquidity: ZERO,
      amountMinA: ZERO,
      amountMinB: ZERO,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true,
        closePosition: false
      },
      // slippage: Number(toString(slippageTolerance)),
      ownerPosition: targetUserPositionAccount.sdkParsed,
      computeBudgetConfig: await getComputeBudgetConfig(),
      checkCreateATAOwner: true,
      makeTxVersion: txVersion,
      lookupTableCache
    })
    transactionCollector.add(innerTransactions, {
      txHistoryInfo: {
        title: 'Harvested Rewards',
        description: `Harvested: ${currentAmmPool.base?.symbol ?? '--'} - ${currentAmmPool.quote?.symbol ?? '--'}`
      }
    })
  })
}

export async function txHarvestAllConcentrated() {
  const { logError } = useNotification.getState()
  const { originSdkParsedAmmPools, hydratedAmmPools } = useConcentrated.getState()
  const { tokenAccountRawInfos, txVersion } = useWallet.getState()
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
  const { innerTransactions } = await Clmm.makeHarvestAllRewardInstructionSimple({
    connection: connection,
    fetchPoolInfos: originSdkParsedAmmPools,
    ownerInfo: {
      feePayer: owner,
      wallet: owner,
      tokenAccounts: tokenAccountRawInfos,
      useSOLBalance: true
    },
    associatedOnly: true,
    checkCreateATAOwner: true,
    makeTxVersion: txVersion,
    lookupTableCache
  })

  // no harvestable position, show notification
  if (Array.isArray(innerTransactions) && innerTransactions.length === 0) {
    logInfo('No harvestable position')
    return {
      allSuccess: true,
      txids: []
    }
  }

  // if there are some harvest rewards, then the process ongoing to txHandler
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const queue = innerTransactions.map((tx, idx) => [
      tx,
      {
        txHistoryInfo: {
          title: 'Harvested All Rewards',
          description: `Harvested all CLMM rewards`
        }
      }
    ]) as TransactionQueue

    transactionCollector.add(queue)
  })
}
