import { Connection, PublicKey, Signer, Transaction, VersionedTransaction } from '@solana/web3.js'
export async function createVersionedTransaction({
  connection,
  wallet,
  txVersion,
  transactions
}: {
  connection: Connection
  wallet: PublicKey
  txVersion: 'V0' | 'LEGACY'
  transactions: { transaction: Transaction; signers: Signer[] }[]
}): Promise<(Transaction | VersionedTransaction)[]> {
  return []
}
