import useNotification from '@/application/notification/useNotification'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { useEffect } from 'react'
import useWallet from './useWallet'

export function useWalletConnectNotifaction() {
  const { adapter } = useWallet()
  const logWarning = throttle(useNotification.getState().logWarning)
  const logSuccess = throttle(useNotification.getState().logSuccess)
  useEffect(() => {
    adapter?.addListener('connect', (pubkey) => {
      logSuccess(
        `${adapter?.name} wallet connected`,
        `Wallet: ${toPubString(pubkey).slice(0, 4)}...${toPubString(pubkey).slice(-4)} `
      )
    })

    adapter?.addListener('disconnect', () => {
      logWarning(`${adapter?.name} Wallet disconnected`)
    })

    return () => {
      adapter?.removeAllListeners()
    }
  }, [adapter])
}
