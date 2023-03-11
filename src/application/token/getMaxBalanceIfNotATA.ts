import useWallet from '@/application/wallet/useWallet'
import toPubString from '@/functions/format/toMintString'
import { PublicKeyish, ZERO } from '@raydium-io/raydium-sdk'

export function getMaxBalanceBNIfNotATA(mint: PublicKeyish | undefined) {
  if (!mint) return undefined
  const ataTokenAmount = useWallet.getState().getRawBalance(mint)
  if (ataTokenAmount) return ataTokenAmount
  const allTokenAccounts = useWallet.getState().allTokenAccounts
  const targetTokenAccounts = allTokenAccounts.filter((t) => toPubString(t.mint) === toPubString(mint))
  const tokenAccountBN =
    targetTokenAccounts.length > 0
      ? targetTokenAccounts.reduce((acc, cur) => (acc.gt(cur.amount) ? acc : cur.amount), ZERO)
      : undefined
  return tokenAccountBN
}
