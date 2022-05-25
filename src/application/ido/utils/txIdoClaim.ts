import { Spl, WSOL } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { Ido, Snapshot } from '../sdk'
import { HydratedIdoInfo, SdkIdoInfo } from '../type'
import handleMultiTx, { TxAddOptions, TxShadowOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import { toString } from '@/functions/numberish/toString'

export default async function txIdoClaim(
  options: { idoInfo: HydratedIdoInfo; side: 'base' | 'quote' } & TxAddOptions & TxShadowOptions
) {
  const { idoInfo, side, forceKeyPairs, ...restTxAddOptions } = options
  return handleMultiTx(
    async ({ transactionCollector, baseUtils: { owner, connection, tokenAccounts } }) => {
      if (!idoInfo.base || !idoInfo.quote) return

      const piecesCollection = createTransactionCollector()
      const baseTokenAccount = await Spl.getAssociatedTokenAccount({ mint: idoInfo.base.mint, owner })
      let quoteTokenAccount = await Spl.getAssociatedTokenAccount({ mint: idoInfo.quote.mint, owner })

      // TODO fix
      if (idoInfo.quote.mint.toBase58() === WSOL.mint) {
        const { newAccount, instructions } = await Spl.makeCreateWrappedNativeAccountInstructions({
          connection,
          owner,
          payer: owner,
          amount: 0
        })
        quoteTokenAccount = newAccount.publicKey
        piecesCollection.addInstruction(...instructions)
        piecesCollection.addEndInstruction(
          Spl.makeCloseAccountInstruction({ tokenAccount: newAccount.publicKey, owner, payer: owner })
        )
        piecesCollection.addSigner(newAccount)
      } else {
        if (!tokenAccounts.find((tokenAmount) => tokenAmount.publicKey?.equals(quoteTokenAccount))) {
          piecesCollection.addInstruction(
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
        piecesCollection.addInstruction(
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
        programId: new PublicKey(idoInfo.id),
        owner,
        seedId: new PublicKey(idoInfo.seedId)
      })
      piecesCollection.addInstruction(
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
      transactionCollector.add(await piecesCollection.spawnTransaction(), {
        txHistoryInfo: {
          ...restTxAddOptions,
          title: 'AccelerRaytor Claim',
          description:
            side === 'base'
              ? `Claim ${toString(idoInfo.userAllocation)} ${idoInfo.base.symbol ?? '--'}`
              : `Claim ${idoInfo.ledger?.quoteDeposited} ${idoInfo.quote.symbol ?? '--'}`
        }
      })
    },
    { forceKeyPairs }
  )
}
