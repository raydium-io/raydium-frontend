import { useCallback, useEffect } from 'react'

import { parseDurationAbsolute } from '@/functions/date/parseDuration'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import { useTxHistory } from './useTxHistory'
import fetchTransitionStatus from './fetchTransitionStatus'

export default function useInitRefreshTransactionStatus() {
  const connection = useConnection((s) => s.connection)
  const log = useNotification((s) => s.log)
  const transactionHistory = useTxHistory((s) => s.txHistory)
  const updateExistingHistoryItem = useTxHistory((s) => s.updateExistingHistoryItem)

  const initRefreshTransactionStatus = useCallback(async () => {
    if (!connection) return
    const pendingTx = transactionHistory.filter((i) => i.status === 'pending')
    const results = await fetchTransitionStatus(
      pendingTx.map((i) => i.txid),
      connection
    )
    results.forEach((result, idx) => {
      const tx = pendingTx[idx]
      if (!result && parseDurationAbsolute(Date.now() - Number(tx.time)).minutes > 5) {
        updateExistingHistoryItem(tx.txid, { status: 'droped', block: 0 })
      } else if (result && !result.err) {
        updateExistingHistoryItem(tx.txid, { status: 'success', block: result.slot })
      } else if (result && result.err) {
        updateExistingHistoryItem(tx.txid, { status: 'fail', block: result.slot })
      }
    })
  }, [transactionHistory, connection, log])

  useEffect(() => {
    initRefreshTransactionStatus()
  }, [])
}
