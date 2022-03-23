import { useEffect } from 'react'

import { PublicKey } from '@solana/web3.js'

import useConnection from '@/application/connection/useConnection'

import useWallet from '../useWallet'

type WalletAccountChangeListener = () => void

type ListenerId = number

type InnerWalletAccountChangeListenerSettings = {
  listenerId: ListenerId
  cb: WalletAccountChangeListener
  once?: boolean
}

let walletAccountChangeListeners: InnerWalletAccountChangeListenerSettings[] = []
let listenerIdCounter = 1

export function useWalletAccountChangeListeners() {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)
  useEffect(() => {
    if (!connection || !owner) return
    const listenerId = connection.onAccountChange(
      new PublicKey(owner),
      () => {
        invokeWalletAccountChangeListeners()
      },
      'confirmed'
    )
    return () => {
      connection.removeAccountChangeListener(listenerId)
    }
  }, [connection, owner])
}

// TODO: the code form  of use this is not straightforward, should be integrated in handleMultiTx
export function addWalletAccountChangeListener(cb: () => void, options?: { once?: boolean }) {
  const listenerId = listenerIdCounter
  listenerIdCounter += 1
  walletAccountChangeListeners.push({ cb, once: options?.once, listenerId: listenerId })
  return listenerId
}

export function removeWalletAccountChangeListener(id: ListenerId) {
  const idx = walletAccountChangeListeners.findIndex((l) => l.listenerId === id)
  if (idx >= 0) {
    walletAccountChangeListeners.splice(idx, 1)
  }
}

export function invokeWalletAccountChangeListeners() {
  walletAccountChangeListeners.forEach((l) => l.cb())
  walletAccountChangeListeners = walletAccountChangeListeners.filter((l) => !l.once)
}
