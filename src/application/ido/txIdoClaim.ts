import { PublicKey, TransactionInstruction } from '@solana/web3.js'

import { Spl, WSOL } from '@raydium-io/raydium-sdk'

import txHandler, { HandleFnOptions, SingleTxOption } from '@/application/txTools/handleTx'
import { padZero } from '@/functions/numberish/handleZero'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'

import { InnerTransaction, InstructionType } from '@raydium-io/raydium-sdk'
import { Ido, Snapshot } from './sdk'
import { HydratedIdoInfo } from './type'
import { toInnerTransactionsFromInstructions } from '../txTools/toInnerTransactionsFromInstructions'

export default async function txIdoClaim(
  options: { idoInfo: HydratedIdoInfo; side: 'base' | 'quote' } & SingleTxOption & HandleFnOptions
) {
  const { idoInfo, side, forceKeyPairs, ...restTxAddOptions } = options
  return txHandler(
    async ({ transactionCollector, baseUtils: { owner, connection, tokenAccounts } }) => {
      if (!idoInfo.base || !idoInfo.quote) return

      const instructionsCollector: TransactionInstruction[] = []
      const instructionsTypeCollector: InstructionType[] = [] // methods like `Spl.makeCreateAssociatedTokenAccountInstruction` will add info to instructionsTypeCollector. so eventurally , it won't be an empty array
      const innerTransactionsCollector: InnerTransaction[] = []

      const baseTokenAccount = Spl.getAssociatedTokenAccount({ mint: idoInfo.base.mint, owner })
      let quoteTokenAccount = Spl.getAssociatedTokenAccount({ mint: idoInfo.quote.mint, owner })

      // TODO fix
      if (idoInfo.quote.mint.toBase58() === WSOL.mint) {
        const { innerTransaction, address } = await Spl.makeCreateWrappedNativeAccountInstructions({
          connection,
          owner,
          payer: owner,
          amount: 0
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
      transactionCollector.add(
        toInnerTransactionsFromInstructions({
          rawNativeInstructions: instructionsCollector,
          rawNativeInstructionTypes: instructionsTypeCollector,
          sdkInnerTransactions: innerTransactionsCollector
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
