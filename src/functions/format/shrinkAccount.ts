import { PublicKey } from '@solana/web3.js'

import toPubString from './toMintString'

export function shrinkAccount(inputAccount: string | PublicKey | undefined, headKeep = 5, tailKeep = 5) {
  if (!inputAccount) return
  if (inputAccount instanceof PublicKey) {
    inputAccount = toPubString(inputAccount)
  }

  return (
    inputAccount.substring(0, headKeep) +
    '...' +
    inputAccount.substring(inputAccount.length - tailKeep, inputAccount.length)
  )
}
