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
import produce from 'immer'
import { noTailingPeriod } from '../../functions/format/noTailingPeriod'
import useAppSettings from '../common/useAppSettings'
import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import useTxHistory, { TxHistoryInfo } from '../txHistory/useTxHistory'
import { getRichWalletTokenAccounts } from '../wallet/useTokenAccountsRefresher'
import useWallet, { WalletStore } from '../wallet/useWallet'
import { sendTransactionCore } from './sendTransactionCore'
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
  sendMode?:
    | 'queue'
    | 'parallel(dangerous-without-order)' /* couldn't promise tx's order */
    | 'parallel(batch-txs)' /* it will in order */
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

export type SendTransactionPayload = {
  signAllTransactions: WalletStore['signAllTransactions']
  connection: Connection
  // only if have been shadow open
  signerkeyPair?: TxKeypairDetective
  /** if provide, can't send twice */
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
  const {
    transactionCollector,
    collected: { innerTransactions, singleTxOptions, multiTxOptions }
  } = collectTxOptions()
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
    const finalInfos = await sendMultiTransaction({
      transactions: innerTransactions,
      singleOptionss: produce(singleTxOptions, (d) => {
        const firstOption = d[0]
        if (firstOption) {
          firstOption.onTxSentFinally = mergeFunction(() => {
            useAppSettings.setState({ isApprovePanelShown: false })
          }, firstOption.onTxSentFinally)
        }
      }),
      multiOptions: multiTxOptions,
      payload: {
        connection,
        signAllTransactions,
        signerkeyPair: options?.forceKeyPairs,
        txKey: options?.txKey
      }
    })
    useAppSettings.setState({ isApprovePanelShown: false })
    return finalInfos
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
    useAppSettings.setState({ isApprovePanelShown: false })
    return {
      allSuccess: false,
      txids: []
    }
  }
}

const txSerializeCache = new Map<string, Buffer>()

function collectTxOptions() {
  const singleTxOptions = [] as AddSingleTxOptions[]
  const multiTxOptions = {} as AddMultiTxsOptions
  const innerTransactions = [] as Transaction[]
  const add: TransactionCollector['add'] = (transaction, options) => {
    innerTransactions.push(transaction)
    singleTxOptions.push(options ?? {})
  }
  const addQueue: TransactionCollector['addQueue'] = (transactionQueue, options?) => {
    transactionQueue.forEach((transaction) => {
      const [singelTransation, singelOption] = Array.isArray(transaction) ? transaction : ([transaction] as const)
      add(singelTransation, singelOption)
    })
    Object.assign(multiTxOptions, options)
  }
  const transactionCollector: TransactionCollector = { add, addQueue }
  return { transactionCollector, collected: { innerTransactions, singleTxOptions, multiTxOptions } }
}

export function getSerializedTx(transaction: Transaction, key?: string) {
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
 *
 * so this fn will record txids
 */
async function sendMultiTransaction({
  transactions,
  singleOptionss,
  multiOptions,
  payload
}: {
  transactions: Transaction[]
  singleOptionss: AddSingleTxOptions[]
  multiOptions: AddMultiTxsOptions
  payload: SendTransactionPayload
}): Promise<TxResponseInfos> {
  return new Promise((resolve, reject) =>
    (async () => {
      try {
        // const allSignedTransactions = await options.payload.signAllTransactions(options.transactions)
        const allSignedTransactions = await (payload.signerkeyPair?.ownerKeypair // if have signer detected, no need signAllTransactions
          ? transactions
          : payload.signAllTransactions(transactions))
        // eslint-disable-next-line no-inner-declarations

        const combined = combinedMultiTransaction({
          transactions: allSignedTransactions,
          multiOptions: produce(multiOptions, (multiOptions) => {
            multiOptions.onTxAllSuccess = mergeFunction(
              (({ txids }) => {
                resolve({ allSuccess: true, txids })
              }) as AllSuccessCallback,
              multiOptions.onTxAllSuccess
            )
            multiOptions.onTxAnyError = mergeFunction(
              (({ txids }) => {
                resolve({ allSuccess: false, txids })
              }) as AnyErrorCallback,
              multiOptions.onTxAnyError
            )
          }),
          singleOptionss,
          payload
        })
        // invoke transaction
        combined()
      } catch (err) {
        reject(err)
      }
    })()
  )
}

function combinedMultiTransaction({
  transactions,
  multiOptions,
  singleOptionss,
  payload
}: {
  transactions: Transaction[]
  multiOptions: AddMultiTxsOptions
  singleOptionss: AddSingleTxOptions[]
  payload: SendTransactionPayload
}): () => void {
  const txids = [] as string[]

  if (
    multiOptions.sendMode === 'parallel(dangerous-without-order)' ||
    multiOptions.sendMode === 'parallel(batch-txs)'
  ) {
    const successTxids = [] as typeof txids
    const pushSuccessTxid = (txid: string) => {
      successTxids.push(txid)
      if (successTxids.length === txids.length) {
        multiOptions.onTxAllSuccess?.({ txids })
      }
    }
    const parallelled = () => {
      transactions.forEach((tx, idx) =>
        sendOneTransactionWithLogWithRecord({
          transaction: tx,
          allTransactions: transactions,
          payload,
          isBatched: multiOptions.sendMode === 'parallel(batch-txs)',
          singleOptions: produce(singleOptionss[idx], (draft) => {
            draft.onTxSentSuccess = mergeFunction(
              (({ txid }) => {
                txids.push(txid)
              }) as TxSentSuccessCallback,
              draft.onTxSentSuccess
            )
            draft.onTxError = mergeFunction(
              (() => {
                multiOptions.onTxAnyError?.({ txids })
              }) as TxErrorCallback,
              draft.onTxError
            )
            draft.onTxSuccess = mergeFunction(
              (({ txid }) => {
                pushSuccessTxid(txid)
              }) as TxSuccessCallback,
              draft.onTxSuccess
            )
          })
        })
      )
    }
    return parallelled
  } else {
    const queued = transactions.reduceRight(
      (acc, tx, idx) => () =>
        sendOneTransactionWithLogWithRecord({
          transaction: tx,
          allTransactions: transactions,
          payload,
          singleOptions: produce(singleOptionss[idx], (draft) => {
            draft.onTxSentSuccess = mergeFunction(
              (({ txid }) => {
                txids.push(txid)
              }) as TxSentSuccessCallback,
              draft.onTxSentSuccess
            )
            draft.onTxSuccess = mergeFunction(acc as TxSentSuccessCallback, draft.onTxSuccess)
            draft.onTxError = mergeFunction(
              (() => {
                multiOptions.onTxAnyError?.({ txids })
              }) as TxErrorCallback,
              draft.onTxError
            )
          })
        }),
      () => {
        multiOptions.onTxAllSuccess?.({ txids })
      }
    )
    return queued
  }
}

/**
 * duty:
 * 1. provide txid and txCallback collectors for a tx action
 * 2. record tx to recentTxHistory
 *
 */
async function sendOneTransactionWithLogWithRecord({
  transaction,
  allTransactions = [transaction],
  singleOptions,
  payload,
  isBatched
}: {
  transaction: Transaction
  allTransactions?: Transaction[]
  singleOptions?: AddSingleTxOptions
  payload: SendTransactionPayload
  isBatched?: boolean
}) {
  const { logError, logTxid } = useNotification.getState()
  const extraTxidInfo: MultiTxExtraInfo = {
    multiTransaction: true,
    multiTransactionLength: allTransactions.length,
    currentIndex: allTransactions.indexOf(transaction)
  }
  try {
    const txid = await sendTransactionCore(
      transaction,
      payload,
      isBatched ? { totalLength: allTransactions.length } : undefined
    )
    singleOptions?.onTxSentSuccess?.({ txid, ...extraTxidInfo })
    logTxid(txid, `${singleOptions?.txHistoryInfo?.title ?? 'Action'} Transaction Sent`)
    assert(txid, 'something went wrong')
    subscribeTx(txid, {
      onTxSuccess(callbackParams) {
        logTxid(txid, `${singleOptions?.txHistoryInfo?.title ?? 'Action'} Confirmed`, {
          isSuccess: true
        })
        singleOptions?.onTxSuccess?.({ ...callbackParams, ...extraTxidInfo })
      },
      onTxError(callbackParams) {
        console.error('tx error: ', callbackParams.error)
        logError(
          `${singleOptions?.txHistoryInfo?.title ?? 'Action'} Failed`
          // `reason: ${JSON.stringify(callbackParams.error)}` // TEMPly no reason
        )
        singleOptions?.onTxError?.({ ...callbackParams, ...extraTxidInfo })
      },
      onTxFinally(callbackParams) {
        singleOptions?.onTxFinally?.({
          ...callbackParams,
          ...extraTxidInfo
        })
        const { addHistoryItem } = useTxHistory.getState()
        addHistoryItem({
          status: callbackParams.type === 'error' ? 'fail' : callbackParams.type,
          txid,
          time: Date.now(),
          title: singleOptions?.txHistoryInfo?.title,
          description: singleOptions?.txHistoryInfo?.description
        })
      }
    })
  } catch (err) {
    console.error('fail to send tx: ', err)
    singleOptions?.onTxSentError?.({ err, ...extraTxidInfo })
  } finally {
    singleOptions?.onTxSentFinally?.()
  }
}
