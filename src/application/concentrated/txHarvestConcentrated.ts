import assert from '@/functions/assert'
import { AmmV3, ZERO } from '@raydium-io/raydium-sdk'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import { openToken2022ClmmHavestConfirmPanel } from '../token/openToken2022ClmmHavestConfirmPanel'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import txHandler, { TransactionQueue } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'
import { HydratedConcentratedInfo, UserPositionAccount } from './type'
import useConcentrated from './useConcentrated'
import { isToken2022 } from '../token/isToken2022'

export default async function txHarvestConcentrated({
  currentAmmPool = useConcentrated.getState().currentAmmPool,
  targetUserPositionAccount = useConcentrated.getState().targetUserPositionAccount
}: {
  currentAmmPool?: HydratedConcentratedInfo
  targetUserPositionAccount?: UserPositionAccount
} = {}) {
  const { logError } = useNotification.getState()

  const needConfirm = [
    targetUserPositionAccount?.tokenA,
    targetUserPositionAccount?.tokenB,
    ...(targetUserPositionAccount?.rewardInfos.map((i) => i.token) ?? [])
  ].some((i) => isToken2022(i) && i)
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmHavestConfirmPanel({ ammPool: currentAmmPool })
    userHasConfirmed = await hasConfirmed
  } else {
    userHasConfirmed = true
  }

  if (userHasConfirmed) {
    return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
      const { tokenAccountRawInfos } = useWallet.getState()
      assert(currentAmmPool, 'not seleted amm pool')
      assert(targetUserPositionAccount, 'not set targetUserPositionAccount')
      const { innerTransactions } = await AmmV3.makeDecreaseLiquidityInstructionSimple({
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
        checkCreateATAOwner: true
      })
      transactionCollector.add(innerTransactions, {
        txHistoryInfo: {
          title: 'Harvested Rewards',
          description: `Harvested: ${currentAmmPool.base?.symbol ?? '--'} - ${currentAmmPool.quote?.symbol ?? '--'}`
        }
      })
    })
  } else {
    logError('User Cancel', 'User has canceled token 2022 confirm')
  }
}

export async function txHarvestAllConcentrated() {
  const { logError } = useNotification.getState()
  const { originSdkParsedAmmPools, sdkParsedAmmPools, hydratedAmmPools } = useConcentrated.getState()
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

  // assert whether need token 2022 check
  const needConfirm = hydratedAmmPools
    .flatMap((i) => [i.base, i.quote, ...i.rewardInfos.map((i) => i.rewardToken)])
    .some((i) => isToken2022(i))
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmHavestConfirmPanel({ ammPool: hydratedAmmPools })
    userHasConfirmed = await hasConfirmed
  } else {
    userHasConfirmed = true
  }

  if (!userHasConfirmed) {
    logError('User Cancel', 'User has canceled token 2022 confirm')
    return undefined
  }

  // call sdk to get the txs, and check if user has harvestable position
  const { innerTransactions } = await AmmV3.makeHarvestAllRewardInstructionSimple({
    connection: connection,
    fetchPoolInfos: originSdkParsedAmmPools,
    ownerInfo: {
      feePayer: owner,
      wallet: owner,
      tokenAccounts: tokenAccountRawInfos,
      useSOLBalance: true
    },
    associatedOnly: true,
    checkCreateATAOwner: true
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
