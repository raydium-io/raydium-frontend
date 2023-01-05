import { Connection, PublicKey, Signer, Transaction, VersionedTransaction } from '@solana/web3.js'

export type TxVersion = 'V0' | 'LEGACY'

export async function createVersionedTransaction({
  connection,
  wallet,
  txVersion,
  transactions
}: {
  connection: Connection
  wallet: PublicKey
  txVersion: TxVersion
  transactions: { transaction: Transaction; signers: Signer[] }[]
}): Promise<(Transaction | VersionedTransaction)[]> {
  return []
}
