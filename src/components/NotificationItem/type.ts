import { ReactNode } from 'react'
import { TxHistoryInfo } from '@/application/txHistory/useTxHistory'
import { Transaction } from '@solana/web3.js'

export interface NormalNotificationItemInfo {
  type?: 'success' | 'warning' | 'error' | 'info'
  title?: ReactNode
  subtitle?: ReactNode
  description?: ReactNode
}

export interface TxNotificationItemInfo {
  txInfos: {
    transaction: Transaction
    historyInfo: TxHistoryInfo
    /** @default 'queuing' */
    state?: 'success' | 'error' | 'aborted' | 'queuing' | 'processing'
    /** not txid when not send */
    txid?: string
  }[]
}

export type TxNotificationController = {
  changeTxid(txid: string, options: { transaction: Transaction }): void
}
