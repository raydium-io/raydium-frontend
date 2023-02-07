import { useEffect } from 'react'

import { Connection } from '@solana/web3.js'

import jFetch from '@/functions/dom/jFetch'
import { mul, sub } from '@/functions/numberish/operations'

import useConnection from './useConnection'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'

/**
 * **only in `_app.tsx`**
 *
 * will base on rpcpools(in dev mode) to establish connection
 */
export default function useFreshChainTimeOffset() {
  const connection = useConnection((s) => s.connection)
  const timeUrl = useAppAdvancedSettings((s) => s.apiUrls.time)
  useEffect(() => {
    updateChainTimeOffset(connection)
    const timeId = setInterval(() => {
      updateChainTimeOffset(connection)
    }, 1000 * 60 * 5)
    return () => clearInterval(timeId)
  }, [connection, timeUrl])
}

async function updateChainTimeOffset(connection: Connection | undefined) {
  if (!connection) return
  const offset = await getChainTimeOffset()
  if (!offset) return
  useConnection.setState({
    chainTimeOffset: offset * 1000,
    getChainDate: () => new Date(Date.now() + (offset ?? 0))
  })
}

function getChainTimeOffset(): Promise<number | undefined> {
  const timeUrl = useAppAdvancedSettings.getState().apiUrls.time
  // const time = await connection.getSlot().then((slot) => connection.getBlockTime(slot)) // old method
  return jFetch<{ offset: number }>(timeUrl).then((res) => res?.offset)
}
