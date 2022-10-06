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
  txHistoryInfo?: Pick<TxHistoryInfo, 'title' | 'description'> | undefined
  /** if provided, error notification should respect this config */
  txErrorNotificationDescription?: string | ((error: Error) => string)
  txSuccess?: TxSuccessCallback | undefined
  txError?: TxErrorCallback | undefined
  txFinally?: TxFinallyCallback | undefined
  txSentSuccess?: TxSentSuccessCallback | undefined
  txSentError?: TxSentErrorCallback | undefined
  txSentFinally?: TxSentFinallyCallback | undefined
  txAllSuccess?: AllSuccessCallback | undefined
  txAnyError?: AnyErrorCallback | undefined
}

type MultiTxOptionsCollection = {
  txAllSuccess?: AllSuccessCallback | undefined
  txAnyError?: AnyErrorCallback | undefined
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

export interface AddMultiTxsOptions {
  /**
   * send next when prev is complete (default)
   * send all at once
   */
  sendMode?: 'queue' | 'parallel'
  onTxAllSuccess?: AllSuccessCallback
  onTxAnyError?: AnyErrorCallback
}

export type TransactionQueue = ([transaction: Transaction, singleTxOptions?: AddSingleTxOptions] | Transaction)[]

export type TransactionCollector = {
  add(transaction: Transaction, options?: AddSingleTxOptions): void
  addQueue(transactionQueue: TransactionQueue, multiTxOptions?: AddMultiTxsOptions): void
}

// TODO: should also export addTxSuccessListener() and addTxErrorListener() and addTxFinallyListener()
export type TxResponseInfos = {
  allSuccess: boolean
  txids: string[]
  // errorAt?: number // only if `allSuccess` is false
  // txList: (TxSuccessInfo | TxErrorInfo)[]
}

export type HandleFnOptions = {
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
  options?: HandleFnOptions
): Promise<TxResponseInfos> {
  return new Promise((resolve, reject) =>
    (async () => {
      const {
        transactionCollector,
        collected: { innerTransactions, singleTxOptions, multiTxOptions }
      } = collectOptionsAndTx()

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
          singleOptions: [
            {
              ...singleTxOptions[0],
              txSentFinally: mergeFunction(() => {
                useAppSettings.setState({ isApprovePanelShown: false })
              }, singleTxOptions[0]?.txSentFinally)
            },
            ...singleTxOptions.slice(1)
          ],
          multiOptions: multiTxOptions,
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
        const errorTitle = (singleTxOptions?.[0]?.txHistoryInfo?.title ?? '') + ' Error' // assume first instruction's txHistoryInfo is same as the second one

        const systemErrorDescription = error instanceof Error ? noTailingPeriod(error.message) : String(error)
        const userErrorDescription = shrinkToValue(singleTxOptions?.[0]?.txErrorNotificationDescription, [error]) as
          | string
          | undefined
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

function collectOptionsAndTx() {
  const singleTxOptions = [] as SingleTxOptionsCollection[]
  const multiTxOptions = {} as MultiTxOptionsCollection
  const innerTransactions = [] as Transaction[]

  const add: TransactionCollector['add'] = (transaction, options) => {
    innerTransactions.push(transaction)
    singleTxOptions.push({
      txHistoryInfo: options?.txHistoryInfo,

      txSentSuccess: options?.onTxSentSuccess,
      txSentError: options?.onTxSentError,
      txSentFinally: options?.onTxSentFinally,

      txSuccess: options?.onTxSuccess,
      txError: options?.onTxError,
      txFinally: options?.onTxFinally
    })
  }

  const addQueue: TransactionCollector['addQueue'] = (transactionQueue, options?) => {
    transactionQueue.forEach((transaction) => {
      const [singelTransation, singelOption] = Array.isArray(transaction) ? transaction : ([transaction] as const)
      add(singelTransation, singelOption)
    })
    multiTxOptions.txAllSuccess = options?.onTxAllSuccess
    multiTxOptions.txAnyError = options?.onTxAnyError
  }

  const transactionCollector: TransactionCollector = { add, addQueue }
  return { transactionCollector, collected: { innerTransactions, singleTxOptions, multiTxOptions } }
}

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
async function sendMultiTransactionAndLogAndRecord({
  transactions,
  singleOptions,
  multiOptions,
  payload
}: {
  transactions: Transaction[]
  singleOptions: SingleTxOptionsCollection[]
  multiOptions: MultiTxOptionsCollection
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
        // const allSignedTransactions = await options.payload.signAllTransactions(options.transactions)
        const allSignedTransactions = await (payload.signerkeyPair?.ownerKeypair // if have signer detected, no need signAllTransactions
          ? transactions
          : payload.signAllTransactions(transactions))

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
          const innerSingleOptions: SingleTxOptionsCollection | undefined = singleOptions[currentIndex]
          try {
            const txid = await sendTransactionCore(transaction, payload)
            innerSingleOptions.txSentSuccess?.({ txid, ...extraTxidInfo })
            logTxid(txid, `${innerSingleOptions.txHistoryInfo?.title ?? 'Action'} Transaction Sent`)

            assert(txid, 'something went wrong')

            txids.push(txid)

            subscribeTx(txid, {
              onTxSuccess(callbackParams) {
                logTxid(txid, `${innerSingleOptions.txHistoryInfo?.title ?? 'Action'} Confirmed`, {
                  isSuccess: true
                })
                innerSingleOptions.txSuccess?.({ ...callbackParams, ...extraTxidInfo })
                onSuccess?.()
              },
              onTxError(callbackParams) {
                console.error(callbackParams.error)
                resolve({ allSuccess: false, txids })
                logError(
                  `${innerSingleOptions.txHistoryInfo?.title ?? 'Action'} Failed`
                  // `reason: ${JSON.stringify(callbackParams.error)}` // TEMPly no reason
                )
                innerSingleOptions.txError?.({ ...callbackParams, ...extraTxidInfo })
              },
              onTxFinally(callbackParams) {
                const { addHistoryItem } = useTxHistory.getState()
                innerSingleOptions.txFinally?.({
                  ...callbackParams,
                  ...extraTxidInfo
                })
                addHistoryItem({
                  status: callbackParams.type === 'error' ? 'fail' : callbackParams.type,
                  txid,
                  time: Date.now(),
                  title: innerSingleOptions.txHistoryInfo?.title,
                  description: innerSingleOptions.txHistoryInfo?.description
                })
              }
            })
          } catch (err) {
            console.error(err)
            innerSingleOptions.txSentError?.({ err, ...extraTxidInfo })
          } finally {
            innerSingleOptions.txSentFinally?.()
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

async function sendTransactionCore(
  transaction: Transaction,
  payload: {
    signAllTransactions: WalletStore['signAllTransactions']
    connection: Connection
    // only if have been shadow open
    signerkeyPair?: TxKeypairDetective
    /** if provide, can't send twice */
    txKey?: string
  }
) {
  if (payload.signerkeyPair?.ownerKeypair) {
    // if have signer detected, no need signAllTransactions
    transaction.recentBlockhash = await getRecentBlockhash(payload.connection)
    transaction.feePayer = payload.signerkeyPair.payerKeypair?.publicKey ?? payload.signerkeyPair.ownerKeypair.publicKey

    return payload.connection.sendTransaction(transaction, [
      payload.signerkeyPair.payerKeypair ?? payload.signerkeyPair.ownerKeypair
    ])
  } else {
    const tx = getSerializedTx(transaction, payload.txKey)
    return await payload.connection.sendRawTransaction(tx, {
      skipPreflight: true
    })
  }
}
