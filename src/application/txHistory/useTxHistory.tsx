import create from 'zustand'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { DateInfo, HexAddress, MayFunction } from '@/types/constants'

import useWallet from '../wallet/useWallet'

export interface TxHistoryInfo {
  txid: HexAddress
  title?: string
  block?: number
  description?: string
  status: 'success' | 'droped' | 'pending' | 'fail'
  time: DateInfo
}

export type TxHistoryStore = {
  alltxHistory: Record<HexAddress /* wallet publickey */, Record<TxHistoryInfo['txid'], TxHistoryInfo>>
  txHistory: TxHistoryInfo[]
  addHistoryItem(item: TxHistoryInfo): Promise<void>
  updateExistingHistoryItem(
    txid: HexAddress,
    piece: MayFunction<Partial<TxHistoryInfo>, [old: TxHistoryInfo]>
  ): Promise<void>
}

export const useTxHistory = create<TxHistoryStore>((set, get) => ({
  alltxHistory: {},
  txHistory: [],

  addHistoryItem: (item: TxHistoryInfo) => {
    const owner = useWallet.getState().owner
    const addedTxHistoryOfOwner = get().txHistory.slice(0, 18).concat(item)
    set((s) => ({
      alltxHistory: {
        ...s.alltxHistory,
        [String(owner)]: Object.fromEntries(addedTxHistoryOfOwner.map((item) => [item.txid, item]))
      }
    }))
    return Promise.resolve()
  },

  async updateExistingHistoryItem(txid: HexAddress, piece: MayFunction<Partial<TxHistoryInfo>, [old: TxHistoryInfo]>) {
    return new Promise((resolve, reject) => {
      const oldHistoryItem = get().txHistory[txid]
      if (!oldHistoryItem) {
        reject()
      }
      resolve(get().addHistoryItem({ ...oldHistoryItem, ...shrinkToValue(piece, [oldHistoryItem]) }))
    })
  }
}))

export default useTxHistory
