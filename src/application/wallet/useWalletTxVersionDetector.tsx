import { TxVersion } from '@raydium-io/raydium-sdk'
import { BackpackWalletName } from '@solana/wallet-adapter-backpack'
import { GlowWalletName } from '@solana/wallet-adapter-glow'
import { PhantomWalletName } from '@solana/wallet-adapter-phantom'
import { SolflareWalletName } from '@solana/wallet-adapter-solflare'
import { useEffect } from 'react'
import useWallet from './useWallet'

/**
 * this list may be updated if more support versione transaction
 */
const versionTxSupportWalletNames: string[] = [
  PhantomWalletName,
  GlowWalletName,
  SolflareWalletName,
  BackpackWalletName
]

export function useWalletTxVersionDetector() {
  const adapter = useWallet((s) => s.adapter)
  useEffect(() => {
    if (adapter?.name) {
      const isWalletSupportVersionTx = versionTxSupportWalletNames.includes(adapter.name)
      useWallet.setState({ txVersion: isWalletSupportVersionTx ? TxVersion.V0 : TxVersion.LEGACY })
    }
  }, [adapter?.name])
}
