import { Spl, TokenAccount, unwarpSol } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt, gte, lt } from '@/functions/numberish/compare'
import { mul, sub } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'

import { QuantumSOLVersionWSOL, WSOL, WSOLMint } from '../token/quantumSOL'
import { createTransactionCollector, loadTransaction } from '../txTools/createTransaction'
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

    const { transactions, amount } = unwarpSol({
      ownerInfo: {
        wallet: owner,
        payer: owner
      },
      tokenAccounts: wsolTokenAccounts
    })

    const signedTransactions = shakeUndifindedItem(
      await asyncMap(transactions, (merged) => {
        if (!merged) return
        const { transaction, signer: signers } = merged
        return loadTransaction({ transaction: transaction, signers })
      })
    )

    /* eslint-disable */
    console.log('wsol amount: ', toTokenAmount(QuantumSOLVersionWSOL, amount))

    const queue = signedTransactions.map((tx, idx) => [
      tx,
      {
        txHistoryInfo: {
          title: 'Unwrapped all WSOL',
          description: `Unwrapped total ${toTokenAmount(QuantumSOLVersionWSOL, amount)} WSOL`
        }
      }
    ]) as TransactionQueue

    transactionCollector.addQueue(queue)
  })
}

/**
 * amount is already decimaled
 */
export function txUnwrapWSOL({ amount }: { amount: Numberish }) {
  /** in BN */
  const inputAmount = mul(amount, 10 ** WSOL.decimals)
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
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
