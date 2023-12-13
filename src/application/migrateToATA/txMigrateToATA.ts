import { InnerSimpleTransaction, InstructionType, Spl } from '@raydium-io/raydium-sdk'
import { createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createTransferInstruction } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import txHandler from '../txTools/handleTx'
import { ITokenAccount } from '../wallet/type'
import useWallet from '../wallet/useWallet'

export default function txMigrateToATA(selectedTokenAccountKeys: string[]) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { programIds } = useAppAdvancedSettings.getState()
    const { allTokenAccounts, txVersion } = useWallet.getState()

    const ataAdd: { [key: string]: PublicKey } = {}
    const allAdd: { [key: string]: ITokenAccount } = {}
    for (const item of allTokenAccounts) {
      if (item.isAssociated) ataAdd[item.mint!.toString()] = item.publicKey!
      if (item.publicKey === undefined) continue
      allAdd[item.publicKey.toString()] = item
    }

    const ins: InnerSimpleTransaction[] = []
    for (const item of selectedTokenAccountKeys) {
      const keyMint = allAdd[item]
      let mintAta = ataAdd[keyMint.mint!.toString()]

      const itemIns: InnerSimpleTransaction = {
        instructionTypes: [],
        instructions: [],
        signers: []
      }

      if (mintAta === undefined) {
        const ata = Spl.getAssociatedTokenAccount({ mint: keyMint.mint!, owner, programId: keyMint.programId! })

        ataAdd[keyMint.mint!.toString()] = ata
        mintAta = ata

        itemIns.instructions.push(createAssociatedTokenAccountInstruction(
          owner,
          ata,
          owner,
          keyMint.mint!,
          keyMint.programId,
        ))
        itemIns.instructionTypes.push(InstructionType.createATA)
      }

      itemIns.instructions.push(createTransferInstruction(
        new PublicKey(item),
        mintAta,
        owner,
        BigInt(keyMint.amount.toString()),
        [],
        keyMint.programId,
      ))
      itemIns.instructionTypes.push(InstructionType.transferAmount)

      itemIns.instructions.push(createCloseAccountInstruction(
        new PublicKey(item),
        owner,
        owner,
        [],
        keyMint.programId,
      ))
      itemIns.instructionTypes.push(InstructionType.closeAccount)

      ins.push(itemIns)
    }

    if (!ins.length) {
      throw new Error('No account needs to be migrate')
    }
    transactionCollector.add(ins, {
      txHistoryInfo: {
        title: 'PDA Migrate',
        description: `Migrate PDA from V1 to V2 and harvest`
      }
    })
  })
}
