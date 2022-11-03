import { Transaction } from '@solana/web3.js'
import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import { MultiTxExtraInfo, TxErrorInfo, TxFinalInfo, TxSuccessInfo } from './handleTx'

export interface SubscribeSignatureCallbacks {
  onTxSuccess?(ev: TxSuccessInfo): void
  onTxError?(ev: TxErrorInfo): void
  onTxFinally?(ev: TxFinalInfo): void
}

export default function subscribeTx({
  txid,
  transaction,
  extraTxidInfo,
  callbacks
}: {
  txid: string
  transaction: Transaction
  extraTxidInfo: MultiTxExtraInfo
  callbacks?: SubscribeSignatureCallbacks
}) {
  const { connection } = useConnection.getState()
  const { logError } = useNotification.getState()
  if (!connection) {
    logError(`no rpc connection`)
    return
  }
  connection.onSignature(
    txid,
    (signatureResult, context) => {
      if (signatureResult.err) {
        callbacks?.onTxError?.({
          txid,
          transaction,
          signatureResult,
          context,
          error: signatureResult.err,
          ...extraTxidInfo
        })
        callbacks?.onTxFinally?.({ txid, transaction, signatureResult, context, type: 'error', ...extraTxidInfo })
      } else {
        callbacks?.onTxSuccess?.({ txid, transaction, signatureResult, context, ...extraTxidInfo })
        callbacks?.onTxFinally?.({
          txid,
          transaction,
          signatureResult,
          context,
          type: 'success',
          ...extraTxidInfo
        })
      }
    },
    'processed'
  )
  connection.getSignatureStatus(txid)
}

// TODO: if transactionSignature is pending over 30 seconds. should check it manually
