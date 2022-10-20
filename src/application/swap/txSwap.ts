import { TradeV2 } from 'test-r-sdk'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'

import { loadTransaction } from '../txTools/createTransaction'
import txHandler, { TransactionQueue } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import { useSwap } from './useSwap'

export default function txSwap() {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { checkWalletHasEnoughBalance, tokenAccountRawInfos } = useWallet.getState()
    const {
      coin1,
      coin2,
      coin1Amount,
      coin2Amount,
      selectedCalcResult,

      focusSide,
      routeType,
      directionReversed,
      minReceived,
      maxSpent
    } = useSwap.getState()

    const upCoin = directionReversed ? coin2 : coin1
    // although info is included in routes, still need upCoinAmount to pop friendly feedback
    const upCoinAmount = (directionReversed ? coin2Amount : coin1Amount) || '0'

    const downCoin = directionReversed ? coin1 : coin2
    // although info is included in routes, still need downCoinAmount to pop friendly feedback
    const downCoinAmount = (directionReversed ? coin1Amount : coin2Amount) || '0'

    assert(upCoinAmount && gt(upCoinAmount, 0), 'should input upCoin amount larger than 0')
    assert(downCoinAmount && gt(downCoinAmount, 0), 'should input downCoin amount larger than 0')
    assert(upCoin, 'select a coin in upper box')
    assert(downCoin, 'select a coin in lower box')
    assert(!isMintEqual(upCoin.mint, downCoin.mint), 'should not select same mint ')
    assert(selectedCalcResult, "can't find correct route")

    const upCoinTokenAmount = toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })
    const downCoinTokenAmount = toTokenAmount(downCoin, downCoinAmount, { alreadyDecimaled: true })

    assert(checkWalletHasEnoughBalance(upCoinTokenAmount), `not enough ${upCoin.symbol}`)

    assert(routeType, 'accidently routeType is undefined')

    const { transactions, address } = await TradeV2.makeSwapTranscation({
      connection,
      swapInfo: selectedCalcResult,
      ownerInfo: {
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        associatedOnly: true
      },
      checkTransaction: true
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
        txHistoryInfo: {
          title: 'Swap',
          description: `Swap ${toString(upCoinAmount)} ${upCoin.symbol} to ${toString(minReceived || maxSpent)} ${
            downCoin.symbol
          }`
        }
      }
    ]) as TransactionQueue
    transactionCollector.addQueue(queue, { sendMode: 'queue(all-settle)' })
  })
}
