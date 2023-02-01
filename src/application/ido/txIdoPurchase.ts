import { PublicKey, TransactionInstruction } from '@solana/web3.js'

import { InnerTransaction, InstructionType, Spl, WSOL } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '@/application/txTools/createTransaction'
import txHandler, { SingleTxOption, HandleFnOptions } from '@/application/txTools/handleTx'
import assert from '@/functions/assert'
import { mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { Numberish } from '@/types/constants'

import { Ido, Snapshot } from './sdk'
import { HydratedIdoInfo } from './type'
import { toInnerTransactionsFromInstructions } from '../txTools/toInnerTransactionsFromInstructions'

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
      const piecesCollector = createTransactionCollector()

      const lamports = idoInfo.state!.perLotteryQuoteAmount.mul(toBN(ticketAmount))

      const instructionsCollector: TransactionInstruction[] = []
      const instructionsTypeCollector: InstructionType[] = [] // methods like `Spl.makeCreateAssociatedTokenAccountInstruction` will add info to instructionsTypeCollector. so eventurally , it won't be an empty array
      const innerTransactionsCollector: InnerTransaction[] = []

      const baseTokenAccount = await Spl.getAssociatedTokenAccount({ mint: idoInfo.base.mint, owner })
      let quoteTokenAccount = await Spl.getAssociatedTokenAccount({ mint: idoInfo.quote.mint, owner })

      // TODO fix
      if (idoInfo.quote.mint.toBase58() === WSOL.mint) {
        const { innerTransaction, address } = await Spl.makeCreateWrappedNativeAccountInstructions({
          connection,
          owner,
          payer: owner,
          amount: lamports
        })

        quoteTokenAccount = address['newAccount'] /* SDK force, no type export */
        innerTransactionsCollector.push(innerTransaction)
        instructionsCollector.push(
          Spl.makeCloseAccountInstruction({
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
      } catch (e) {
        console.error(e)
      }

      transactionCollector.add(
        toInnerTransactionsFromInstructions({
          rawNativeInstructions: instructionsCollector,
          rawNativeInstructionTypes: instructionsTypeCollector,
          sdkInnerTransactions: innerTransactionsCollector
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
