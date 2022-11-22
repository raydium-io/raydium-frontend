import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'
import { MarketV2 } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { TxHistoryInfo } from '../txHistory/useTxHistory'
import { loadTransaction } from '../txTools/createTransaction'
import { createTxHandler, TransactionQueue } from '../txTools/handleTx'
import { useCreateMarket } from './useCreateMarket'

const txCreateMarket = createTxHandler(() => async ({ transactionCollector, baseUtils: { connection, owner } }) => {
  const { programId, baseToken, quoteToken, minimumOrderSize, tickSize } = useCreateMarket.getState()

  assert(baseToken, 'please select a base token')
  assert(quoteToken, 'please select a quote token')

  // throw 'not imply yet'

  const { transactions, address } = await MarketV2.makeCreateMarketTransaction({
    connection,
    dexProgramId: toPub(programId),
    baseInfo: {
      mint: isQuantumSOLVersionSOL(baseToken) ? PublicKey.default : baseToken.mint,
      decimals: baseToken.decimals
    },
    quoteInfo: {
      mint: isQuantumSOLVersionSOL(quoteToken) ? PublicKey.default : quoteToken.mint,
      decimals: quoteToken.decimals
    },
    lotSize: Number.parseFloat(toString(minimumOrderSize)),
    tickSize: Number.parseFloat(toString(tickSize)),
    wallet: owner
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
        title: 'Create Farm',
        description: `creating new farm: ${toPubString(address.id)}`
      } as TxHistoryInfo
    }
  ]) as TransactionQueue
  transactionCollector.addQueue(queue, {
    onTxAllSuccess() {
      useCreateMarket.setState({ newCreatedMarketId: address.id })
    }
  })
})

export default txCreateMarket
