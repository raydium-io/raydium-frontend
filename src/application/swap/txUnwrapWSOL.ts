import { Spl } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'
import useWallet from '../wallet/useWallet'

import { WSOL, WSOLMint } from '../token/utils/quantumSOL'
import toPubString from '@/functions/format/toMintString'
import { Numberish } from '@/types/constants'
import { PublicKey } from '@solana/web3.js'
import { gt, gte, lt } from '@/functions/numberish/compare'
import { mul, sub } from '@/functions/numberish/operations'
import assert from '@/functions/assert'
import { toString } from '@/functions/numberish/toString'
import toBN from '@/functions/numberish/toBN'

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
        title: 'Unwrap ALL WSOL',
        description: `closed all WSOL accounts`
      }
    })
  })
}

/**
 * amount is already decimaled
 */
export function txUnwrapWSOL({ amount }: { amount: Numberish }) {
  /** in BN */
  const inputAmount = mul(amount, 10 ** WSOL.decimals)
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const { allTokenAccounts, allWsolBalance } = useWallet.getState()
    assert(gte(allWsolBalance, inputAmount), `not enough wsol to unwrap`)

    const allWsolTokenAccounts = allTokenAccounts.filter(
      (tokenAccount) => toPubString(tokenAccount.mint) === toPubString(WSOLMint)
    )
    /** balance low to balance large to ATA */
    const sortedTokenAccounts = allWsolTokenAccounts.sort((a, b) => {
      if (a.isAssociated) return 1
      if (b.isAssociated) return -1
      return lt(a.amount, b.amount) ? -1 : 1
    })

    const piecesCollection = createTransactionCollector()

    const { instructions, newAccount } = await Spl.makeCreateWrappedNativeAccountInstructions({
      connection,
      owner: new PublicKey(owner),
      payer: new PublicKey(owner),
      amount: 0
    })
    piecesCollection.addInstruction(...instructions)
    piecesCollection.addSigner(newAccount)
    piecesCollection.addEndInstruction(
      Spl.makeCloseAccountInstruction({ owner, payer: owner, tokenAccount: newAccount.publicKey })
    )

    let restAmount = inputAmount
    let currentIndex = 0
    while (gt(restAmount, 0) && sortedTokenAccounts[currentIndex]) {
      if (gte(restAmount, sortedTokenAccounts[currentIndex].amount)) {
        piecesCollection.addInstruction(
          Spl.makeCloseAccountInstruction({
            owner,
            payer: owner,
            tokenAccount: sortedTokenAccounts[currentIndex].publicKey! // it's not navtive sol, so must have publicKey
          })
        )
        restAmount = sub(restAmount, sortedTokenAccounts[currentIndex].amount)
        currentIndex++
      } else {
        piecesCollection.addInstruction(
          Spl.makeTransferInstruction({
            destination: newAccount.publicKey,
            source: sortedTokenAccounts[currentIndex].publicKey!, // it's not navtive sol, so must have publicKey
            amount: toBN(restAmount),
            owner: new PublicKey(owner)
          })
        )
        break
      }
    }

    transactionCollector.add(await piecesCollection.spawnTransaction(), {
      txHistoryInfo: {
        title: 'Unwrap',
        description: `${toString(amount)} WSOL ⇢ ${toString(amount)} SOL`
      }
    })
  })
}
