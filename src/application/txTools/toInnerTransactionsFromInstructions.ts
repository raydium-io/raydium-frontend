import { InnerSimpleTransaction, InstructionType, TxVersion } from '@raydium-io/raydium-sdk'
import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'

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
  signer: Signer[]
  wallet: PublicKey | undefined
}): InnerSimpleTransaction[] {
  const { rawNativeInstructions, rawNativeInstructionTypes, signer, wallet } = payloads
  if (rawNativeInstructions.length !== rawNativeInstructionTypes.length) throw Error('inner tx type error')

  const needSigner = [
    ...new Set<PublicKey>(
      rawNativeInstructions.map((i) => i.keys.filter((ii) => ii.isSigner).map((ii) => ii.pubkey)).flat()
    )
  ].filter((i) => !i.equals(wallet ?? PublicKey.default))
  const _signer = [...new Set<PublicKey>(signer.map((i) => i.publicKey))]
  if (needSigner.length !== _signer.length) throw Error('inner tx signer error')

  return [
    {
      instructions: rawNativeInstructions,
      signers: signer,
      instructionTypes: rawNativeInstructionTypes
    }
  ]
}
