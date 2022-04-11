import { Connection, Transaction } from '@solana/web3.js'

import assert from '@/functions/assert'

import useConnection from '../connection/useConnection'
import useWallet from '../wallet/useWallet'

/** @see https://giters.com/solana-labs/wallet-adapter/issues/226 it's just a temporary fix */
export async function attachRecentBlockhash(...transactions: Transaction[]) {
  const { connection } = useConnection.getState()
  const { owner } = useWallet.getState()
  assert(connection, 'connection is not ready, maybe RPC is collapsed now')
  assert(owner, 'please connect a wallet')
  for await (const transaction of transactions) {
    if (!transaction.recentBlockhash) {
      // recentBlockhash may already attached by sdk
      transaction.recentBlockhash = await getRecentBlockhash(connection)
    }
    transaction.feePayer = owner
  }
}

export async function getRecentBlockhash(connection: Connection) {
  try {
    return (await connection.getLatestBlockhash?.())?.blockhash || (await connection.getRecentBlockhash()).blockhash
  } catch {
    return (await connection.getRecentBlockhash()).blockhash
  }
}
