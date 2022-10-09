import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import { TxErrorInfo, TxFinalInfo, TxSuccessInfo } from './handleTx'

export interface SubscribeSignatureCallbacks {
  onTxSuccess?(ev: TxSuccessInfo): void
  onTxError?(ev: TxErrorInfo): void
  onTxFinally?(ev: TxFinalInfo): void
}

export default function subscribeTx(txid: string, callbacks?: SubscribeSignatureCallbacks) {
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
        callbacks?.onTxError?.({ txid: txid, signatureResult, context, error: signatureResult.err })
        callbacks?.onTxFinally?.({ txid: txid, signatureResult, context, type: 'error' })
      } else {
        callbacks?.onTxSuccess?.({ txid: txid, signatureResult, context })
        callbacks?.onTxFinally?.({ txid: txid, signatureResult, context, type: 'success' })
      }
    },
    'processed'
  )
  connection.getSignatureStatus(txid)
}

// TODO: if transactionSignature is pending over 30 seconds. should check it manually
