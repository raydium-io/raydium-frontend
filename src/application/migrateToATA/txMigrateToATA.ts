import {
  InnerSimpleTransaction,
  InnerTransaction,
  InstructionType,
  Spl,
  TxVersion,
  splitTxAndSigners
} from '@raydium-io/raydium-sdk'
import {
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  createTransferInstruction
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import txHandler from '../txTools/handleTx'
import { ITokenAccount } from '../wallet/type'
import useWallet from '../wallet/useWallet'

/**
 * @author Rudy
 */
export default function txMigrateToATA(selectedTokenAccounts: string[], options?: { onTxSuccess?: () => void }) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const { allTokenAccounts } = useWallet.getState()

    const ataAdd: { [key: string]: PublicKey } = {}
    const allAdd: { [key: string]: ITokenAccount } = {}
    for (const item of allTokenAccounts) {
      if (item.isAssociated) ataAdd[item.mint!.toString()] = item.publicKey!
      if (item.publicKey === undefined) continue
      allAdd[item.publicKey.toString()] = item
    }

    const ins: InnerTransaction[] = []
    for (const noneATAAccountPublicKey of selectedTokenAccounts) {
      const keyMint = allAdd[noneATAAccountPublicKey]
      let mintAta = ataAdd[keyMint.mint!.toString()]

      const itemIns: InnerTransaction = {
        instructionTypes: [],
        instructions: [],
        signers: []
      }

      if (mintAta === undefined) {
        const ata = Spl.getAssociatedTokenAccount({ mint: keyMint.mint!, owner, programId: keyMint.programId! })

        ataAdd[keyMint.mint!.toString()] = ata
        mintAta = ata

        itemIns.instructions.push(
          createAssociatedTokenAccountInstruction(owner, ata, owner, keyMint.mint!, keyMint.programId)
        )

        itemIns.instructionTypes.push(InstructionType.createATA)
      }

      if (!keyMint.amount.isZero())
        itemIns.instructions.push(
          createTransferInstruction(
            new PublicKey(noneATAAccountPublicKey),
            mintAta,
            owner,
            BigInt(keyMint.amount.toString()),
            [],
            keyMint.programId
          )
        )

      itemIns.instructionTypes.push(InstructionType.transferAmount)

      itemIns.instructions.push(
        createCloseAccountInstruction(new PublicKey(noneATAAccountPublicKey), owner, owner, [], keyMint.programId)
      )
      itemIns.instructionTypes.push(InstructionType.closeAccount)

      ins.push(itemIns)
    }

    if (!ins.length) {
      throw new Error('No account needs to be migrate')
    }
    transactionCollector.add(
      await splitTxAndSigners({
        connection,
        makeTxVersion: TxVersion.LEGACY,
        payer: owner,
        innerTransaction: ins
      }),
      {
        txHistoryInfo: {
          title: 'Migrate to ATA',
          description: `Migrate to ATA`
        },
        onTxSuccess() {
          options?.onTxSuccess?.()
        }
      }
    )
  })
}
