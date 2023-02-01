import { InnerTransaction, InstructionType, TradeV2 } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'

import { createTxHandler, TransactionQueue } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import { TxHistoryInfo } from '../txHistory/useTxHistory'
import { useSwap } from './useSwap'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'

const txSwap = createTxHandler(() => async ({ transactionCollector, baseUtils: { connection, owner } }) => {
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

  const { innerTransactions } = await TradeV2.makeSwapInstructionSimple({
    connection,
    swapInfo: selectedCalcResult,
    ownerInfo: {
      wallet: owner,
      tokenAccounts: tokenAccountRawInfos,
      associatedOnly: true
    },
    checkTransaction: true,
    computeBudgetConfig: await getComputeBudgetConfig()
  })

  const queue = innerTransactions.map((tx, idx, allTxs) => [
    tx,
    {
      txHistoryInfo: {
        title: 'Swap',
        description: `Swap ${toString(upCoinAmount)} ${upCoin.symbol} to ${toString(minReceived || maxSpent)} ${
          downCoin.symbol
        }`,
        subtransactionDescription: translationSwapTxDescription(tx, idx, allTxs)
      } as TxHistoryInfo
    }
  ]) as TransactionQueue
  transactionCollector.add(queue, { sendMode: 'queue(all-settle)' })
})

export default txSwap

function translationSwapTxDescription(tx: InnerTransaction, idx: number, allTxs: InnerTransaction[]) {
  const swapFirstIdx = allTxs.findIndex((tx) => isSwapTransaction(tx))
  const swapLastIdx = allTxs.length - 1 - [...allTxs].reverse().findIndex((tx) => isSwapTransaction(tx))
  return idx < swapFirstIdx ? 'Cleanup' : idx > swapLastIdx ? 'Setup' : 'Swap'
}

function isSwapTransaction(tx: InnerTransaction): boolean {
  return (
    tx.instructionTypes.includes(InstructionType.clmmSwapBaseIn) ||
    tx.instructionTypes.includes(InstructionType.clmmSwapBaseOut) ||
    tx.instructionTypes.includes(InstructionType.ammV4Swap) ||
    tx.instructionTypes.includes(InstructionType.ammV4SwapBaseIn) ||
    tx.instructionTypes.includes(InstructionType.ammV4SwapBaseOut) ||
    tx.instructionTypes.includes(InstructionType.ammV5SwapBaseIn) ||
    tx.instructionTypes.includes(InstructionType.ammV5SwapBaseOut) ||
    tx.instructionTypes.includes(InstructionType.routeSwap1) ||
    tx.instructionTypes.includes(InstructionType.routeSwap2)
  )
}
