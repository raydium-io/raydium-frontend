import { WalletAdapter } from '@solana/wallet-adapter-base'
import {
  Connection,
  Context,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SignatureResult,
  Transaction,
  TransactionError
} from '@solana/web3.js'

import assert from '@/functions/assert'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import useTxHistory, { TxHistoryInfo } from '../txHistory/useTxHistory'
import useWallet, { WalletStore } from '../wallet/useWallet'

import subscribeTx from './subscribeTx'
import { noTailingPeriod } from '../../functions/format/noTailingPeriod'
import useAppSettings from '../appSettings/useAppSettings'
import { mergeFunction } from '@/functions/merge'

//#region ------------------- basic info -------------------
export type TxInfo = {
  txid: string
}

export type MultiTxExtraInfo = {
  multiTransaction: true // in multi transactions
  currentIndex: number // in multi transactions
  multiTransactionLength: number // in transactions
}
//#endregion

//#region ------------------- lifeTime info -------------------
export type TxSuccessInfo = {
  txid: string
  signatureResult: SignatureResult
  context: Context
} & (TxInfo | (TxInfo & MultiTxExtraInfo))
export type TxSentSuccessInfo = TxInfo | (TxInfo & MultiTxExtraInfo)
export type TxFinalBatchSuccessInfo = {
  allSuccess: true
  txids: string[]
}

export type TxErrorInfo = {
  txid: string
  signatureResult: SignatureResult
  context: Context
  error?: TransactionError
}
export type TxSentErrorInfo = {
  err: unknown
}

export type TxFinalInfo =
  | ({
      type: 'success'
    } & TxSuccessInfo)
  | ({
      type: 'error'
    } & TxErrorInfo)
export type TxFinalBatchErrorInfo = {
  allSuccess: false
  errorAt: number
  txids: string[] // before absort
}

//#endregion

export type MultiTxAction = (providedTools: {
  transactionCollector: TransactionCollector
  baseUtils: {
    walletAdapter: WalletAdapter
    connection: Connection
    owner: PublicKey
  }
}) => void
//#region ------------------- callbacks -------------------
type TxSuccessCallback = (info: TxSuccessInfo & MultiTxExtraInfo) => void
type TxErrorCallback = (info: TxErrorInfo & MultiTxExtraInfo) => void
type TxFinallyCallback = (info: TxFinalInfo & MultiTxExtraInfo) => void
type TxSentSuccessCallback = (info: TxSentSuccessInfo & MultiTxExtraInfo) => void
type TxSentErrorCallback = (info: TxSentErrorInfo & MultiTxExtraInfo) => void
type TxSentFinallyCallback = () => // info: (
//   | ({
//       type: 'success'
//     } & TxSentSuccessInfo)
//   | ({
//       type: 'error'
//     } & TxSentErrorInfo)
// ) &
//   MultiTxExtraInfo
void

type AllSuccessCallback = (info: { txids: string[] }) => void
type AnyErrorCallback = (info: { txids: string[] /* error at last txids */ }) => void
type TxKeypairDetective = {
  ownerKeypair: Keypair
  payerKeypair?: Keypair
}

//#endregion

type TxOptionsCollection = {
  txHistoryInfo: (Pick<TxHistoryInfo, 'title' | 'description'> | undefined)[]
  txSuccess: (TxSuccessCallback | undefined)[]
  txError: (TxErrorCallback | undefined)[]
  txFinally: (TxFinallyCallback | undefined)[]
  txSentSuccess: (TxSentSuccessCallback | undefined)[]
  txSentError: (TxSentErrorCallback | undefined)[]
  txSentFinally: (TxSentFinallyCallback | undefined)[]
  txAllSuccess: (AllSuccessCallback | undefined)[]
  txAnyError: (AnyErrorCallback | undefined)[]
  signerkeyPairs: (TxKeypairDetective | undefined)[]
}

export type TransactionCollector = {
  /**@deprecated for can't control */
  addSets(...transactions: Transaction[]): void

  add(
    transactions: Transaction,
    options?: {
      txHistoryInfo?: Pick<TxHistoryInfo, 'title' | 'description'>
      onTxSuccess?: TxSuccessCallback
      onTxError?: TxErrorCallback
      onTxFinally?: TxFinallyCallback
      onTxSentSuccess?: TxSentSuccessCallback
      onTxSentError?: TxSentErrorCallback
      onTxSentFinally?: TxSentFinallyCallback
      signerkeyPairs?: TxKeypairDetective
    }
  ): void
}

type FinalInfos = {
  allSuccess: boolean
  txids: string[]
  // errorAt?: number // only if `allSuccess` is false
  // txList: (TxSuccessInfo | TxErrorInfo)[]
}

/**
 * duty:
 * 1. provide tools for a tx action
 * 2. auto handle txError and txSuccess
 */
export default async function handleMultiTx(txAction: MultiTxAction): Promise<FinalInfos> {
  return new Promise((resolve, reject) =>
    (async () => {
      const callbackCollection: TxOptionsCollection = {
        txHistoryInfo: [],
        txSuccess: [],
        txError: [],
        txFinally: [],
        txSentSuccess: [],
        txSentError: [],
        txSentFinally: [],
        txAllSuccess: [],
        txAnyError: [],
        signerkeyPairs: []
      }

      const innerTransactions = [] as Transaction[]
      const transactionCollector: TransactionCollector = {
        addSets(...transactions) {
          innerTransactions.push(...transactions)
        },
        add(transaction, options) {
          innerTransactions.push(transaction)
          callbackCollection.txHistoryInfo.push(options?.txHistoryInfo)
          callbackCollection.txSuccess.push(options?.onTxSuccess)
          callbackCollection.txError.push(options?.onTxError)
          callbackCollection.txFinally.push(options?.onTxFinally)
          callbackCollection.txSentSuccess.push(options?.onTxSentSuccess)
          callbackCollection.txSentError.push(options?.onTxSentError)
          callbackCollection.txSentFinally.push(options?.onTxSentFinally)
        }
      }

      useAppSettings.setState({ isApprovePanelShown: true })
      try {
        const { adapter: walletAdapter, signAllTransactions, owner } = useWallet.getState()
        const connection = useConnection.getState().connection
        assert(walletAdapter, 'wallet not connected')
        assert(owner, 'wallet not connected')
        assert(connection, 'no rpc connection')
        await txAction({
          transactionCollector,
          baseUtils: { walletAdapter, connection, owner }
        })
        const finalInfos = await sendMultiTransactionAndLogAndRecord({
          transactions: innerTransactions,
          txHistoryInfo: callbackCollection.txHistoryInfo,
          optionsCollection: {
            ...callbackCollection,
            txSentFinally: [
              mergeFunction(() => {
                useAppSettings.setState({ isApprovePanelShown: false })
              }, callbackCollection.txSentFinally[0]),
              ...callbackCollection.txSentFinally.slice(1)
            ]
          },
          payload: {
            connection,
            signAllTransactions
          }
        })
        resolve(finalInfos)
      } catch (error) {
        const { logError } = useNotification.getState()
        console.warn(error)
        const errorTitle = (callbackCollection.txHistoryInfo?.[0]?.title ?? '') + ' Error'
        const errorDescription = error instanceof Error ? noTailingPeriod(error.message) : String(error)
        logError(errorTitle, errorDescription)
        resolve({
          allSuccess: false,
          txids: []
        })
      } finally {
        useAppSettings.setState({ isApprovePanelShown: false })
      }
    })()
  )
}

/**
 * duty:
 * 1. provide txid and txCallback collectors for a tx action
 * 2. record tx to recentTxHistory
 */
async function sendMultiTransactionAndLogAndRecord(options: {
  transactions: Transaction[]
  txHistoryInfo?: (Pick<TxHistoryInfo, 'title' | 'description'> | undefined)[]
  optionsCollection: TxOptionsCollection
  payload: {
    signAllTransactions: WalletStore['signAllTransactions']
    connection: Connection
  }
}): Promise<FinalInfos> {
  const { logError, logTxid } = useNotification.getState()
  return new Promise((resolve, reject) =>
    (async () => {
      try {
        const txCallbackCollection = options.optionsCollection
        // const allSignedTransactions = await options.payload.signAllTransactions(options.transactions)
        const allSignedTransactions = await (options.optionsCollection.signerkeyPairs[0] // if have signer detected, no need signAllTransactions
          ? options.transactions
          : options.payload.signAllTransactions(options.transactions))

        const txids = [] as string[]

        // eslint-disable-next-line no-inner-declarations
        async function sendOneTransaction({
          currentIndex = 0,
          onSuccess = () => {}
        }: {
          currentIndex: number
          onSuccess: () => void
        }) {
          const extraTxidInfo: MultiTxExtraInfo = {
            multiTransaction: true,
            multiTransactionLength: allSignedTransactions.length,
            currentIndex: currentIndex
          } as const
          try {
            const txid = options.optionsCollection.signerkeyPairs[currentIndex] // if have signer detected, no need signAllTransactions
              ? await sendAndConfirmTransaction(
                  options.payload.connection,
                  allSignedTransactions[currentIndex],
                  [
                    options.optionsCollection.signerkeyPairs[currentIndex]!.payerKeypair ??
                      options.optionsCollection.signerkeyPairs[currentIndex]!.ownerKeypair,
                    options.optionsCollection.signerkeyPairs[currentIndex]!.ownerKeypair
                  ] // <-- If you made the keypair, you probably want it here!
                )
              : await options.payload.connection.sendRawTransaction(allSignedTransactions[currentIndex].serialize(), {
                  skipPreflight: true
                })

            txCallbackCollection.txSentSuccess[currentIndex]?.({
              ...extraTxidInfo,
              txid
            })
            logTxid(txid, `${options.txHistoryInfo?.[currentIndex]?.title ?? 'Action'} Transaction Sent`)

            assert(txid, 'something went wrong')

            txids.push(txid)

            subscribeTx(txid, {
              onTxSuccess(callbackParams) {
                logTxid(txid, `${options.txHistoryInfo?.[currentIndex]?.title ?? 'Action'} Confirmed`, {
                  isSuccess: true
                })
                txCallbackCollection.txSuccess[currentIndex]?.({
                  ...callbackParams,
                  ...extraTxidInfo
                })
                onSuccess?.()
              },
              onTxError(callbackParams) {
                console.error(callbackParams.error)
                resolve({ allSuccess: false, txids })
                logError(
                  `${options.txHistoryInfo?.[currentIndex]?.title ?? 'Action'} Failed`
                  // `reason: ${JSON.stringify(callbackParams.error)}` // TEMPly no reason
                )
                txCallbackCollection.txError[currentIndex]?.({
                  ...callbackParams,
                  ...extraTxidInfo
                })
              },
              onTxFinally(callbackParams) {
                const { addHistoryItem } = useTxHistory.getState()
                txCallbackCollection.txFinally[currentIndex]?.({
                  ...callbackParams,
                  ...extraTxidInfo
                })
                addHistoryItem({
                  status: callbackParams.type === 'error' ? 'fail' : callbackParams.type,
                  txid,
                  time: Date.now(),
                  title: txCallbackCollection.txHistoryInfo?.[currentIndex]?.title,
                  description: txCallbackCollection.txHistoryInfo?.[currentIndex]?.description
                })
              }
            })
          } catch (err) {
            console.error(err)
            txCallbackCollection.txSentError[currentIndex]?.({ err, ...extraTxidInfo })
          } finally {
            txCallbackCollection.txSentFinally[currentIndex]?.()
          }
        }
        const invokeList = Array.from({ length: allSignedTransactions.length }, () => undefined).reduceRight(
          (acc, _i, idx) => () => sendOneTransaction({ onSuccess: acc, currentIndex: idx }),
          () => {
            resolve({ allSuccess: true, txids })
          }
        )
        // start to send message
        invokeList()
      } catch (err) {
        reject(err)
      }
    })()
  )
}
