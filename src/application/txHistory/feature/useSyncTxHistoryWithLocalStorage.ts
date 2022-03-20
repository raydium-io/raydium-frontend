import { useEffect, useRef } from 'react'

import useWallet from '@/application/wallet/useWallet'
import useLocalStorageItem from '@/hooks/useLocalStorage'

import useTxHistory, { TxHistoryStore } from '../useTxHistory'
import parseToTransacionHistory from '../utils/parseToTransacionHistory'

export default function useSyncTxHistoryWithLocalStorage() {
  const [rawHistory, setRawHistory] = useLocalStorageItem<TxHistoryStore['alltxHistory']>('RAY_RECENT_TRANSACTIONS')
  const alltxHistory = useTxHistory((s) => s.alltxHistory)
  const owner = useWallet((s) => s.owner)

  // rawHistory => alltxHistory
  const historyForwardUpdateLock = useRef(false)
  // alltxHistory => rawHistory
  const historyBackwardUpdateLock = useRef(false)

  /**  calc txHistory of {@link useTxHistory} */
  useEffect(() => {
    const parsedResult = parseToTransacionHistory(String(owner), alltxHistory)
    useTxHistory.setState({ txHistory: parsedResult })
  }, [alltxHistory, owner])

  useEffect(() => {
    if (historyForwardUpdateLock.current) {
      historyForwardUpdateLock.current = false
      return
    } else {
      if (!rawHistory) return
      useTxHistory.setState({ alltxHistory: rawHistory })
      historyBackwardUpdateLock.current = true
    }
  }, [rawHistory])

  useEffect(() => {
    if (historyBackwardUpdateLock.current) {
      historyBackwardUpdateLock.current = false
      return
    } else {
      setRawHistory(alltxHistory)
      historyForwardUpdateLock.current = true
    }
  }, [alltxHistory])
}
