import { useEffect } from 'react'

import { TxVersion } from '@raydium-io/raydium-sdk'

import useWallet from './useWallet'

/**
 * this list may be updated if more support versione transaction
 */
const versionTxBlockWalletNames: string[] = [
  // seems all wallet support version tx
  'SafePal'
]

export function useWalletTxVersionDetector() {
  const adapter = useWallet((s) => s.adapter)
  useEffect(() => {
    if (adapter?.name) {
      const isWalletSupportVersionTx = !versionTxBlockWalletNames.includes(adapter.name)
      useWallet.setState({ txVersion: isWalletSupportVersionTx ? TxVersion.V0 : TxVersion.LEGACY })
    }
  }, [adapter?.name])
}
