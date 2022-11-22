import assert from '@/functions/assert'

import { createTxHandler } from '../txTools/handleTx'

import { useCreateMarket } from './useCreateMarket'

const txCreateMarket = createTxHandler(() => async ({ transactionCollector, baseUtils: { connection, owner } }) => {
  const { programId, baseToken, quoteToken, minimumOrderSize, tickSize } = useCreateMarket.getState()

  assert(baseToken, 'please select a base token')
  assert(quoteToken, 'please select a quote token')

  throw 'not imply yet'
  // const { transactions, address } = await TradeV2.makeSwapTranscation({
  //   connection,
  //   swapInfo: selectedCalcResult,
  //   ownerInfo: {
  //     wallet: owner,
  //     tokenAccounts: tokenAccountRawInfos,
  //     associatedOnly: true
  //   },
  //   checkTransaction: true
  // })

  // const signedTransactions = shakeUndifindedItem(
  //   await asyncMap(transactions, (merged) => {
  //     if (!merged) return
  //     const { transaction, signer: signers } = merged
  //     return loadTransaction({ transaction: transaction, signers })
  //   })
  // )
  // const queue = signedTransactions.map((tx) => [
  //   tx,
  //   {
  //     txHistoryInfo: {
  //       title: 'Swap',
  //       description: `Swap ${toString(upCoinAmount)} ${upCoin.symbol} to ${toString(minReceived || maxSpent)} ${
  //         downCoin.symbol
  //       }`,
  //       subtransactionDescription: translationSwapTx(tx)
  //     } as TxHistoryInfo
  //   }
  // ]) as TransactionQueue
  // transactionCollector.addQueue(queue, { sendMode: 'queue(all-settle)' })
})

export default txCreateMarket
