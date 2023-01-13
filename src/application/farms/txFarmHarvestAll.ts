import { Farm } from '@raydium-io/raydium-sdk'

import { loadTransaction } from '@/application/txTools/createTransaction'
import txHandler, { createTxHandler, TransactionQueue } from '@/application/txTools/handleTx'
import {
  addWalletAccountChangeListener,
  removeWalletAccountChangeListener
} from '@/application/wallet/useWalletAccountChangeListeners'
import asyncMap from '@/functions/asyncMap'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import useWallet from '../wallet/useWallet'
import { HydratedFarmInfo } from './type'
import useFarms from './useFarms'
import assert from '@/functions/assert'

const txFarmHarvestAll = createTxHandler(
  (options?: { infos?: HydratedFarmInfo[] }) =>
    async ({ transactionCollector, baseUtils: { connection, owner } }) => {
      const infos = options?.infos
      assert(infos, 'should have harvest target')
      const { tokenAccountRawInfos } = useWallet.getState()

      const { transactions } = await Farm.makeHarvestAllRewardTransaction({
        connection: connection,
        fetchPoolInfos: Object.fromEntries(infos.map((i) => [toPubString(i.id), i.sdkInfo])),
        ownerInfo: {
          feePayer: owner,
          wallet: owner,
          tokenAccounts: tokenAccountRawInfos,
          useSOLBalance: true
        },
        associatedOnly: false
      })
      const listenerId = addWalletAccountChangeListener(
        () => {
          useFarms.getState().refreshFarmInfos()
        },
        { once: true }
      )
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
          onTxError: () => removeWalletAccountChangeListener(listenerId),
          onTxSentError: () => removeWalletAccountChangeListener(listenerId),
          onTxSuccess: () => {
            setTimeout(() => {
              useFarms.getState().refreshFarmInfos()
            }, 300) // sometimes pending rewards is not very reliable, so invoke it manually
          }, // wallet Account Change sometimes not stable
          txHistoryInfo: {
            title: `Harvested All Farms`,
            description: `Harvested all farms`
          }
        }
      ]) as TransactionQueue

      transactionCollector.addQueue(queue)
    }
)

export default txFarmHarvestAll
