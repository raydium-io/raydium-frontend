import asyncMap from '@/functions/asyncMap'
import { groupItems } from '@/functions/groupItems'
import { Connection, Message, Transaction } from '@solana/web3.js'
import { getRecentBlockhash } from './attachRecentBlockhash'
import { SendTransactionPayload, getSerializedTx } from './handleMultiTx'

type Txid = string

const tempBatchedTransactionsQueue: {
  tx: Transaction
  txidPromise: Promise<string>
  resolveFn: (value: string) => void
}[] = []

export async function sendTransactionCore(
  transaction: Transaction,
  payload: SendTransactionPayload,
  batchOptions?: {
    totalLength: number
  }
): Promise<Txid> {
  const blockhashObject = await getRecentBlockhash(payload.connection)
  if (batchOptions && canBatchTransactions(blockhashObject, payload.connection, transaction)) {
    let resolveFn
    const newPromise = new Promise<string>((resolve) => {
      resolveFn = resolve
    })
    tempBatchedTransactionsQueue.push({ tx: transaction, txidPromise: newPromise, resolveFn })
    // once all tx load, start batch sending
    if (tempBatchedTransactionsQueue.length === batchOptions.totalLength) {
      const txids = await sendBatchedTransactions(
        tempBatchedTransactionsQueue.map((b) => b.tx),
        payload,
        blockhashObject
      )

      // fulfilled promise
      tempBatchedTransactionsQueue.forEach(({ resolveFn }, idx) => {
        resolveFn(txids[idx])
      })

      // clear queue
      tempBatchedTransactionsQueue.splice(0, tempBatchedTransactionsQueue.length)
    }
    return newPromise
  } else {
    return sendSingleTransaction(transaction, payload, blockhashObject.blockhash)
  }
}

async function sendSingleTransaction(
  transaction: Transaction,
  payload: SendTransactionPayload,
  blockhash: string
): Promise<Txid> {
  if (payload.signerkeyPair?.ownerKeypair) {
    // if have signer detected, no need signAllTransactions
    transaction.recentBlockhash = blockhash
    transaction.feePayer = payload.signerkeyPair.payerKeypair?.publicKey ?? payload.signerkeyPair.ownerKeypair.publicKey

    return payload.connection.sendTransaction(transaction, [
      payload.signerkeyPair.payerKeypair ?? payload.signerkeyPair.ownerKeypair
    ])
  } else {
    const tx = getSerializedTx(transaction, payload.txKey)
    return await payload.connection.sendRawTransaction(tx, {
      skipPreflight: true
    })
  }
}

const groupSize = 20

function canBatchTransactions(
  blockInfo:
    | Readonly<{
        blockhash: string
        lastValidBlockHeight: number
      }>
    | {
        blockhash: string
        feeCalculator: unknown
      },
  connection: Connection,
  transaction: Transaction
): blockInfo is { blockhash: string; lastValidBlockHeight: number } {
  const isBlockInfoSatisfied = 'lastValidBlockHeight' in blockInfo
  const isConnectionSatisfied = '_buildArgs' in connection && '_rpcBatchRequest' in connection
  const isTransactionSatisfied = '_compile' in transaction && '_serialize' in transaction
  return isBlockInfoSatisfied && isConnectionSatisfied && isTransactionSatisfied
}

async function sendBatchedTransactions(
  transactions: Transaction[],
  payload: SendTransactionPayload,
  blockInfo: { blockhash: string; lastValidBlockHeight: number }
): Promise<Txid[]> {
  // console.log('params: ', { transactions, payload, blockInfo })
  const requests = transactions.map((tx) => {
    tx.recentBlockhash = blockInfo.blockhash
    tx.lastValidBlockHeight = blockInfo.lastValidBlockHeight
    // @ts-expect-error force
    const signData = (tx._compile() as Message).serialize()
    // console.log('signData: ', signData.toString('base64'))
    // @ts-expect-error force
    const encodedTransaction = (tx._serialize(signData) as Buffer).toString('base64')
    // console.log('encodedTransaction: ', encodedTransaction)
    const args = payload.connection._buildArgs([encodedTransaction], undefined, 'base64')
    // console.log('payload.connection: ', payload.connection)
    return {
      methodName: 'sendTransaction', // TEMP COPY
      args
    }
  })

  const results = asyncMap(groupItems(requests, groupSize), (groupedRequest) =>
    // @ts-expect-error force
    (payload.connection._rpcBatchRequest(groupedRequest) as Promise<any>).then((res) => {
      // console.log('res: ', res)
      return res.result.value
    })
  )
  // console.log('results: ', results)
  return results
}
