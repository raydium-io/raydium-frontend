import { Spl } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'
import useWallet from '../wallet/useWallet'

import { WSOLMint } from '../token/utils/quantumSOL'
import toPubString from '@/functions/format/toMintString'

export default function txUnwrapWSOL() {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner } }) => {
    const piecesCollection = createTransactionCollector()
    const wsolTokenAccounts = useWallet
      .getState()
      .allTokenAccounts.filter((tokenAccount) => toPubString(tokenAccount.mint) === toPubString(WSOLMint))

    for (const wsolTokenAccount of wsolTokenAccounts) {
      const pubkey = wsolTokenAccount.publicKey
      if (!pubkey) continue
      piecesCollection.addInstruction(Spl.makeCloseAccountInstruction({ owner, payer: owner, tokenAccount: pubkey }))
    }

    transactionCollector.add(await piecesCollection.spawnTransaction(), {
      txHistoryInfo: {
        title: 'Unwrap WSOL',
        description: `closed all WSOL accounts`
      }
    })
  })
}
