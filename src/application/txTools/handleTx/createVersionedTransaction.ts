import { buildTransaction, InnerTransaction, TxVersion } from '@raydium-io/raydium-sdk'
import { Connection, PublicKey, Signer, Transaction, VersionedTransaction } from '@solana/web3.js'

export async function buildTransactionsFromSDKInnerTransactions({
  connection,
  wallet,
  txVersion,
  transactions
}: {
  connection: Connection
  wallet: PublicKey
  txVersion: TxVersion
  transactions: InnerTransaction[]
}): Promise<(Transaction | VersionedTransaction)[]> {
  const spawnedTransactions = await buildTransaction({
    connection,
    payer: wallet,
    innerTransactions: transactions,
    txType: txVersion
  })
  return spawnedTransactions
}
