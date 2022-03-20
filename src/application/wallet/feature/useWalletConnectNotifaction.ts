import useNotification from '@/application/notification/useNotification'
import toPubString from '@/functions/format/toMintString'
import { useEffect } from 'react'
import useWallet from '../useWallet'

export function useWalletConnectNotifaction() {
  const { adapter } = useWallet()
  useEffect(() => {
    adapter?.addListener('connect', (pubkey) => {
      useNotification
        .getState()
        .logSuccess(
          `${adapter?.name} wallet connected`,
          `wallet: ${toPubString(pubkey).slice(0, 4)}...${toPubString(pubkey).slice(-4)} `
        )
    })

    adapter?.addListener('disconnect', () => {
      useNotification.getState().logWarning(`${adapter?.name} Wallet disconnected`)
    })

    return () => {
      adapter?.removeAllListeners()
    }
  }, [adapter])
}
