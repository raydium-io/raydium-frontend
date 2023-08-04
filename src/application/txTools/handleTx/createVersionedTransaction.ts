import { buildSimpleTransaction, InnerSimpleTransaction, TxVersion } from '@raydium-io/raydium-sdk'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

export async function buildTransactionsFromSDKInnerTransactions({
  connection,
  wallet,
  txVersion,
  transactions
}: {
  connection: Connection
  wallet: PublicKey
  txVersion: TxVersion
  transactions: InnerSimpleTransaction[]
}): Promise<(Transaction | VersionedTransaction)[]> {
  const spawnedTransactions = await buildSimpleTransaction({
    connection,
    payer: wallet,
    innerTransactions: transactions,
    makeTxVersion: txVersion
  })
  return spawnedTransactions
}
