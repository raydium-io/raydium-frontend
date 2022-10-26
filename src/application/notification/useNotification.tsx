import { ReactNode } from 'react'
import create from 'zustand'

import {
  NormalNotificationItemInfo,
  TxNotificationController,
  TxNotificationItemInfo
} from '@/components/NotificationItem/type'
import { ConfirmDialogInfo } from '@/pageComponents/dialogs/ConfirmDialog'

//! params base on <NotificationItem>
export interface NotificationStore {
  log(info: NormalNotificationItemInfo): void
  logTxid(txInfo: TxNotificationItemInfo): Partial<TxNotificationController>
  logError(title: unknown, description?: ReactNode): void
  logWarning(title: string, description?: ReactNode): void
  logSuccess(title: string, description?: ReactNode): void
  logInfo(title: string, description?: ReactNode): void
  popConfirm(info: ConfirmDialogInfo): void
  popWelcomeDialog(renderContent: ReactNode, cb?: { onConfirm?: () => void }): void
}

/** zustand store hooks */
const useNotification = create<NotificationStore>(() => ({
  log: () => ({}),
  logTxid: () => ({}),
  logError: () => ({}),
  logWarning: () => ({}),
  logSuccess: () => ({}),
  logInfo: () => ({}),
  popConfirm: () => ({}),
  popWelcomeDialog: () => ({})
}))

export default useNotification
