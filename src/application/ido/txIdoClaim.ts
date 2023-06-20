import txHandler, { HandleFnOptions, SingleTxOption } from '@/application/txTools/handleTx'
import { padZero } from '@/functions/numberish/handleZero'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { InstructionType, Spl, WSOL } from '@raydium-io/raydium-sdk'
import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'
import { getTokenProgramId } from '../token/isToken2022'
import { toInnerTransactionsFromInstructions } from '../txTools/toInnerTransactionsFromInstructions'
import { Ido, Snapshot } from './sdk'
import { HydratedIdoInfo } from './type'

export default async function txIdoClaim(
  options: { idoInfo: HydratedIdoInfo; side: 'base' | 'quote' } & SingleTxOption & HandleFnOptions
) {
  const { idoInfo, side, forceKeyPairs, ...restTxAddOptions } = options
  return txHandler(
    async ({ transactionCollector, baseUtils: { owner, connection, tokenAccounts } }) => {
      if (!idoInfo.base || !idoInfo.quote) return

      const instructionsCollector: TransactionInstruction[] = []
      const signer: Signer[] = []
      const instructionsTypeCollector: InstructionType[] = [] // methods like `Spl.makeCreateAssociatedTokenAccountInstruction` will add info to instructionsTypeCollector. so eventurally , it won't be an empty array

      const baseProgramId = await getTokenProgramId(idoInfo.base.mint)
      const quoteProgramId = await getTokenProgramId(idoInfo.quote.mint)
      const baseTokenAccount = Spl.getAssociatedTokenAccount({
        mint: idoInfo.base.mint,
        owner,
        programId: baseProgramId
      })
      let quoteTokenAccount = Spl.getAssociatedTokenAccount({
        mint: idoInfo.quote.mint,
        owner,
        programId: quoteProgramId
      })

      // TODO fix
      if (idoInfo.quote.mint.toBase58() === WSOL.mint) {
        const { innerTransaction, address } = await Spl.makeCreateWrappedNativeAccountInstructions({
          connection,
          owner,
          payer: owner,
          amount: 0
        })
        quoteTokenAccount = address['newAccount'] /* SDK force, no type export */
        instructionsCollector.push(...innerTransaction.instructions)
        signer.push(...innerTransaction.signers)
        instructionsTypeCollector.push(...innerTransaction.instructionTypes)

        instructionsCollector.push(
          Spl.makeCloseAccountInstruction({
            programId: quoteProgramId,
            tokenAccount: quoteTokenAccount,
            owner,
            payer: owner,
            instructionsType: instructionsTypeCollector
          })
        )
      } else {
        if (!tokenAccounts.find((tokenAmount) => tokenAmount.publicKey?.equals(quoteTokenAccount))) {
          instructionsCollector.push(
            Spl.makeCreateAssociatedTokenAccountInstruction({
              programId: quoteProgramId,
              mint: idoInfo.quote.mint,
              associatedAccount: quoteTokenAccount,
              owner,
              payer: owner,
              instructionsType: instructionsTypeCollector
            })
          )
        }
      }
      if (!tokenAccounts.find((tokenAmount) => tokenAmount.publicKey?.equals(baseTokenAccount))) {
        instructionsCollector.push(
          Spl.makeCreateAssociatedTokenAccountInstruction({
            programId: baseProgramId,
            mint: idoInfo.base.mint,
            associatedAccount: baseTokenAccount,
            owner,
            payer: owner,
            instructionsType: instructionsTypeCollector
          })
        )
      }
      const ledgerAccount = await Ido.getAssociatedLedgerAccountAddress({
        programId: new PublicKey(idoInfo.programId),
        owner,
        poolId: new PublicKey(idoInfo.id)
      })
      const snapshotAccount = await Snapshot.getAssociatedSnapshotAddress({
        programId: new PublicKey(idoInfo.id),
        owner,
        seedId: new PublicKey(idoInfo.seedId)
      })
      instructionsCollector.push(
        Ido.makeClaimInstruction({
          // @ts-expect-error sdk has change
          poolConfig: {
            id: new PublicKey(idoInfo.id),
            programId: new PublicKey(idoInfo.programId),
            authority: new PublicKey(idoInfo.authority),
            baseVault: new PublicKey(idoInfo.baseVault),
            quoteVault: new PublicKey(idoInfo.quoteVault)
          },
          userKeys: {
            baseTokenAccount,
            quoteTokenAccount,
            ledgerAccount,
            snapshotAccount,
            owner
          },
          side
        })
      )
      instructionsTypeCollector.push('-1' as any)

      transactionCollector.add(
        toInnerTransactionsFromInstructions({
          rawNativeInstructions: instructionsCollector,
          rawNativeInstructionTypes: instructionsTypeCollector,
          signer,
          wallet: owner
        }),
        {
          ...restTxAddOptions,
          txHistoryInfo: {
            title: 'AccelerRaytor Claim',
            description:
              side === 'base'
                ? `Claim ${toString(idoInfo.userAllocation)} ${idoInfo.base.symbol ?? '--'}`
                : `Claim ${
                    idoInfo.quote && idoInfo.ledger
                      ? toString(div(idoInfo.ledger?.quoteDeposited, padZero(1, idoInfo.quote?.decimals ?? 0)))
                      : ''
                  } ${idoInfo.quote.symbol ?? '--'}`
          }
        }
      )
    },
    { forceKeyPairs }
  )
}
