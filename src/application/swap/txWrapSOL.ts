import { CurrencyAmount, Spl } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'

import { deUITokenAmount, QuantumSOLVersionSOL } from '../token/utils/quantumSOL'
import { Numberish } from '@/types/constants'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { PublicKey } from '@solana/web3.js'
import { toString } from '@/functions/numberish/toString'

/**
 * it will create non-ATA wsol account
 *
 * amount is already decimaled
 */
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

    transactionCollector.add(await piecesCollection.spawnTransaction(), {
      txHistoryInfo: {
        title: 'Wrap',
        description: `${toString(amount)} SOL ⇢ WSOL`
      }
    })
  })
}
