import { Signer, Transaction, TransactionInstruction } from '@solana/web3.js'

import { RawTransactionPair } from './handleTx'

export type TransactionPiecesCollector = {
  setRawTransaction: (rawTransaction: Transaction) => void
  addInstruction: (...instructions: TransactionInstruction[]) => void
  addEndInstruction: (...instructions: TransactionInstruction[]) => void
  addSigner: (...signers: Signer[]) => void
  spawnTransaction: () => RawTransactionPair
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
    spawnTransaction(): RawTransactionPair {
      const rawTransaction = innerTransaction || (defaultRawTransaction ?? new Transaction())
      if (frontInstructions.length || endInstructions.length) {
        rawTransaction.add(...frontInstructions, ...endInstructions.reverse())
      }
      return { transaction: rawTransaction, signers: innerSigners }
      // return partialSignTransacion(rawTransaction, innerSigners, options)
    }
  }

  return collector
}
