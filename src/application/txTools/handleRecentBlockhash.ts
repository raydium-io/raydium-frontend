import { Transaction } from '@solana/web3.js'

import assert from '@/functions/assert'

import useConnection from '../connection/useConnection'
import useWallet from '../wallet/useWallet'

/** @see https://giters.com/solana-labs/wallet-adapter/issues/226 it's just a temporary fix */
export async function handleRecentBlockhash(...transactions: Transaction[]) {
  const { connection } = useConnection.getState()
  const { adapter } = useWallet.getState()
  assert(connection, 'connection is not ready')
  assert(adapter?.publicKey, 'please connect a wallet')
  for await (const transaction of transactions) {
    transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
    transaction.feePayer = adapter.publicKey
  }
}
