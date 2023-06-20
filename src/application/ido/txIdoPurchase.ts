import txHandler, { HandleFnOptions, SingleTxOption } from '@/application/txTools/handleTx'
import assert from '@/functions/assert'
import { mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { Numberish } from '@/types/constants'
import { InstructionType, Spl, TOKEN_PROGRAM_ID, WSOL } from '@raydium-io/raydium-sdk'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'
import { getTokenProgramId, isToken2022 } from '../token/isToken2022'
import { toInnerTransactionsFromInstructions } from '../txTools/toInnerTransactionsFromInstructions'
import { Ido, Snapshot } from './sdk'
import { HydratedIdoInfo } from './type'

export default async function txIdoPurchase({
  idoInfo,
  ticketAmount,
  forceKeyPairs,
  ...restTxAddOptions
}: {
  idoInfo: HydratedIdoInfo
  ticketAmount: Numberish
} & SingleTxOption &
  HandleFnOptions) {
  assert(idoInfo.state, 'opps sdk fail to load')
  return txHandler(
    async ({ transactionCollector, baseUtils: { connection, owner, tokenAccounts } }) => {
      if (!idoInfo.base || !idoInfo.quote) return
      const lamports = idoInfo.state!.perLotteryQuoteAmount.mul(toBN(ticketAmount))

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
          amount: lamports
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
        programId: new PublicKey(idoInfo.snapshotProgramId),
        owner,
        seedId: new PublicKey(idoInfo.seedId)
      })

      try {
        instructionsCollector.push(
          await Ido.makePurchaseInstruction({
            // @ts-expect-error sdk has change
            poolConfig: {
              // TODO!
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
            amount: toBN(ticketAmount)
          })
        )
        instructionsTypeCollector.push('-1' as any)
      } catch (e) {
        console.error(e)
      }

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
            title: `AccelerRaytor Deposit`,
            description: `Deposit ${mul(ticketAmount, idoInfo.ticketPrice)} ${idoInfo.baseSymbol}`
          }
        }
      )
    },
    { forceKeyPairs }
  )
}
