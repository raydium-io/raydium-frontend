import {
  Connection,
  Context,
  Keypair,
  PublicKey,
  SignatureResult,
  Signer,
  Transaction,
  TransactionError
} from '@solana/web3.js'

import produce from 'immer'

import assert from '@/functions/assert'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { mergeFunction, mergeObject } from '@/functions/merge'
import { shrinkToValue } from '@/functions/shrinkToValue'

import { noTailingPeriod } from '../../functions/format/noTailingPeriod'
import useAppSettings from '../common/useAppSettings'
import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import useTxHistory, { TxHistoryInfo } from '../txHistory/useTxHistory'
import { getRichWalletTokenAccounts } from '../wallet/useTokenAccountsRefresher'
import useWallet, { WalletStore } from '../wallet/useWallet'

import { TxNotificationItemInfo } from '@/components/NotificationItem/type'
import { MayPromise } from '@/types/constants'
import { attachRecentBlockhash } from './attachRecentBlockhash'
import { SnowflakeSafeWalletAdapter } from '@snowflake-so/wallet-adapter-snowflake'
import { sendTransactionCore } from './sendTransactionCore'
import subscribeTx from './subscribeTx'

//#region ------------------- basic info -------------------
export type TxInfo = {
  txid: string
  transaction: Transaction
}

export type MultiTxExtraInfo = {
  isMulti: boolean
  /** only used in multi mode */
  transactions: Transaction[]
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
  txHistoryInfo?: Pick<TxHistoryInfo, 'title' | 'description'>
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

export type TransactionQueue = ([transaction: Transaction, singleTxOptions?: SingleTxOption] | Transaction)[]

export type TransactionCollector = {
  add(transaction: Transaction, options?: SingleTxOption): void
  addQueue(transactionQueue: TransactionQueue, multiTxOptions?: MultiTxsOption): void
  addSigners(signers: Signer[]) : void
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
  connection: Connection
  // only if have been shadow open
  signerkeyPair?: TxKeypairDetective
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
export default async function txHandler(txAction: TxFn, options?: HandleFnOptions): Promise<TxResponseInfos> {
  const {
    transactionCollector,
    collected: { innerTransactions, singleTxOptions, multiTxOption, innerSigners }
  } = collectTxOptions(options)
  useAppSettings.setState({ isApprovePanelShown: true })
  try {
    const { signAllTransactions, owner, adapter } = useWallet.getState()
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
      assert(owner, 'wallet not connected')
      await txAction({
        transactionCollector,
        baseUtils: { connection, owner, tokenAccounts, allTokenAccounts }
      })
    }

    // eslint-disable-next-line no-console
    const _snowflakeAdapter = adapter as SnowflakeSafeWalletAdapter;
    if (singleTxOptions[0].txHistoryInfo?.description && _snowflakeAdapter.isSnowflakeSafe){
      _snowflakeAdapter.setProposalName(singleTxOptions[0].txHistoryInfo.description)
      _snowflakeAdapter.setSigners(innerSigners);
    }

    // eslint-disable-next-line no-console
    console.info('tx transactions: ', toHumanReadable(innerTransactions))

    const finalInfos = await handleMultiTxOptions({
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
        connection,
        signAllTransactions,
        signerkeyPair: options?.forceKeyPairs
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

function collectTxOptions(
  additionOptions?: Pick<HandleFnOptions, 'additionalMultiOptionCallback' | 'additionalSingleOptionCallback'>
) {
  const singleTxOptions = [] as SingleTxOption[]
  const multiTxOption = {} as MultiTxsOption
  const innerTransactions = [] as Transaction[]
  const innerSigners = [] as Signer[]

  const { additionalSingleOptionCallback, additionalMultiOptionCallback } = additionOptions ?? {}
  const add: TransactionCollector['add'] = (transaction, options) => {
    innerTransactions.push(transaction)
    singleTxOptions.push(mergeObject(options ?? {}, additionalSingleOptionCallback))
  }
  const addQueue: TransactionCollector['addQueue'] = (transactionQueue, options?) => {
    transactionQueue.forEach((transaction) => {
      const [singelTransation, singelOption] = Array.isArray(transaction) ? transaction : ([transaction] as const)
      add(singelTransation, singelOption)
    })
    Object.assign(multiTxOption, mergeObject(options ?? {}, additionalMultiOptionCallback))
  }
  const addSigners: TransactionCollector['addSigners'] = (signers) => {
    innerSigners.push(...signers);
  }

  const transactionCollector: TransactionCollector = { add, addQueue, addSigners }
  return { transactionCollector, collected: { innerTransactions, singleTxOptions, multiTxOption, innerSigners } }
}

export function serialize(transaction: Transaction, cache = true) {
  const key = transaction.recentBlockhash
  if (key && txSerializeCache.has(key)) {
    return txSerializeCache.get(key)!
  } else {
    const serialized = transaction.serialize()
    if (key && cache) txSerializeCache.set(key, serialized)
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
async function handleMultiTxOptions({
  transactions,
  singleOptions,
  multiOption,
  payload
}: {
  transactions: Transaction[]
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
        await attachRecentBlockhash(transactions)

        // const allSignedTransactions = await options.payload.signAllTransactions(options.transactions)
        const allSignedTransactions = await (payload.signerkeyPair?.ownerKeypair // if have signer detected, no need signAllTransactions
          ? transactions
          : payload.signAllTransactions(transactions))

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
  transactions: Transaction[]
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
  transactions: Transaction[]
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
        handleSingleTxOptions({
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
        const singleOption = singleOptions[idx] || singleOptions[0];
        return {
          fn: () =>
            handleSingleTxOptions({
              transaction: tx,
              wholeTxidInfo,
              payload,
              singleOption: produce(singleOption, (draft) => {
                if (method === 'finally') {
                  draft.onTxFinally = mergeFunction(fn, draft.onTxFinally)
                } else if (method === 'error') {
                  draft.onTxError = mergeFunction(fn, draft.onTxSuccess)
                } else if (method === 'success') {
                  draft.onTxSuccess = mergeFunction(fn, draft.onTxSuccess)
                }
              })
            }),
          method: singleOption.continueWhenPreviousTx ?? (sendMode === 'queue' ? 'success' : 'finally')
        }
      },
      { fn: () => {}, method: 'success' }
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
async function handleSingleTxOptions({
  transaction,
  wholeTxidInfo,
  singleOption,
  payload,
  isBatched
}: {
  transaction: Transaction
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
    const txid = await sendTransactionCore(
      transaction,
      payload,
      isBatched ? { allSignedTransactions: wholeTxidInfo.transactions } : undefined,
      wholeTxidInfo.transactions.length === 1 // NOTE: will cache when has only one transaction, ortherwise it will not cache // TODO: should cache has manually detected key (prop:cacheKey in singleOptions)
    )
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
