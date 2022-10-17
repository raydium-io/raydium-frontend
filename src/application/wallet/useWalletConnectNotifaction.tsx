import useNotification from '@/application/notification/useNotification'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { requestIdleCallback } from '@/functions/lazyMap'
import useCallbackRef from '@/hooks/useCallbackRef'
import { useEvent } from '@/hooks/useEvent'
import { PublicKeyish } from '@/types/constants'
import { useEffect, useCallback } from 'react'
import useWallet from './useWallet'

export function useWalletConnectNotifaction() {
  const { adapter } = useWallet()
  const logWarning = useNotification((s) => s.logWarning)
  const logSuccess = useNotification((s) => s.logSuccess)
  const handleConnect = useEvent((pubkey: PublicKeyish) => {
    if (!adapter?.publicKey || !isMintEqual(adapter?.publicKey, pubkey)) return
    logSuccess(
      `${adapter?.name} wallet connected`,
      `Wallet: ${toPubString(pubkey).slice(0, 4)}...${toPubString(pubkey).slice(-4)} `
    )
  })
  const handleDisconnect = useEvent(() => {
    logWarning(`${adapter?.name} Wallet disconnected`)
  })

  const handleError = useEvent(() => {
    /* do somthing */
  })

  useEffect(() => {
    if (adapter && adapter.publicKey) {
      handleConnect(adapter.publicKey)
    }
    requestIdleCallback(() => {
      adapter?.once('connect', handleConnect)
    })
    requestIdleCallback(() => {
      adapter?.once('disconnect', handleDisconnect)
    })
    requestIdleCallback(() => {
      adapter?.on('error', handleError)
    })
    return () => {
      requestIdleCallback(() => {
        adapter?.off('connect')
      })
      requestIdleCallback(() => {
        adapter?.off('disconnect')
      })
      requestIdleCallback(() => {
        adapter?.off('error')
      })

      // adapter?.removeAllListeners()
    }
  }, [adapter])
}
