import { Connection, Transaction } from '@solana/web3.js'

import assert from '@/functions/assert'

import useConnection from '../connection/useConnection'
import useWallet from '../wallet/useWallet'

const recentBlockhashCache: {
  timeReq: number | undefined
  time: number | undefined
  recentBlockhash: string
} = {
  timeReq: undefined,
  time: undefined,
  recentBlockhash: ''
}
/** @see https://giters.com/solana-labs/wallet-adapter/issues/226 it's just a temporary fix */
export async function attachRecentBlockhash(transactions: Transaction[], options?: { forceBlockHash?: string }) {
  const { connection } = useConnection.getState()
  const { owner } = useWallet.getState()
  assert(connection, 'connection is not ready, maybe RPC is collapsed now')
  assert(owner, 'please connect a wallet')
  for await (const transaction of transactions) {
    if (options?.forceBlockHash) {
      // if provide forceBlockHash , don't re get any more
      transaction.recentBlockhash = options?.forceBlockHash
    }

    // console.log('transaction.recentBlockhash: ', transaction.recentBlockhash)
    if (!transaction.recentBlockhash) {
      // recentBlockhash may already attached by sdk
      // console.log('recentBlockhash.time: ', recentBlockhashCache.time)
      if (recentBlockhashCache.timeReq !== undefined && recentBlockhashCache.timeReq > new Date().getTime() - 1000 * 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * 1))
      }

      if (!recentBlockhashCache.time || recentBlockhashCache.time < new Date().getTime() - 1000 * 1) {
        recentBlockhashCache.timeReq = new Date().getTime()
        recentBlockhashCache.recentBlockhash = (await getRecentBlockhash(connection)).blockhash
        recentBlockhashCache.timeReq = undefined
        recentBlockhashCache.time = new Date().getTime()
      }
      // transaction.recentBlockhash = (await getRecentBlockhash(connection)).blockhash
      transaction.recentBlockhash = recentBlockhashCache.recentBlockhash
    }

    transaction.feePayer = owner
  }
}

export async function getRecentBlockhash(connection: Connection) {
  return connection.getLatestBlockhash()
}
