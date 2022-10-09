import { Signer, Transaction, TransactionInstruction } from '@solana/web3.js'

import { attachRecentBlockhash } from './attachRecentBlockhash'

/** auto attach blockhash */
export const loadTransaction = async (payload: { transaction: Transaction; signers?: Signer[] }) => {
  const { transaction, signers } = payload
  const signedTransaction = await partialSignTransacion(transaction, signers)
  return signedTransaction
}

export type TransactionPiecesCollector = {
  setRawTransaction: (rawTransaction: Transaction) => void
  addInstruction: (...instructions: TransactionInstruction[]) => void
  addEndInstruction: (...instructions: TransactionInstruction[]) => void
  addSigner: (...signers: Signer[]) => void
  spawnTransaction: (options?: { forceBlockHash?: string }) => Promise<Transaction>
}

export const createTransactionCollector = (defaultRawTransaction?: Transaction): TransactionPiecesCollector => {
  let innerTransaction: Transaction | null = null
  const innerSigners = [] as Signer[]

  const frontInstructions: TransactionInstruction[] = []
  const endInstructions: TransactionInstruction[] = []

  const collector: TransactionPiecesCollector = {
    setRawTransaction(rawTransaction: Transaction) {
      innerTransaction = rawTransaction
    },
    addInstruction(...instructions: TransactionInstruction[]) {
      frontInstructions.push(...instructions)
    },
    addEndInstruction(...instructions: TransactionInstruction[]) {
      endInstructions.push(...instructions)
    },
    addSigner(...signers: Signer[]) {
      innerSigners.push(...signers)
    },
    async spawnTransaction(options?: { forceBlockHash?: string }): Promise<Transaction> {
      const rawTransaction = innerTransaction || (defaultRawTransaction ?? new Transaction())
      if (frontInstructions.length || endInstructions.length) {
        rawTransaction.add(...frontInstructions, ...endInstructions.reverse())
      }
      return partialSignTransacion(rawTransaction, innerSigners, options)
    }
  }

  return collector
}

const partialSignTransacion = async (
  transaction: Transaction,
  signers?: Signer[],
  options?: { forceBlockHash?: string }
): Promise<Transaction> => {
  if (signers?.length) {
    await attachRecentBlockhash([transaction], options)
    transaction.partialSign(...signers)
    return transaction
  }
  return transaction
}
