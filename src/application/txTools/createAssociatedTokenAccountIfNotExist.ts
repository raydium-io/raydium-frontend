import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { PublicKeyish, Spl } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import { WSOLMint } from '../token/quantumSOL'

import useWallet from '../wallet/useWallet'
import { TransactionPiecesCollector } from './createTransaction'

const tokenAccountAddressCache = new Map()

export default async function createAssociatedTokenAccountIfNotExist(payload: {
  collector: TransactionPiecesCollector
  mint: PublicKeyish
  autoUnwrapWSOLToSOL?: boolean
}): Promise<PublicKey> {
  const mint = new PublicKey(payload.mint)
  const { owner, findTokenAccount } = useWallet.getState()
  assert(owner, 'user not connected')

  // avoid check twice (Ray can be a lp and can be a reward )
  if (tokenAccountAddressCache.has(toPubString(mint) + toPubString(owner)))
    return tokenAccountAddressCache.get(toPubString(mint))

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

  // set cache
  tokenAccountAddressCache.set(toPubString(mint) + toPubString(owner), tokenAccountAddress)

  /* ----------------------------- auto close WSOL ---------------------------- */
  if (payload.autoUnwrapWSOLToSOL && isMintEqual(mint, WSOLMint)) {
    payload.collector.addEndInstruction(
      Spl.makeCloseAccountInstruction({ owner, payer: owner, tokenAccount: tokenAccountAddress })
    )
  }
  return tokenAccountAddress
}
