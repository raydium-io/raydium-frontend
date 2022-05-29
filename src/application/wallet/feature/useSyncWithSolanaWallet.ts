import { useEffect } from 'react'

import { useWallet as _useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction } from '@solana/web3.js'

import useConnection from '@/application/connection/useConnection'
import { attachRecentBlockhash } from '@/application/txTools/attachRecentBlockhash'

import useWallet from '../useWallet'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { isValidePublicKey } from '@/functions/judgers/dateType'

/**
 * **only in `_app.tsx`**
 *
 * just make iwallet same as solana wallet
 */
export function useSyncWithSolanaWallet() {
  const {
    publicKey: _publicKey,
    wallets: _wallets,
    disconnecting: _disconnecting,
    connecting: _connecting,
    connected: _connected,
    select: _select,
    disconnect: _disconnect,
    wallet: _wallet,
    signAllTransactions: _signAllTransactions
  } = _useWallet()

  const { connection } = useConnection()

  const _adapter = _wallet?.adapter

  useIsomorphicLayoutEffect(() => {
    if (!useWallet.getState().inSimulateMode && useWallet.getState().owner != _publicKey) {
      useWallet.setState({ owner: _publicKey ?? undefined })
    }
  }, [_publicKey])

  useEffect(() => {
    // sometimes `_wallet`'s data is delayed is not ready
    if (!useWallet.getState().inSimulateMode && useWallet.getState().availableWallets !== _wallets) {
      useWallet.setState({ availableWallets: _wallets })
    }
  }, [_wallets])

  useIsomorphicLayoutEffect(() => {
    if (!useWallet.getState().inSimulateMode && useWallet.getState().disconnecting !== _disconnecting) {
      useWallet.setState({ disconnecting: _disconnecting })
    }
  }, [_disconnecting])

  useIsomorphicLayoutEffect(() => {
    if (!useWallet.getState().inSimulateMode && useWallet.getState().connecting !== _connecting) {
      useWallet.setState({ connecting: _connecting })
    }
  }, [_connecting])

  useIsomorphicLayoutEffect(() => {
    if (!useWallet.getState().inSimulateMode && useWallet.getState().connected !== _connected) {
      useWallet.setState({ connected: _connected })
    }
  }, [_connected])

  useIsomorphicLayoutEffect(() => {
    if (_select) {
      const superSelect = (v: string) => (isValidePublicKey(v) ? simulateFakeWallet(v) : _select(v))
      useWallet.setState({ select: superSelect })
    }
  }, [_select])

  useIsomorphicLayoutEffect(() => {
    const superDisconnect = () => (useWallet.getState().inSimulateMode ? disconnectSimulateFakeWallet() : _disconnect())
    useWallet.setState({ disconnect: superDisconnect })
  }, [_disconnect])

  useEffect(() => {
    useWallet.setState({
      signAllTransactions: async (transactions: Transaction[]) => {
        await attachRecentBlockhash(...transactions)
        return (
          (await _signAllTransactions?.(transactions).catch((err) => {
            throw err
          })) ?? []
        )
      }
    })
  }, [_signAllTransactions, _adapter, connection])

  useIsomorphicLayoutEffect(() => {
    if (!useWallet.getState().inSimulateMode && useWallet.getState().currentWallet !== _wallet) {
      useWallet.setState({ currentWallet: _wallet })
    }
  }, [_wallet])

  useIsomorphicLayoutEffect(() => {
    if (!useWallet.getState().inSimulateMode && useWallet.getState().adapter !== _adapter) {
      useWallet.setState({ adapter: _adapter })
    }
  }, [_adapter])
}

function simulateFakeWallet(walletAddress: string) {
  console.warn('simulate wallet: ', walletAddress)
  if (!isValidePublicKey(walletAddress)) return

  // core fake
  useWallet.setState({
    owner: new PublicKey(walletAddress),
    connected: true,
    connecting: false,
    disconnecting: false,
    inSimulateMode: true
  })
}

async function disconnectSimulateFakeWallet() {
  // core fake
  useWallet.setState({
    owner: undefined,
    connected: false,
    connecting: false,
    disconnecting: false,
    inSimulateMode: false
  })
  return true
}
