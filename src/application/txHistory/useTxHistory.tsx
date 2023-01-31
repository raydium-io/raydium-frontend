import create from 'zustand'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { DateInfo, HexAddress, MayFunction } from '@/types/constants'

import useWallet from '../wallet/useWallet'

export interface TxHistoryInfo {
  txid: HexAddress
  /** only used in multi mode, it's length is transaction length */
  relativeTxids?: HexAddress[]
  title?: string
  // FORCE CODE
  forceConfirmedTitle?: string
  // FORCE CODE
  forceErrorTitle?: string
  block?: number
  description?: string
  isMulti?: boolean
  /** only for multi-mode (isMulti should be true) */
  subtransactionDescription?: string
  status: 'success' | 'droped' | 'pending' | 'fail'
  time: DateInfo
}

export type TxHistoryStore = {
  alltxHistory: Record<HexAddress /* wallet publickey */, Record<TxHistoryInfo['txid'], TxHistoryInfo>>
  txHistory: TxHistoryInfo[]
  addHistoryItem: typeof addHistoryItem
  updateExistingHistoryItem: typeof updateExistingHistoryItem
}

type TxHistoryController = {
  updateExistingHistoryItem: typeof updateExistingHistoryItem
}

function addHistoryItem(item: TxHistoryInfo): Promise<TxHistoryController> {
  const owner = useWallet.getState().owner
  const addedTxHistoryOfOwner = useTxHistory.getState().txHistory.slice(0, 18).concat(item)
  useTxHistory.setState((s) => ({
    alltxHistory: {
      ...s.alltxHistory,
      [String(owner)]: Object.fromEntries(addedTxHistoryOfOwner.map((item) => [item.txid, item]))
    }
  }))
  return Promise.resolve({
    updateExistingHistoryItem
  })
}

async function updateExistingHistoryItem(
  txid: HexAddress,
  piece: MayFunction<Partial<TxHistoryInfo>, [old: TxHistoryInfo]>
) {
  return new Promise((resolve, reject) => {
    const oldHistoryItem = useTxHistory.getState().txHistory[txid]
    if (!oldHistoryItem) {
      reject()
    }
    resolve(useTxHistory.getState().addHistoryItem({ ...oldHistoryItem, ...shrinkToValue(piece, [oldHistoryItem]) }))
  })
}

export const useTxHistory = create<TxHistoryStore>((set, get) => ({
  alltxHistory: {},
  txHistory: [],

  addHistoryItem,
  updateExistingHistoryItem
}))

export default useTxHistory
