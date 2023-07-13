import assert from '@/functions/assert'
import { AmmV3, ZERO } from '@raydium-io/raydium-sdk'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import { openToken2022ClmmPositionConfirmPanel } from '../token/openToken2022ClmmPositionConfirmPanel'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import txHandler, { TransactionQueue } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'
import { HydratedConcentratedInfo, UserPositionAccount } from './type'
import useConcentrated from './useConcentrated'
import { isToken2022 } from '../token/isToken2022'
import { isMeaningfulNumber } from '@/functions/numberish/compare'

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
    const { hasConfirmed } = openToken2022ClmmPositionConfirmPanel({
      position: targetUserPositionAccount,
      caseName: 'harvest'
    })
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
    logError('Canceled by User', 'The operation is canceled by user')
  }
}

export async function txHarvestAllConcentrated() {
  const { logError } = useNotification.getState()
  const { originSdkParsedAmmPools, hydratedAmmPools } = useConcentrated.getState()
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

  function needConfirmPosition(position: UserPositionAccount | undefined) {
    return (
      (isToken2022(position?.ammPool.base) ||
        isToken2022(position?.ammPool.quote) ||
        isToken2022(position?.ammPool.rewardInfos.map((i) => i.rewardToken))) &&
      (isMeaningfulNumber(position?.tokenFeeAmountA) ||
        isMeaningfulNumber(position?.tokenFeeAmountB) ||
        position?.rewardInfos.some(({ penddingReward }) => isMeaningfulNumber(penddingReward)))
    )
  }
  // assert whether need token 2022 check
  const needConfirmPositions = hydratedAmmPools
    .flatMap((i) => i.userPositionAccount)
    .filter((p) => needConfirmPosition(p))
  let userHasConfirmed: boolean
  if (needConfirmPositions.length > 0) {
    const { hasConfirmed } = openToken2022ClmmPositionConfirmPanel({
      position: needConfirmPositions,
      caseName: 'harvest'
    })
    userHasConfirmed = await hasConfirmed
  } else {
    userHasConfirmed = true
  }

  if (!userHasConfirmed) {
    logError('Canceled by User', 'The operation is canceled by user')
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
