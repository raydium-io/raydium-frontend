import React, { FC, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'

import { BitpieWalletAdapter } from '@solana/wallet-adapter-bitpie'
import { Coin98WalletAdapter } from '@solana/wallet-adapter-coin98'
import { GlowWalletAdapter } from '@solana/wallet-adapter-glow'
import { MathWalletAdapter } from '@solana/wallet-adapter-mathwallet'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { SafePalWalletAdapter } from '@solana/wallet-adapter-safepal'
import { SlopeWalletAdapter } from '@solana/wallet-adapter-slope'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { SolletExtensionWalletAdapter, SolletWalletAdapter } from '@solana/wallet-adapter-sollet'
import { SolongWalletAdapter } from '@solana/wallet-adapter-solong'
import { TokenPocketWalletAdapter } from '@solana/wallet-adapter-tokenpocket'
import { TorusWalletAdapter } from '@solana/wallet-adapter-torus'
import { clusterApiUrl } from '@solana/web3.js'

import useConnection from '@/application/connection/useConnection'
import { BitKeepWalletAdapter, LedgerWalletAdapter } from '@solana/wallet-adapter-wallets'

/** include: SolanaWalletConnectionProvider SolanaWalletAdaptorsProvider SolanaWalletModalProvider */
export const SolanaWalletProviders: FC = ({ children }) => {
  // Set to 'devnet' | 'testnet' | 'mainnet-beta' or provide a custom RPC endpoint
  const { currentEndPoint } = useConnection()
  const { pathname } = useRouter()

  const endpoint = useMemo(() => currentEndPoint?.url ?? clusterApiUrl('devnet'), [currentEndPoint])

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new SolletWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolletExtensionWalletAdapter(),
      new MathWalletAdapter({ endpoint }),
      new SolongWalletAdapter({ endpoint }),
      new Coin98WalletAdapter({ endpoint }),
      new SafePalWalletAdapter({ endpoint }),
      new SlopeWalletAdapter({ endpoint }),
      new BitpieWalletAdapter({ endpoint }),
      new GlowWalletAdapter({ endpoint }),
      new TokenPocketWalletAdapter(),
      new BitKeepWalletAdapter({ endpoint })
    ],
    [endpoint]
  )

  const onError = useCallback(() => {
    // TODO
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={pathname !== '/'}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
