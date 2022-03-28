import { CurrencyAmount, Spl } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'

import { deUITokenAmount, QuantumSOLVersionSOL, WSOLMint } from '../token/utils/quantumSOL'
import { Numberish } from '@/types/constants'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { PublicKey } from '@solana/web3.js'
import { toString } from '@/functions/numberish/toString'
import useWallet from '../wallet/useWallet'
import toPubString from '@/functions/format/toMintString'
import { lt } from '@/functions/numberish/compare'

/**
 * it will create non-ATA wsol account
 *
 * amount is already decimaled
 */
export default function txWrapSOL({ amount }: { amount: Numberish }) {
  const inputAmount = deUITokenAmount(
    toTokenAmount(QuantumSOLVersionSOL, amount, { alreadyDecimaled: true })
  ) as CurrencyAmount

  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const piecesCollection = createTransactionCollector()

    const { allTokenAccounts } = useWallet.getState()
    const allWsolTokenAccounts = allTokenAccounts.filter(
      (tokenAccount) => toPubString(tokenAccount.mint) === toPubString(WSOLMint)
    )
    /** balance low to balance large to ATA */
    const sortedTokenAccounts = allWsolTokenAccounts.sort((a, b) => {
      if (a.isAssociated) return -1
      if (b.isAssociated) return 1
      return lt(a.amount, b.amount) ? 1 : -1
    })

    const { instructions, newAccount } = await Spl.makeCreateWrappedNativeAccountInstructions({
      connection,
      owner: new PublicKey(owner),
      payer: new PublicKey(owner),
      amount: inputAmount.raw
    })
    piecesCollection.addInstruction(...instructions)
    piecesCollection.addSigner(newAccount)

    if (sortedTokenAccounts.length) {
      // already have wsol account
      piecesCollection.addInstruction(
        Spl.makeTransferInstruction({
          destination: sortedTokenAccounts[0].publicKey!,
          source: newAccount.publicKey, // it's not navtive sol, so must have publicKey
          amount: inputAmount.raw,
          owner: new PublicKey(owner)
        })
      )
      piecesCollection.addEndInstruction(
        Spl.makeCloseAccountInstruction({ owner, payer: owner, tokenAccount: newAccount.publicKey })
      )
    }

    transactionCollector.add(await piecesCollection.spawnTransaction(), {
      txHistoryInfo: {
        title: 'Wrap',
        description: `${toString(amount)} SOL ⇢ ${toString(amount)} WSOL`
      }
    })
  })
}
