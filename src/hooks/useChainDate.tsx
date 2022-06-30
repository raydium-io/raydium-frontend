import useConnection from '@/application/connection/useConnection'
import { useForceUpdate } from '@/hooks/useForceUpdate'

export function useChainDate() {
  useForceUpdate({ loop: 1000 })
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset) ?? 0
  const currentBlockChainDate = new Date(Date.now() + chainTimeOffset)
  return currentBlockChainDate
}
