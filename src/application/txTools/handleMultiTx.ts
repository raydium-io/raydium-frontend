import { addItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { mergeFunction } from '@/functions/merge'
import { shrinkToValue } from '@/functions/shrinkToValue'
import {
  Connection,
  Context,
  Keypair,
  PublicKey,
  SignatureResult,
  Transaction,
  TransactionError
} from '@solana/web3.js'
import { noTailingPeriod } from '../../functions/format/noTailingPeriod'
import useAppSettings from '../appSettings/useAppSettings'
import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import useTxHistory, { TxHistoryInfo } from '../txHistory/useTxHistory'
import { getRichWalletTokenAccounts } from '../wallet/useTokenAccountsRefresher'
import useWallet, { WalletStore } from '../wallet/useWallet'
import { getRecentBlockhash } from './attachRecentBlockhash'
import subscribeTx from './subscribeTx'

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
    connection: Connection
    owner: PublicKey
    tokenAccounts: WalletStore['tokenAccounts']
    allTokenAccounts: WalletStore['allTokenAccounts']
  }
}) => void
//#region ------------------- callbacks -------------------
type TxSuccessCallback = (info: TxSuccessInfo & MultiTxExtraInfo) => void
type TxErrorCallback = (info: TxErrorInfo & MultiTxExtraInfo) => void
type TxFinallyCallback = (info: TxFinalInfo & MultiTxExtraInfo) => void
type TxSentSuccessCallback = (info: TxSentSuccessInfo & MultiTxExtraInfo) => void
type TxSentErrorCallback = (info: TxSentErrorInfo & MultiTxExtraInfo) => void
type TxSentFinallyCallback = () => void

type AllSuccessCallback = (info: { txids: string[] }) => void
type AnyErrorCallback = (info: { txids: string[] /* error at last txids */ }) => void
type TxKeypairDetective = {
  ownerKeypair: Keypair
  payerKeypair?: Keypair
}

//#endregion

type SingleTxOptionsCollection = {
  txHistoryInfo?: (Pick<TxHistoryInfo, 'title' | 'description'> | undefined)[]
  /** if provided, error notification should respect this config */
  txErrorNotificationDescription?: (string | ((error: Error) => string))[]
  txSuccess?: (TxSuccessCallback | undefined)[]
  txError?: (TxErrorCallback | undefined)[]
  txFinally?: (TxFinallyCallback | undefined)[]
  txSentSuccess?: (TxSentSuccessCallback | undefined)[]
  txSentError?: (TxSentErrorCallback | undefined)[]
  txSentFinally?: (TxSentFinallyCallback | undefined)[]
  txAllSuccess?: (AllSuccessCallback | undefined)[]
  txAnyError?: (AnyErrorCallback | undefined)[]
}

type MultiTxOptionsCollection = {
  txAllSuccess?: (AllSuccessCallback | undefined)[]
  txAnyError?: (AnyErrorCallback | undefined)[]
}

export interface AddSingleTxOptions {
  txHistoryInfo?: Pick<TxHistoryInfo, 'title' | 'description'>
  /** if provided, error notification should respect this config */
  txErrorNotificationDescription?: string | ((error: Error) => string)
  onTxSuccess?: TxSuccessCallback
  onTxError?: TxErrorCallback
  onTxFinally?: TxFinallyCallback
  onTxSentSuccess?: TxSentSuccessCallback
  onTxSentError?: TxSentErrorCallback
  onTxSentFinally?: TxSentFinallyCallback
}

export interface AddQueueTxsOptions {
  onTxAllSuccess?: AllSuccessCallback
  onTxAnyError?: AnyErrorCallback
}

export type TransactionQueue = ([transaction: Transaction, singleTxOptions?: AddSingleTxOptions] | Transaction)[]

export type TransactionCollector = {
  add(transaction: Transaction, options?: AddSingleTxOptions): void
  addQueue(transactionQueue: TransactionQueue, multiTxOptions?: AddQueueTxsOptions): void
}

// TODO: should also export addTxSuccessListener() and addTxErrorListener() and addTxFinallyListener()
export type TxResponseInfos = {
  allSuccess: boolean
  txids: string[]
  // errorAt?: number // only if `allSuccess` is false
  // txList: (TxSuccessInfo | TxErrorInfo)[]
}

export type HandleMultiTxOptions = {
  /** if add this, handleTx's shadow mode will open,  */
  forceKeyPairs?: TxKeypairDetective
  /**
   * same key will success only once
   */
  txKey?: string
}

/**
 * duty:
 * 1. provide tools for a tx action
 * 2. auto handle txError and txSuccess
 */
export default async function handleMultiTx(
  txAction: MultiTxAction,
  options?: HandleMultiTxOptions
): Promise<TxResponseInfos> {
  return new Promise((resolve, reject) =>
    (async () => {
      const singleTxOptionCollection = {} as SingleTxOptionsCollection
      const multiTxOptionCollection = {} as MultiTxOptionsCollection

      const innerTransactions = [] as Transaction[]
      const transactionCollector: TransactionCollector = {
        add(transaction, options) {
          innerTransactions.push(transaction)
          singleTxOptionCollection.txHistoryInfo = addItem(
            singleTxOptionCollection.txHistoryInfo ?? [],
            options?.txHistoryInfo
          )
          singleTxOptionCollection.txSuccess = addItem(singleTxOptionCollection.txSuccess ?? [], options?.onTxSuccess)
          singleTxOptionCollection.txError = addItem(singleTxOptionCollection.txError ?? [], options?.onTxError)
          singleTxOptionCollection.txFinally = addItem(singleTxOptionCollection.txFinally ?? [], options?.onTxFinally)
          singleTxOptionCollection.txSentSuccess = addItem(
            singleTxOptionCollection.txSentSuccess ?? [],
            options?.onTxSentSuccess
          )
          singleTxOptionCollection.txSentError = addItem(
            singleTxOptionCollection.txSentError ?? [],
            options?.onTxSentError
          )
          singleTxOptionCollection.txSentFinally = addItem(
            singleTxOptionCollection.txSentFinally ?? [],
            options?.onTxSentFinally
          )
        },
        addQueue(transactionQueue, multiTxOptions?) {
          transactionQueue.forEach((transaction) => {
            const [singelTransation, singelOption] = Array.isArray(transaction) ? transaction : ([transaction] as const)
            this.add(singelTransation, singelOption)
          })
          multiTxOptionCollection.txAllSuccess = addItem(
            multiTxOptionCollection.txAllSuccess ?? [],
            multiTxOptions?.onTxAllSuccess
          )
          multiTxOptionCollection.txAnyError = addItem(
            multiTxOptionCollection.txAnyError ?? [],
            multiTxOptions?.onTxAnyError
          )
        }
      }

      useAppSettings.setState({ isApprovePanelShown: true })

      try {
        const { signAllTransactions, owner } = useWallet.getState()
        const connection = useConnection.getState().connection
        assert(connection, 'no rpc connection')
        if (options?.forceKeyPairs?.ownerKeypair) {
          // have force key pair info, no need to check wallet connect
          const shadowWalletOwner = options.forceKeyPairs.ownerKeypair.publicKey
          const tokenAccountInfos = await getRichWalletTokenAccounts({ owner: shadowWalletOwner, connection })
          await txAction({
            transactionCollector,
            baseUtils: { connection, owner: shadowWalletOwner, ...tokenAccountInfos }
          })
        } else {
          const { tokenAccounts, allTokenAccounts } = useWallet.getState()
          assert(owner, 'Wallet not connected')
          await txAction({
            transactionCollector,
            baseUtils: { connection, owner, tokenAccounts, allTokenAccounts }
          })
        }
        // eslint-disable-next-line no-console
        console.info('tx transactions: ', toHumanReadable(innerTransactions))
        const finalInfos = await sendMultiTransactionAndLogAndRecord({
          transactions: innerTransactions,
          txHistoryInfo: singleTxOptionCollection.txHistoryInfo,
          optionsCollection: {
            ...singleTxOptionCollection,
            txSentFinally: [
              mergeFunction(() => {
                useAppSettings.setState({ isApprovePanelShown: false })
              }, singleTxOptionCollection.txSentFinally?.[0]),
              ...(singleTxOptionCollection.txSentFinally?.slice(1) ?? [])
            ]
          },
          payload: {
            connection,
            signAllTransactions,
            signerkeyPair: options?.forceKeyPairs,
            txKey: options?.txKey
          }
        })
        resolve(finalInfos)
      } catch (error) {
        const { logError } = useNotification.getState()
        console.warn(error)
        const errorTitle = (singleTxOptionCollection.txHistoryInfo?.[0]?.title ?? '') + ' Error' // assume first instruction's txHistoryInfo is same as the second one

        const systemErrorDescription = error instanceof Error ? noTailingPeriod(error.message) : String(error)
        const userErrorDescription = shrinkToValue(singleTxOptionCollection.txErrorNotificationDescription?.[0], [
          error
        ]) as string | undefined
        const errorDescription = userErrorDescription || systemErrorDescription

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

const txSerializeCache = new Map<string, Buffer>()

function getSerializedTx(transaction: Transaction, key?: string) {
  if (key && txSerializeCache.has(key)) {
    return txSerializeCache.get(key)!
  } else {
    const serialized = transaction.serialize()
    if (key) txSerializeCache.set(key, serialized)
    return serialized
  }
}
/**
 * duty:
 * 1. provide txid and txCallback collectors for a tx action
 * 2. record tx to recentTxHistory
 */
async function sendMultiTransactionAndLogAndRecord(options: {
  transactions: Transaction[]
  txHistoryInfo?: (Pick<TxHistoryInfo, 'title' | 'description'> | undefined)[]
  optionsCollection: SingleTxOptionsCollection
  payload: {
    signAllTransactions: WalletStore['signAllTransactions']
    connection: Connection
    // only if have been shadow open
    signerkeyPair?: TxKeypairDetective
    /** if provide, can't send twice */
    txKey?: string
  }
}): Promise<TxResponseInfos> {
  const { logError, logTxid } = useNotification.getState()
  return new Promise((resolve, reject) =>
    (async () => {
      try {
        const txCallbackCollection = options.optionsCollection
        // const allSignedTransactions = await options.payload.signAllTransactions(options.transactions)
        const allSignedTransactions = await (options.payload.signerkeyPair?.ownerKeypair // if have signer detected, no need signAllTransactions
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
          const transaction = allSignedTransactions[currentIndex]
          try {
            const txid = await (async () => {
              if (options.payload.signerkeyPair?.ownerKeypair) {
                // if have signer detected, no need signAllTransactions
                transaction.recentBlockhash = await getRecentBlockhash(options.payload.connection)
                transaction.feePayer =
                  options.payload.signerkeyPair.payerKeypair?.publicKey ??
                  options.payload.signerkeyPair.ownerKeypair.publicKey

                return options.payload.connection.sendTransaction(transaction, [
                  options.payload.signerkeyPair.payerKeypair ?? options.payload.signerkeyPair.ownerKeypair
                ])
              } else {
                const tx = getSerializedTx(transaction, options.payload.txKey)
                return await options.payload.connection.sendRawTransaction(tx, {
                  skipPreflight: true
                })
              }
            })()
            txCallbackCollection.txSentSuccess?.[currentIndex]?.({
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
                txCallbackCollection.txSuccess?.[currentIndex]?.({
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
                txCallbackCollection.txError?.[currentIndex]?.({
                  ...callbackParams,
                  ...extraTxidInfo
                })
              },
              onTxFinally(callbackParams) {
                const { addHistoryItem } = useTxHistory.getState()
                txCallbackCollection.txFinally?.[currentIndex]?.({
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
            txCallbackCollection.txSentError?.[currentIndex]?.({ err, ...extraTxidInfo })
          } finally {
            txCallbackCollection.txSentFinally?.[currentIndex]?.()
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
