import { Spl, WSOL } from '@raydium-io/raydium-sdk'
import { WalletAdapter } from '@solana/wallet-adapter-base'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'

import useConnection from '@/application/connection/useConnection'
import subscribeTx, { SubscribeSignatureCallbacks } from '@/application/txTools/subscribeTx'
import { ITokenAccount } from '@/application/wallet/type'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'

import { Ido, Snapshot } from '../sdk'
import { SdkParsedIdoInfo } from '../type'
import handleMultiTx from '@/application/txTools/handleMultiTx'

export default async function txIdoClaim({
  connection,
  walletAdapter,
  tokenAccounts,

  idoInfo,
  side,
  onTxSuccess: onSuccess,
  onTxError: onError
}: {
  connection: Connection
  walletAdapter: WalletAdapter
  tokenAccounts: ITokenAccount[]

  idoInfo: SdkParsedIdoInfo
  side: 'base' | 'quote'
} & SubscribeSignatureCallbacks) {
  const owner = walletAdapter.publicKey
  if (!owner) return

  if (!idoInfo.base || !idoInfo.quote) return

  const transaction = new Transaction()
  const frontInstructions: TransactionInstruction[] = []
  const endInstructions: TransactionInstruction[] = []

  const signers = [] as any[]

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

    for (const instruction of instructions) {
      frontInstructions.push(instruction)
    }

    endInstructions.push(Spl.makeCloseAccountInstruction({ tokenAccount: newAccount.publicKey, owner, payer: owner }))

    signers.push(newAccount)
  } else {
    if (!tokenAccounts.find((tokenAmount) => tokenAmount.publicKey?.equals(quoteTokenAccount))) {
      frontInstructions.push(
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
    frontInstructions.push(
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

  frontInstructions.push(
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

  for (const instruction of [...frontInstructions, ...endInstructions]) {
    transaction.add(instruction)
  }

  const txid = await walletAdapter.sendTransaction(transaction, connection, { signers, skipPreflight: true })
  subscribeTx(txid, { onTxSuccess: onSuccess, onTxError: onError })
}
