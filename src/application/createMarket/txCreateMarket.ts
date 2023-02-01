import { MarketV2 } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'

import { TxHistoryInfo } from '../txHistory/useTxHistory'
import { createTxHandler, TransactionQueue } from '../txTools/handleTx'

import { useCreateMarket } from './useCreateMarket'

const txCreateMarket = createTxHandler(() => async ({ transactionCollector, baseUtils: { connection, owner } }) => {
  const { programId, baseToken, quoteToken, minimumOrderSize, tickSize } = useCreateMarket.getState()

  assert(baseToken, 'please select a base token')
  assert(quoteToken, 'please select a quote token')

  // throw 'not imply yet'

  const { innerTransactions, address } = await MarketV2.makeCreateMarketInstructionSimple({
    connection,
    dexProgramId: toPub(programId),
    baseInfo: {
      mint: baseToken.mint,
      decimals: baseToken.decimals
    },
    quoteInfo: {
      mint: quoteToken.mint,
      decimals: quoteToken.decimals
    },
    lotSize: Number.parseFloat(toString(minimumOrderSize)),
    tickSize: Number.parseFloat(toString(tickSize)),
    wallet: owner
  })

  const queue = innerTransactions.map((tx) => [
    tx,
    {
      txHistoryInfo: {
        title: 'Create Market',
        description: `created new Market: ${toPubString(address['marketId'] /* SDK force, no type export */).slice(
          0,
          6
        )}...`
      } as TxHistoryInfo
    }
  ]) as TransactionQueue
  transactionCollector.add(queue, {
    onTxAllSuccess() {
      useCreateMarket.setState({ newCreatedMarketId: address.id })
    }
  })
})

export default txCreateMarket
