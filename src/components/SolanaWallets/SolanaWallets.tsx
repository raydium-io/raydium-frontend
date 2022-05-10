import React, { ReactNode, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { clusterApiUrl } from '@solana/web3.js'

import useConnection from '@/application/connection/useConnection'

import {
  BitKeepWalletAdapter,
  LedgerWalletAdapter,
  BitpieWalletAdapter,
  Coin98WalletAdapter,
  GlowWalletAdapter,
  MathWalletAdapter,
  PhantomWalletAdapter,
  SafePalWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  SolongWalletAdapter,
  TokenPocketWalletAdapter,
  TorusWalletAdapter
} from '@solana/wallet-adapter-wallets'

/** include: SolanaWalletConnectionProvider SolanaWalletAdaptorsProvider SolanaWalletModalProvider */
export function SolanaWalletProviders({ children }: { children?: ReactNode }) {
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
