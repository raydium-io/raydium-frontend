import { TransactionInstruction } from '@solana/web3.js'
import { InnerTransaction, InstructionType } from '@raydium-io/raydium-sdk'

/**
 * **now only ido have this**
 *
 * other part has sdk innerTransactions
 *
 * this is a mock version
 *
 * @author Rudy
 */
export function toInnerTransactionsFromInstructions(payloads: {
  rawNativeInstructions: TransactionInstruction[]
  rawNativeInstructionTypes: InstructionType[]
  sdkInnerTransactions?: InnerTransaction[]
}): InnerTransaction[] {
  throw 'todo: not imply `toInnerTransactionsFromInstructions` yet'
}
