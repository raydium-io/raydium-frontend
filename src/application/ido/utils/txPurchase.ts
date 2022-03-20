import { Spl, WSOL } from '@raydium-io/raydium-sdk'
import { WalletAdapter } from '@solana/wallet-adapter-base'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'

import BN from 'bn.js'

import useConnection from '@/application/connection/useConnection'
import subscribeTx, { SubscribeSignatureCallbacks } from '@/application/txTools/subscribeTx'
import { ITokenAccount } from '@/application/wallet/type'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'

import { Ido, Snapshot } from '../sdk'
import { SdkParsedIdoInfo } from '../type'

export default async function purchase({
  connection,
  tokenAccounts,
  walletAdapter,

  idoInfo,
  amount,
  onSend,
  onTxSuccess: onSuccess,
  onTxError: onError
}: {
  connection: Connection
  tokenAccounts: ITokenAccount[]
  walletAdapter: WalletAdapter

  idoInfo: SdkParsedIdoInfo
  amount: BN
  onSend?: (ev: { txid: string }) => void
} & SubscribeSignatureCallbacks): Promise<void> /*! Old, should return txid result */ {
  if (!idoInfo.base || !idoInfo.quote) return
  const owner = walletAdapter.publicKey
  if (!owner) return
  const transaction = new Transaction()
  const frontInstructions: TransactionInstruction[] = []
  const endInstructions: TransactionInstruction[] = []

  const lamports = idoInfo.state.perLotteryQuoteAmount.mul(amount)
  const signers = [] as any[]

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
    programId: new PublicKey(idoInfo.snapshotProgramId),
    owner,
    seedId: new PublicKey(idoInfo.seedId)
  })

  frontInstructions.push(
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
      amount: amount
    })
  )

  for (const instruction of [...frontInstructions, ...endInstructions]) {
    transaction.add(instruction)
  }

  try {
    const txid = await walletAdapter.sendTransaction(transaction, connection, { signers, skipPreflight: true })
    onSend?.({ txid })
    try {
      subscribeTx(txid, { onTxSuccess: onSuccess, onTxError: onError })
      // eslint-disable-next-line no-empty
    } catch {}
  } catch (err) {
    // onError?.({ err: err as Error })
  }
}
