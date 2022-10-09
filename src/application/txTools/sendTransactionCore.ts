import { Connection, Transaction } from '@solana/web3.js'

import { SendTransactionPayload, serialize } from './handleTx'

type Txid = string

const tempBatchedTransactionsQueue: {
  tx: Transaction
  txidPromise: Promise<string>
  resolveFn: (value: string) => void
}[] = []

function canBatchTransactions(connection: Connection, transaction: Transaction) {
  const isConnectionSatisfied = '_buildArgs' in connection && '_rpcBatchRequest' in connection
  const isTransactionSatisfied = '_compile' in transaction && '_serialize' in transaction
  return isConnectionSatisfied && isTransactionSatisfied
}

export async function sendTransactionCore(
  transaction: Transaction,
  payload: SendTransactionPayload,
  batchOptions?: { allSignedTransactions: Transaction[] }
): Promise<Txid> {
  if (batchOptions && canBatchTransactions(payload.connection, transaction)) {
    let resolveFn
    const newPromise = new Promise<string>((resolve) => {
      resolveFn = resolve
    })
    tempBatchedTransactionsQueue.push({ tx: transaction, txidPromise: newPromise, resolveFn })
    // once all tx load, start batch sending
    if (tempBatchedTransactionsQueue.length === batchOptions.allSignedTransactions.length) {
      const txids = await sendBatchedTransactions(
        tempBatchedTransactionsQueue.map((b) => b.tx),
        payload
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
    return sendSingleTransaction(transaction, payload)
  }
}

async function sendSingleTransaction(transaction: Transaction, payload: SendTransactionPayload): Promise<Txid> {
  if (payload.signerkeyPair?.ownerKeypair) {
    // if have signer detected, no need signAllTransactions
    transaction.feePayer = payload.signerkeyPair.payerKeypair?.publicKey ?? payload.signerkeyPair.ownerKeypair.publicKey

    return payload.connection.sendTransaction(transaction, [
      payload.signerkeyPair.payerKeypair ?? payload.signerkeyPair.ownerKeypair
    ])
  } else {
    const tx = serialize(transaction)
    return await payload.connection.sendRawTransaction(tx, {
      skipPreflight: true
    })
  }
}

async function sendBatchedTransactions(
  allSignedTransactions: Transaction[],
  payload: SendTransactionPayload
): Promise<Txid[]> {
  const encodedTransactions = allSignedTransactions.map((i) => i.serialize().toString('base64'))

  const batch = encodedTransactions.map((keys) => {
    const args = payload.connection._buildArgs([keys], undefined, 'base64')
    return { methodName: 'sendTransaction', args }
  })

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const results = (await payload.connection._rpcBatchRequest(batch)).map((ii) => ii.result.value)
  return results
}
