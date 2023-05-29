import { Utils1216 } from '@raydium-io/raydium-sdk'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'

import { TxHistoryInfo } from '../txHistory/useTxHistory'
import { createTxHandler, TransactionQueue } from '../txTools/handleTx'

import useWallet from '../wallet/useWallet'
import { HydratedCompensationInfoItem } from './type'
import { useCompensationMoney } from './useCompensation'

export const txClaimCompensation = createTxHandler(
  ({ poolInfo }: { poolInfo?: HydratedCompensationInfoItem } = {}) =>
    async ({ transactionCollector, baseUtils: { connection, owner } }) => {
      const { tokenAccountRawInfos } = useWallet.getState()
      assert(poolInfo)
      const claim = await Utils1216.makeClaimInstructionSimple({
        connection,
        poolInfo: poolInfo.rawInfo,
        ownerInfo: {
          wallet: owner,
          tokenAccounts: tokenAccountRawInfos,
          associatedOnly: true,
          checkCreateATAOwner: true
        }
      })
      const queue = claim.innerTransactions.map((tx) => [
        tx,
        {
          txHistoryInfo: { title: 'Claim' } as TxHistoryInfo
        }
      ]) as TransactionQueue

      transactionCollector.add(queue, {
        onTxAllSuccess() {
          useCompensationMoney.getState().refresh()
        }
      })
    }
)
