import { CacheLTA, InnerSimpleTransaction, TxVersion } from '@raydium-io/raydium-sdk'
import {
  Connection, Context, Keypair, PublicKey, SignaturePubkeyPair, SignatureResult, Transaction, TransactionError,
  VersionedTransaction
} from '@solana/web3.js'

import { produce } from 'immer'

import { TxNotificationItemInfo } from '@/components/NotificationItem/type'
import assert from '@/functions/assert'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { isArray, isObject } from '@/functions/judgers/dateType'
import { mergeFunction, mergeObject } from '@/functions/merge'
import { shrinkToValue } from '@/functions/shrinkToValue'
import tryCatch from '@/functions/tryCatch'
import { MayPromise } from '@/types/constants'

import { noTailingPeriod } from '../../../functions/format/noTailingPeriod'
import useAppSettings from '../../common/useAppSettings'
import useConnection from '../../connection/useConnection'
import useNotification from '../../notification/useNotification'
import useTxHistory, { TxHistoryInfo } from '../../txHistory/useTxHistory'
import { getRichWalletTokenAccounts } from '../../wallet/useTokenAccountsRefresher'
import useWallet, { WalletStore } from '../../wallet/useWallet'

import { buildTransactionsFromSDKInnerTransactions } from './createVersionedTransaction'
import { sendTransactionCore } from './sendTransactionCore'
import subscribeTx from './subscribeTx'

//#region ------------------- basic info -------------------
export type TxInfo = {
  txid: string
  transaction: Transaction | VersionedTransaction
}

export type MultiTxExtraInfo = {
  isMulti: boolean
  /** only used in multi mode */
  transactions: (Transaction | VersionedTransaction)[]
  /** only used in multi mode */
  passedMultiTxid: string[]
  /** only used in multi mode */
  currentIndex: number // in multi transactions
  /** only used in multi mode */
  multiTransactionLength: number // in transactions
}
//#endregion

//#region ------------------- lifeTime info -------------------
export type TxSuccessInfo = {
  signatureResult: SignatureResult
  context: Context
} & (TxInfo & MultiTxExtraInfo)

export type TxSentSuccessInfo = TxInfo & MultiTxExtraInfo

export type TxFinalBatchSuccessInfo = {
  allSuccess: true
  txids: string[]
}

export type TxErrorInfo = {
  signatureResult: SignatureResult
  context: Context
  error?: TransactionError
} & (TxInfo & MultiTxExtraInfo)

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

export type TxFn = (providedTools: {
  transactionCollector: TransactionCollector
  baseUtils: {
    connection: Connection
    owner: PublicKey
    tokenAccounts: WalletStore['tokenAccounts']
    allTokenAccounts: WalletStore['allTokenAccounts']
  }
}) => MayPromise<void>

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

export type SingleTxOption = {
  txHistoryInfo?: Pick<TxHistoryInfo, 'title' | 'description' | 'forceConfirmedTitle' | 'forceErrorTitle'>
  /** if provided, error notification should respect this config */
  txErrorNotificationDescription?: string | ((error: Error) => string)

  /**
   * for multi-mode
   *
   * will send this transaction even prev has error
   *
   * (will ignore in first tx)
   *
   * @default 'success' when sendMode is 'queue'
   * @default 'finally' when sendMode is 'queue(all-settle)'
   */
  continueWhenPreviousTx?: 'success' | 'error' | 'finally'

  /** send multi same recentBlockhash tx will only send first one */
  cacheTransaction?: boolean
} & SingleTxCallbacks

export type SingleTxCallbacks = {
  onTxSuccess?: TxSuccessCallback
  onTxError?: TxErrorCallback
  onTxFinally?: TxFinallyCallback
  onTxSentSuccess?: TxSentSuccessCallback
  onTxSentError?: TxSentErrorCallback
  onTxSentFinally?: TxSentFinallyCallback
}

export type MultiTxsOption = {
  /**
   * send next when prev is complete (default)
   * send all at once
   */
  sendMode?:
  | 'queue'
  | 'queue(all-settle)'
  | 'parallel(dangerous-without-order)' /* couldn't promise tx's order */
  | 'parallel(batch-transactions)' /* it will in order */
} & MultiTxCallbacks

export type MultiTxCallbacks = {
  onTxAllSuccess?: AllSuccessCallback
  onTxAnyError?: AnyErrorCallback
}

export type TransactionQueue = (
  | [tx: InnerSimpleTransaction | Transaction, singleTxOptions?: SingleTxOption]
  | InnerSimpleTransaction
  | Transaction
)[]

export type TransactionCollector = {
  add(
    transaction: TransactionQueue | Transaction | InnerSimpleTransaction,
    options?: SingleTxOption & MultiTxsOption
  ): void
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
  additionalSingleOptionCallback?: SingleTxCallbacks
  additionalMultiOptionCallback?: MultiTxCallbacks
}

export type SendTransactionPayload = {
  signAllTransactions: WalletStore['signAllTransactions']
  owner: PublicKey
  connection: Connection
  txVersion: TxVersion
  // only if have been shadow open
  signerkeyPair?: TxKeypairDetective
}

export function isTransaction(x: any): x is Transaction {
  return x instanceof Transaction
}

export function isInnerTransaction(x: any): x is InnerSimpleTransaction {
  return isObject(x) && 'instructions' in x && 'instructionTypes' in x
}

/**
 * a **params smarter**  {@link txHandler}
 *
 * easier to invoke / write tx fn base on it
 */
export function createTxHandler<Arg extends Record<string, any>>(
  highTxAction: (arg?: Arg) => TxFn,
  options?: HandleFnOptions
): (arg?: Arg & SingleTxCallbacks & MultiTxCallbacks) => Promise<TxResponseInfos> {
  return (arg) =>
    txHandler(
      highTxAction(arg),
      mergeObject(options, { additionalMultiOptionCallback: arg, additionalSingleOptionCallback: arg })
    )
}

/** as it may use without txHandler, so be a isolate variable */
export const lookupTableCache: CacheLTA = {}

/**
 * **DUTY:**
 *
 * 1. provide tools for a tx action
 *
 * 2. auto handle txError and txSuccess
 *
 * 3. hanle appSetting ---- isApprovePanelShown
 *
 */
export default async function txHandler(customizedTxAction: TxFn, options?: HandleFnOptions): Promise<TxResponseInfos> {
  const {
    transactionCollector,
    collected: { innerTransactions, singleTxOptions, multiTxOption }
  } = collectTxOptions(options)
  useAppSettings.setState({ isApprovePanelShown: true })
  try {
    const { signAllTransactions, owner, txVersion } = useWallet.getState()
    const connection = useConnection.getState().connection
    assert(connection, 'no rpc connection')
    if (options?.forceKeyPairs?.ownerKeypair) {
      // have force key pair info, no need to check wallet connect
      const shadowWalletOwner = options.forceKeyPairs.ownerKeypair.publicKey
      const tokenAccountInfos = await getRichWalletTokenAccounts({ owner: shadowWalletOwner, connection })
      await customizedTxAction({
        transactionCollector,
        baseUtils: { connection, owner: shadowWalletOwner, ...tokenAccountInfos }
      })
    } else {
      const { tokenAccounts, allTokenAccounts } = useWallet.getState()
      assert(owner, 'wallet not connected')
      await customizedTxAction({
        transactionCollector,
        baseUtils: { connection, owner, tokenAccounts, allTokenAccounts }
      })
    }

    const composedOwner = owner ?? options?.forceKeyPairs?.ownerKeypair.publicKey
    assert(composedOwner, 'no owner provided')
    const finalInfos = await dealWithMultiTxOptions({
      transactions: innerTransactions,
      singleOptions: produce(singleTxOptions, (options) => {
        if (options[0]) {
          options[0].onTxSentFinally = mergeFunction(() => {
            useAppSettings.setState({ isApprovePanelShown: false })
          }, options[0].onTxSentFinally)
        }
      }),
      multiOption: multiTxOption,
      payload: {
        owner: composedOwner,
        connection,
        txVersion,
        signAllTransactions,
        signerkeyPair: options?.forceKeyPairs
      }
    })

    useAppSettings.setState({ isApprovePanelShown: false })
    return finalInfos
  } catch (error) {
    const { logError } = useNotification.getState()
    console.warn(error)
    const errorTitle =
      singleTxOptions?.[0]?.txHistoryInfo?.forceErrorTitle ??
      (singleTxOptions?.[0]?.txHistoryInfo?.title ?? '') + ' Error' // assume first instruction's txHistoryInfo is same as the second one
    let systemErrorDescription = error instanceof Error ? noTailingPeriod(error.message) : String(error)
    if (
      systemErrorDescription.includes("versioned transactions isn't supported") ||
      systemErrorDescription.includes('.serializeMessage')
    ) {
      systemErrorDescription =
        'Transaction cancelled\nThis wallet might not support Versioned Transaction, turn it off and try again.'
    }
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

const txSerializeCache = new Map<string, Buffer | Uint8Array>()

/**
 * collector's aim: use `.add` method to load innerTransactions
 */
function collectTxOptions(
  additionOptions?: Pick<HandleFnOptions, 'additionalMultiOptionCallback' | 'additionalSingleOptionCallback'>
) {
  const singleTxOptions = [] as SingleTxOption[]
  const multiTxOption = {} as MultiTxsOption
  const innerTransactions = [] as (Transaction | InnerSimpleTransaction)[]
  const { additionalSingleOptionCallback, additionalMultiOptionCallback } = additionOptions ?? {}

  /**
   * mutable
   */
  const addSingle = (transaction: Transaction | InnerSimpleTransaction, options?: SingleTxOption) => {
    innerTransactions.push(transaction)
    singleTxOptions.push(mergeObject(options ?? {}, additionalSingleOptionCallback))
  }

  /**
   * mutable
   */
  const addQueue = (transactionQueue: TransactionQueue, options?: MultiTxsOption) => {
    transactionQueue.forEach((transaction) => {
      const [singelTransation, singelOption] = Array.isArray(transaction) ? transaction : ([transaction] as const)
      addSingle(singelTransation, singelOption)
    })
    Object.assign(multiTxOption, mergeObject(options ?? {}, additionalMultiOptionCallback))
  }

  /**
   * {@link addSingle} + {@link addQueue}
   */
  const add: TransactionCollector['add'] = (transactions, option) => {
    const isQueue = isArray(transactions)
    if (isQueue) {
      const injectedTransactions: TransactionQueue = transactions.map((t) =>
        isArray(t) ? [t[0], { ...option, ...t[1] }] : [t, option]
      )
      addQueue(injectedTransactions, option)
    } else {
      addSingle(transactions, option)
    }
  }

  const transactionCollector: TransactionCollector = { add }
  return { transactionCollector, collected: { innerTransactions, singleTxOptions, multiTxOption } }
}

export function isVersionedTransaction(
  transaction: Transaction | VersionedTransaction
): transaction is VersionedTransaction {
  return isObject(transaction) && 'version' in transaction
}

export function serialize(transaction: Transaction | VersionedTransaction, options?: { cache?: boolean }) {
  const key = isVersionedTransaction(transaction) ? transaction.message.recentBlockhash : transaction.recentBlockhash
  if (key && txSerializeCache.has(key)) {
    return txSerializeCache.get(key)!
  } else {
    const serialized = transaction.serialize()
    if (key && options?.cache) txSerializeCache.set(key, serialized)
    return serialized
  }
}

/**
 * duty:
 * 1. signAllTransactions
 * 2. record tx to recentTxHistory
 *
 * so this fn will record txids
 */
async function dealWithMultiTxOptions({
  transactions,
  singleOptions,
  multiOption,
  payload
}: {
  transactions: (Transaction | InnerSimpleTransaction)[]
  singleOptions: SingleTxOption[]
  multiOption: MultiTxsOption
  payload: SendTransactionPayload
}): Promise<TxResponseInfos> {
  return new Promise((resolve, reject) =>
    (async () => {
      const txids = [] as string[]
      const successTxids = [] as typeof txids
      const pushSuccessTxid = (txid: string) => {
        successTxids.push(txid)
        if (successTxids.length === transactions.length) {
          multiOption.onTxAllSuccess?.({ txids })
          resolve({ allSuccess: true, txids })
        }
      }
      const parseMultiOptionsInSingleOptions = produce(singleOptions, (options) => {
        options.forEach((option) => {
          option.onTxSentSuccess = mergeFunction(
            (({ txid }) => {
              txids.push(txid)
            }) as TxSentSuccessCallback,
            option.onTxSentSuccess
          )
          option.onTxError = mergeFunction(
            (() => {
              multiOption.onTxAnyError?.({ txids })
              resolve({ allSuccess: false, txids })
            }) as TxErrorCallback,
            option.onTxError
          )
          option.onTxSuccess = mergeFunction(
            (({ txid }) => {
              pushSuccessTxid(txid)
            }) as TxSuccessCallback,
            option.onTxSuccess
          )
        })
      })

      try {
        const builded = transactions.every(isInnerTransaction)
          ? await buildTransactionsFromSDKInnerTransactions({
            connection: payload.connection,
            wallet: payload.owner,
            txVersion: payload.txVersion,
            transactions
          })
          : (transactions as Transaction[])

        try {
          // eslint-disable-next-line no-console
          console.info(
            'tx transactions: ',
            toHumanReadable(builded),
            builded.map((i) =>
              Buffer.from(
                i.serialize({
                  requireAllSignatures: false,
                  verifySignatures: false
                })
              ).toString('base64')
            )
          )
        } catch {
          console.warn('tx log error')
        }
        const noNeedSignAgain = payload.signerkeyPair?.ownerKeypair
        // const allSignedTransactions = await options.payload.signAllTransactions(options.transactions)
        const allSignedTransactions = await (noNeedSignAgain // if have signer detected, no need signAllTransactions
          ? builded
          : payload.signAllTransactions(builded))
        // check all txs are signed, trust wallet doesn't throw error when user reject sign
        allSignedTransactions.forEach((tx) => {
          tx.signatures.forEach((s) => {
            if (s instanceof Uint8Array) {
              if (!s.valueOf().find((a: number) => a !== 0)) throw new Error('User rejected the request')
            } else if (s.publicKey.equals(payload.owner) && !s.signature) throw new Error('User rejected the request')
          })
        })

        // pop tx notification
        const { mutatedSingleOptions } = recordTxNotification({
          transactions: allSignedTransactions,
          singleOptions: parseMultiOptionsInSingleOptions,
          multiOption
        })

        const combinedTxFn = composeWithDifferentSendMode({
          transactions: allSignedTransactions,
          sendMode: multiOption.sendMode,
          singleOptions: mutatedSingleOptions,
          payload
        })
        combinedTxFn()
      } catch (err) {
        reject(err)
      }
    })()
  )
}

function recordTxNotification({
  transactions,
  singleOptions,
  multiOption
}: {
  transactions: (Transaction | VersionedTransaction)[]
  singleOptions: SingleTxOption[]
  multiOption: MultiTxsOption
}): { mutatedSingleOptions: SingleTxOption[] } {
  // log Tx Notification
  const txInfos = singleOptions.map(({ txHistoryInfo, ...restSingleOptions }, idx) => ({
    transaction: transactions[idx],
    historyInfo: txHistoryInfo,
    ...restSingleOptions
  })) as TxNotificationItemInfo['txInfos']
  const txLoggerController = useNotification.getState().logTxid({ txInfos })
  const mutated1 = produce(singleOptions, (options) => {
    options.forEach((option) => {
      option.onTxSentSuccess = mergeFunction(
        (({ txid, transaction }) => {
          txLoggerController.changeItemInfo?.({ txid, state: 'processing' }, { transaction })
        }) as TxSentSuccessCallback,
        option.onTxSentSuccess
      )
      option.onTxError = mergeFunction(
        (({ txid, transaction, error }) => {
          txLoggerController.changeItemInfo?.({ txid, state: 'error', error }, { transaction })
          const txIndex = transactions.indexOf(transaction)
          if (txIndex < 0) return
          transactions.slice(txIndex + 1).forEach((transaction) => {
            txLoggerController.changeItemInfo?.({ state: 'aborted' }, { transaction })
          })
        }) as TxErrorCallback,
        option.onTxError
      )
      option.onTxSuccess = mergeFunction(
        (({ txid, transaction }) => {
          txLoggerController.changeItemInfo?.({ txid, state: 'success' }, { transaction })
        }) as TxSuccessCallback,
        option.onTxSuccess
      )
    })
  })

  // record tx singleOption

  const mutated2 = produce(mutated1, (options) => {
    options.forEach((option) => {
      const { ...restInfo } = option.txHistoryInfo ?? {}
      option.onTxFinally = mergeFunction(
        (({ txid, type, passedMultiTxid, isMulti }) => {
          useTxHistory.getState().addHistoryItem({
            status: type === 'error' ? 'fail' : type,
            txid,
            time: Date.now(),
            isMulti,
            relativeTxids: passedMultiTxid,
            ...restInfo
          })
        }) as TxFinallyCallback,
        option.onTxFinally
      )
    })
  })

  return { mutatedSingleOptions: mutated2 }
}

function composeWithDifferentSendMode({
  transactions,
  sendMode,
  singleOptions,
  payload
}: {
  transactions: (Transaction | VersionedTransaction)[]
  sendMode: MultiTxsOption['sendMode']
  singleOptions: SingleTxOption[]
  payload: SendTransactionPayload
}): () => void {
  const wholeTxidInfo: Omit<MultiTxExtraInfo, 'currentIndex'> = {
    isMulti: transactions.length > 1,
    passedMultiTxid: Array.from({ length: transactions.length }),
    multiTransactionLength: transactions.length,
    transactions
  }
  if (sendMode === 'parallel(dangerous-without-order)' || sendMode === 'parallel(batch-transactions)') {
    const parallelled = () => {
      transactions.forEach((tx, idx) =>
        dealWithSingleTxOptions({
          transaction: tx,
          wholeTxidInfo,
          payload,
          isBatched: sendMode === 'parallel(batch-transactions)',
          singleOption: singleOptions[idx]
        })
      )
    }
    return parallelled
  } else {
    const queued = transactions.reduceRight(
      ({ fn, method }, tx, idx) => {
        const singleOption = singleOptions[idx]
        return {
          fn: () =>
            dealWithSingleTxOptions({
              transaction: tx,
              wholeTxidInfo,
              payload,
              singleOption: produce(singleOption, (draft) => {
                if (method === 'finally') {
                  draft.onTxFinally = mergeFunction(fn, draft.onTxFinally)
                } else if (method === 'error') {
                  draft.onTxError = mergeFunction(fn, draft.onTxError)
                } else if (method === 'success') {
                  draft.onTxSuccess = mergeFunction(fn, draft.onTxSuccess)
                }
              })
            }),
          method: singleOption.continueWhenPreviousTx ?? (sendMode === 'queue(all-settle)' ? 'finally' : 'success')
        }
      },
      { fn: () => { }, method: 'success' }
    )
    return queued.fn
  }
}

/**
 * duty:
 * 1. provide txid and txCallback collectors for a tx action
 * 2. record tx to recentTxHistory
 *
 * it will subscribe txid
 *
 */
async function dealWithSingleTxOptions({
  transaction,
  wholeTxidInfo,
  singleOption,
  payload,
  isBatched
}: {
  transaction: Transaction | VersionedTransaction
  wholeTxidInfo: Omit<MultiTxExtraInfo, 'currentIndex'>
  singleOption?: SingleTxOption
  payload: SendTransactionPayload
  isBatched?: boolean
}) {
  const currentIndex = wholeTxidInfo.transactions.indexOf(transaction)
  const extraTxidInfo: MultiTxExtraInfo = {
    ...wholeTxidInfo,
    currentIndex
  }
  try {
    const txid = await sendTransactionCore({
      transaction,
      payload,
      batchOptions: isBatched ? { allSignedTransactions: wholeTxidInfo.transactions } : undefined,
      cache: Boolean(singleOption?.cacheTransaction)
    })
    assert(txid, 'something went wrong in sending transaction')
    singleOption?.onTxSentSuccess?.({ transaction, txid, ...extraTxidInfo })
    wholeTxidInfo.passedMultiTxid[currentIndex] = txid //! 💩 bad method! it's mutate method!
    subscribeTx({
      txid,
      transaction,
      extraTxidInfo,
      callbacks: {
        onTxSuccess(callbackParams) {
          singleOption?.onTxSuccess?.({ ...callbackParams, ...extraTxidInfo })
        },
        onTxError(callbackParams) {
          console.error('tx error: ', callbackParams.error)
          singleOption?.onTxError?.({ ...callbackParams, ...extraTxidInfo })
        },
        onTxFinally(callbackParams) {
          singleOption?.onTxFinally?.({
            ...callbackParams,
            ...extraTxidInfo
          })
        }
      }
    })
  } catch (err) {
    console.error('fail to send tx: ', err)
    singleOption?.onTxSentError?.({ err, ...extraTxidInfo })
  } finally {
    singleOption?.onTxSentFinally?.()
  }
}
