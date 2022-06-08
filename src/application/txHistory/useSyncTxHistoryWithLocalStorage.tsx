import { useEffect } from 'react'

import useWallet from '@/application/wallet/useWallet'
import useLocalStorageItem from '@/hooks/useLocalStorage'

import useTxHistory, { TxHistoryStore } from './useTxHistory'
import parseToTransacionHistory from './parseToTransacionHistory'
import useTwoStateSyncer from '../../hooks/use2StateSyncer'

export default function useSyncTxHistoryWithLocalStorage() {
  const [rawHistory, setRawHistory] = useLocalStorageItem<TxHistoryStore['alltxHistory']>('RAY_RECENT_TRANSACTIONS')
  const alltxHistory = useTxHistory((s) => s.alltxHistory)
  const owner = useWallet((s) => s.owner)

  useTwoStateSyncer({
    state1: rawHistory,
    state2: alltxHistory,
    onState2Changed: (pairValue) => pairValue && setRawHistory(pairValue),
    onState1Changed: (pairValue) => pairValue && useTxHistory.setState({ alltxHistory: pairValue })
  })

  /**  calc txHistory of {@link useTxHistory} */
  useEffect(() => {
    const parsedResult = parseToTransacionHistory(String(owner), alltxHistory)
    useTxHistory.setState({ txHistory: parsedResult })
  }, [alltxHistory, owner])
}
