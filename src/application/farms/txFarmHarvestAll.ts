import { Farm } from '@raydium-io/raydium-sdk'

import { createTxHandler, TransactionQueue } from '@/application/txTools/handleTx'
import {
  addWalletAccountChangeListener,
  removeWalletAccountChangeListener
} from '@/application/wallet/useWalletAccountChangeListeners'
import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import useWallet from '../wallet/useWallet'
import { HydratedFarmInfo } from './type'
import useFarms from './useFarms'

const txFarmHarvestAll = createTxHandler(
  (options?: { infos?: HydratedFarmInfo[] }) =>
    async ({ transactionCollector, baseUtils: { connection, owner } }) => {
      const infos = options?.infos
      assert(infos, 'should have harvest target')
      const { tokenAccountRawInfos } = useWallet.getState()

      const { innerTransactions } = await Farm.makeHarvestAllRewardInstructionSimple({
        connection: connection,
        fetchPoolInfos: Object.fromEntries(infos.map((i) => [toPubString(i.id), i.fetchedMultiInfo])),
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

      const queue = innerTransactions.map((tx, idx) => [
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

      transactionCollector.add(queue)
    }
)

export default txFarmHarvestAll
