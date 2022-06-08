import { Spl, WSOL } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import BN from 'bn.js'

import { SubscribeSignatureCallbacks } from '@/application/txTools/subscribeTx'

import handleMultiTx, { TxAddOptions, TxShadowOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import assert from '@/functions/assert'
import { Numberish } from '@/types/constants'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'
import { mul } from '@/functions/numberish/operations'
import { HydratedFarmInfo } from '@/application/farms/type'
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
} & TxAddOptions &
  TxShadowOptions) {
  assert(idoInfo.state, 'opps sdk fail to load')
  return handleMultiTx(
    async ({ transactionCollector, baseUtils: { connection, owner, tokenAccounts } }) => {
      if (!idoInfo.base || !idoInfo.quote) return
      const piecesCollector = createTransactionCollector()

      const lamports = idoInfo.state!.perLotteryQuoteAmount.mul(toBN(ticketAmount))

      const baseTokenAccount = await Spl.getAssociatedTokenAccount({ mint: idoInfo.base.mint, owner })
      let quoteTokenAccount = await Spl.getAssociatedTokenAccount({ mint: idoInfo.quote.mint, owner })

      // TODO fix
      if (idoInfo.quote.mint.toBase58() === WSOL.mint) {
        const { newAccount, instructions } = await Spl.makeCreateWrappedNativeAccountInstructions({
          connection,
          owner,
          payer: owner,
          amount: lamports
        })

        quoteTokenAccount = newAccount.publicKey

        for (const instruction of instructions) {
          piecesCollector.addInstruction(instruction)
        }

        piecesCollector.addEndInstruction(
          Spl.makeCloseAccountInstruction({ tokenAccount: newAccount.publicKey, owner, payer: owner })
        )
        piecesCollector.addSigner(newAccount)
      } else {
        if (!tokenAccounts.find((tokenAmount) => tokenAmount.publicKey?.equals(quoteTokenAccount))) {
          piecesCollector.addInstruction(
            Spl.makeCreateAssociatedTokenAccountInstruction({
              mint: idoInfo.quote.mint,
              associatedAccount: quoteTokenAccount,
              owner,
              payer: owner
            })
          )
        }
      }

      if (!tokenAccounts.find((tokenAmount) => tokenAmount.publicKey?.equals(baseTokenAccount))) {
        piecesCollector.addInstruction(
          Spl.makeCreateAssociatedTokenAccountInstruction({
            mint: idoInfo.base.mint,
            associatedAccount: baseTokenAccount,
            owner,
            payer: owner
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
        piecesCollector.addInstruction(
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

      transactionCollector.add(await piecesCollector.spawnTransaction(), {
        ...restTxAddOptions,
        txHistoryInfo: {
          title: `AccelerRaytor Deposit`,
          description: `Deposit ${mul(ticketAmount, idoInfo.ticketPrice)} ${idoInfo.baseSymbol}`
        }
      })
    },
    { forceKeyPairs }
  )
}
