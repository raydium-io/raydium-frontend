import { Spl } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'
import useWallet from '../wallet/useWallet'

import { WSOLMint } from '../token/utils/quantumSOL'
import toPubString from '@/functions/format/toMintString'
import { Numberish } from '@/types/constants'
import { PublicKey } from '@solana/web3.js'

export default function txUnwrapAllWSOL() {
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

export function txUnwrapWSOL({ amount }: { amount: Numberish }) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const { allWsolBalance, allTokenAccounts } = useWallet.getState()

    const allWsolTokenAccounts = allTokenAccounts.filter(
      (tokenAccount) => toPubString(tokenAccount.mint) === toPubString(WSOLMint)
    )
    const ataWsolTokenAccount = allWsolTokenAccounts.find((tokenAccount) => tokenAccount.isAssociated)

    const piecesCollection = createTransactionCollector()

    const { instructions, newAccount } = await Spl.makeCreateWrappedNativeAccountInstructions({
      connection,
      owner: new PublicKey(owner),
      payer: new PublicKey(owner),
      amount: 0
    })
    piecesCollection.addInstruction(...instructions)
    piecesCollection.addSigner(newAccount)

    for (const wsolTokenAccount of allWsolTokenAccounts) {
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
