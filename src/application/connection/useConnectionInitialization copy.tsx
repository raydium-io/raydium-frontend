import useConnection from './useConnection'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { mul, sub } from '@/functions/numberish/operations'

/**
 * **only in `_app.tsx`**
 *
 * will base on rpcpools(in dev mode) to establish connection
 */
export default function useFreshChainTimeOffset() {
  const connection = useConnection((s) => s.connection)
  useAsyncEffect(async () => {
    if (!connection) return
    const chainTime = await connection.getBlockTime(await connection.getSlot())
    if (!chainTime) return
    const offset = Number(sub(mul(chainTime, 1000), Date.now()).toFixed(0))
    useConnection.setState({
      chainTimeOffset: offset
    })
  }, [connection])
}
