import { inClient } from '@/functions/judgers/isSSR'
import { PublicKey } from '@solana/web3.js'
import base58 from 'bs58'

export async function getSignMessage(
  message: string
): Promise<{ publicKey: PublicKey; encodedSignature: string } | undefined> {
  if (!inClient) return
  const { publicKey, signature } = await (window as any).solana.signMessage(new TextEncoder().encode(message), 'utf8')
  return { publicKey, encodedSignature: base58.encode(signature) }
}

export async function getNewWalletSignature(newWallet: string) {
  const message = `Reassign my staking eligibility to new wallet: ${newWallet}`
  return getSignMessage(message)
}
