import { TradeV2 } from 'test-r-sdk'

import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { gt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { loadTransaction } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'
import useWallet from '../wallet/useWallet'
import { useSwap } from './useSwap'
import { isMintEqual } from '@/functions/judgers/areEqual'

export default function txSwap() {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { checkWalletHasEnoughBalance, tokenAccountRawInfos } = useWallet.getState()
    const {
      coin1,
      coin2,
      coin1Amount,
      coin2Amount,
      calcResult,
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
    assert(calcResult, "can't find correct route")

    const upCoinTokenAmount = toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })
    const downCoinTokenAmount = toTokenAmount(downCoin, downCoinAmount, { alreadyDecimaled: true })

    assert(checkWalletHasEnoughBalance(upCoinTokenAmount), `not enough ${upCoin.symbol}`)

    assert(routeType, 'accidently routeType is undefined')
    const { transaction, signers, address } = await TradeV2.makeSwapTranscation({
      connection,
      swapInfo: calcResult[0],
      ownerInfo: {
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        associatedOnly: true
      }
    })

    const signedTransaction = await loadTransaction({ transaction: transaction, signers })
    transactionCollector.add(signedTransaction, {
      txHistoryInfo: {
        title: 'Swap',
        description: `Swap ${toString(upCoinAmount)} ${upCoin.symbol} to ${toString(minReceived || maxSpent)} ${
          downCoin.symbol
        }`
      }
    })
  })
}
