import { Utils1216 } from '@raydium-io/raydium-sdk'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'

import { TxHistoryInfo } from '../txHistory/useTxHistory'
import { loadTransaction } from '../txTools/createTransaction'
import { createTxHandler, TransactionQueue } from '../txTools/handleTx'

import useWallet from '../wallet/useWallet'
import { HydratedCompensationInfoItem } from './type'
import { useCompensationMoney } from './useCompensation'

export const txClaimAllCompensation = createTxHandler(
  ({ poolInfos }: { poolInfos?: HydratedCompensationInfoItem[] } = {}) =>
    async ({ transactionCollector, baseUtils: { connection, owner } }) => {
      const { tokenAccountRawInfos } = useWallet.getState()
      assert(poolInfos)

      const transactions = await Utils1216.makeClaimAllTransaction({
        connection,
        poolInfos: poolInfos.map((poolInfo) => poolInfo.rawInfo),
        ownerInfo: {
          wallet: owner,
          tokenAccounts: tokenAccountRawInfos,
          associatedOnly: true
        }
      })

      const signedTransactions = shakeUndifindedItem(
        await asyncMap(transactions, (merged) => {
          if (!merged) return
          const { transaction, signer: signers } = merged
          return loadTransaction({ transaction: transaction, signers })
        })
      )
      const queue = signedTransactions.map((tx) => [
        tx,
        {
          txHistoryInfo: { title: 'Claim' } as TxHistoryInfo
        }
      ]) as TransactionQueue

      transactionCollector.addQueue(queue, {
        onTxAllSuccess() {
          useCompensationMoney.getState().refresh()
        }
      })
    }
)
