import { CurrencyAmount, Spl, splitNumber } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'

import { deUITokenAmount, QuantumSOLVersionSOL, WSOLMint } from '../token/utils/quantumSOL'
import { Numberish } from '@/types/constants'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { PublicKey } from '@solana/web3.js'
import { toString } from '@/functions/numberish/toString'

export default function txWrapSOL({ amount }: { amount: Numberish }) {
  const solAmount = deUITokenAmount(
    toTokenAmount(QuantumSOLVersionSOL, amount, { alreadyDecimaled: true })
  ) as CurrencyAmount
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const piecesCollection = createTransactionCollector()

    // create wol account
    const { instructions, newAccount } = await Spl.makeCreateWrappedNativeAccountInstructions({
      connection,
      owner: new PublicKey(owner),
      payer: new PublicKey(owner),
      amount: solAmount.raw
    })
    piecesCollection.addInstruction(...instructions)
    piecesCollection.addSigner(newAccount)

    // wsol to ATA
    // const instruction = Spl.makeCreateAssociatedTokenAccountInstruction({
    //   mint: WSOLMint,
    //   associatedAccount: newAccount.publicKey,
    //   owner,
    //   payer: owner
    // })
    // piecesCollection.addInstruction(instruction)

    transactionCollector.add(await piecesCollection.spawnTransaction(), {
      txHistoryInfo: {
        title: 'Wrap SOL',
        description: `${toString(amount)} SOL to ${toString(amount)} WSOL`
      }
    })
  })
}
