import { useEffect } from 'react'

import { Connection } from '@solana/web3.js'

import { mul, sub } from '@/functions/numberish/operations'

import useConnection from './useConnection'

/**
 * **only in `_app.tsx`**
 *
 * will base on rpcpools(in dev mode) to establish connection
 */
export default function useFreshChainTimeOffset() {
  const connection = useConnection((s) => s.connection)
  useEffect(() => {
    updateChinTimeOffset(connection)
    const timeId = setInterval(() => {
      updateChinTimeOffset(connection)
    }, 1000 * 60 * 5)
    return () => clearInterval(timeId)
  }, [connection])
}

async function updateChinTimeOffset(connection: Connection | undefined) {
  if (!connection) return
  const slot = await connection.getSlot()
  const chainTime = await connection.getBlockTime(slot)
  if (!chainTime) return
  const offset = Number(sub(mul(chainTime, 1000), Date.now()).toFixed(0))
  useConnection.setState({
    chainTimeOffset: offset,
    getChainDate: () => new Date(Date.now() + (offset ?? 0))
  })
}
