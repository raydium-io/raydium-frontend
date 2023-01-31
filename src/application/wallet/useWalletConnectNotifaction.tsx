import useNotification from '@/application/notification/useNotification'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { requestIdleCallback } from '@/functions/lazyMap'
import { useEvent } from '@/hooks/useEvent'
import { PublicKeyish } from '@/types/constants'
import { useEffect } from 'react'
import useWallet from './useWallet'

export function useWalletConnectNotifaction() {
  const { adapter, owner } = useWallet()
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
    if (owner) {
      handleConnect(owner)
    }
  }, [owner])
  useEffect(() => {
    requestIdleCallback(() => {
      adapter?.once('disconnect', handleDisconnect)
    })
    requestIdleCallback(() => {
      adapter?.on('error', handleError)
    })
    return () => {
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
