import { ReactNode } from 'react'
import { TxHistoryInfo } from '@/application/txHistory/useTxHistory'

export interface NormalNotificationItemInfo {
  type?: 'success' | 'warning' | 'error' | 'info'
  title?: ReactNode
  subtitle?: ReactNode
  description?: ReactNode
}

export interface TxNotificationItemInfo {
  isTx: true
  txInfos: {
    historyInfo: TxHistoryInfo
    /** @default 'queuing' */
    state?: 'success' | 'error' | 'aborted' | 'queuing' | 'processing'
    txid: string
  }[]
}
