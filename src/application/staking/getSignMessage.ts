import { inClient } from '@/functions/judgers/isSSR'
import base58 from 'bs58'
import useWallet from '../wallet/useWallet'

export async function getSignMessage(message: string): Promise<string | undefined> {
  if (!inClient) return
  const signMessage = useWallet.getState().signMessage
  const signature = await signMessage?.(new TextEncoder().encode(message))
  return signature && base58.encode(signature)
}

export async function getNewWalletSignature(newWallet: string) {
  const message = `Reassign my staking eligibility to new wallet: ${newWallet}`
  return getSignMessage(message)
}
