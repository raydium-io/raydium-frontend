import useNotification from '@/application/notification/useNotification'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { useEvent } from '@/hooks/useEvent'
import { PublicKeyish } from '@/types/constants'
import { useEffect } from 'react'
import useWallet from './useWallet'

export function useWalletConnectNotifaction() {
  const { adapter } = useWallet()
  const logWarning = useNotification((s) => s.logWarning)
  const logSuccess = useNotification((s) => s.logSuccess)
  const handleConnect = throttle((pubkey: PublicKeyish): void => {
    logSuccess(
      `${adapter?.name} wallet connected`,
      `Wallet: ${toPubString(pubkey).slice(0, 4)}...${toPubString(pubkey).slice(-4)} `
    )
  })
  const handleDisconnect = throttle(() => {
    logWarning(`${adapter?.name} Wallet disconnected`)
  })

  const handleError = useEvent(() => {
    /* do somthing */
  })

  useEffect(() => {
    if (adapter && adapter.publicKey) {
      handleConnect(adapter.publicKey)
    }
    adapter?.on('connect', handleConnect)
    adapter?.on('disconnect', handleDisconnect)
    adapter?.on('error', handleError)
    return () => {
      adapter?.off('connect')
      adapter?.off('disconnect')
      adapter?.off('error')

      // adapter?.removeAllListeners()
    }
  }, [adapter])
}
