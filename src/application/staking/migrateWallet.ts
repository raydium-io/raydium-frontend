import jFetch from '@/functions/dom/jFetch'
import toPubString from '@/functions/format/toMintString'
import { PublicKeyish } from '@raydium-io/raydium-sdk'

type WalletMigrateHistory = {
  success: boolean
  wallet: null | string /* maybe wallet address */
}
type WalletMigrateResponse = {
  success: boolean
  msg: string
}

export async function getWalletMigrateHistory(walletAddress: PublicKeyish): Promise<string | undefined> {
  const history = await jFetch<WalletMigrateHistory>(
    `https://api.raydium.io/v2/change-wallet?oldWallet=${toPubString(walletAddress)}`
  )
  const currentBindWalletAddress = history?.success && history.wallet ? history.wallet : undefined
  // const haveBindAlready = !!currentBindWalletAddress
  return currentBindWalletAddress
}

export async function setWalletMigrateTarget(
  walletAddress: PublicKeyish,
  migrateTarget: PublicKeyish,
  { signature }: { signature: string }
): Promise<WalletMigrateResponse | undefined> {
  return jFetch<WalletMigrateResponse>(`https://api.raydium.io/v2/change-wallet`, {
    headers: { 'content-type': 'application/json' },
    method: 'POST',
    body: JSON.stringify({ signature, oldWallet: toPubString(walletAddress), newWallet: toPubString(migrateTarget) })
  })
}
