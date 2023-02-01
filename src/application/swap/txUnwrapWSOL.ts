import { getWSOLAmount, unwarpSol } from '@raydium-io/raydium-sdk'

import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { toString } from '@/functions/numberish/toString'

import { QuantumSOLVersionWSOL, WSOLMint } from '../token/quantumSOL'
import txHandler, { TransactionQueue } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

export default function txUnwrapAllWSOL() {
  return txHandler(async ({ transactionCollector, baseUtils: { owner } }) => {
    const { allTokenAccounts, tokenAccountRawInfos } = useWallet.getState()

    const wsolITokenAccounts = allTokenAccounts.filter(
      (tokenAccount) => toPubString(tokenAccount.mint) === toPubString(WSOLMint)
    )

    const wsolTokenAccounts = tokenAccountRawInfos.filter((tokenAccount) => {
      let result = false
      for (const wsolITokenAccount of wsolITokenAccounts) {
        if (toPubString(wsolITokenAccount.publicKey) === toPubString(tokenAccount.pubkey)) {
          result = true
          break
        }
      }
      return result
    })

    const amount = getWSOLAmount({ tokenAccounts: wsolTokenAccounts })
    const { innerTransactions } = unwarpSol({
      ownerInfo: {
        wallet: owner,
        payer: owner
      },
      tokenAccounts: wsolTokenAccounts
    })

    const queue = innerTransactions.map((tx, idx) => [
      tx,
      {
        txHistoryInfo: {
          title: 'Unwrapped all WSOL',
          description: `Unwrapped total ${toString(toTokenAmount(QuantumSOLVersionWSOL, amount))} WSOL`
        }
      }
    ]) as TransactionQueue

    transactionCollector.add(queue)
  })
}
