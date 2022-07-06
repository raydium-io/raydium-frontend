import assert from '@/functions/assert'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { PublicKeyish, Spl } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import { WSOLMint } from '../token/quantumSOL'

import useWallet from '../wallet/useWallet'
import { TransactionPiecesCollector } from './createTransaction'

export default async function createAssociatedTokenAccountIfNotExist(payload: {
  collector: TransactionPiecesCollector
  mint: PublicKeyish
  autoUnwrapWSOLToSOL?: boolean
}): Promise<PublicKey> {
  const mint = new PublicKey(payload.mint)
  const { owner, findTokenAccount } = useWallet.getState()
  assert(owner, 'user not connected')
  const tokenAccountAddress =
    findTokenAccount(mint)?.publicKey ??
    (await (async () => {
      const ataAddress = await Spl.getAssociatedTokenAccount({ mint, owner })
      const instruction = await Spl.makeCreateAssociatedTokenAccountInstruction({
        mint,
        associatedAccount: ataAddress,
        owner,
        payer: owner
      })
      // add this instruction
      payload.collector.addInstruction(instruction)
      return ataAddress
    })())

  /* ----------------------------- auto close WSOL ---------------------------- */
  if (payload.autoUnwrapWSOLToSOL && isMintEqual(mint, WSOLMint)) {
    // console.log('close')
    payload.collector.addEndInstruction(
      Spl.makeCloseAccountInstruction({ owner, payer: owner, tokenAccount: tokenAccountAddress })
    )
  }
  return tokenAccountAddress
}
