import asyncMap from '@/functions/asyncMap'
import { getOnlineTokenDecimals } from './getOnlineTokenInfo'
import { createSplToken } from './useTokenListsLoader'

export async function getTokenFromLocalStorage(localStorageTokens: { mint: string }[]) {
  const localStorageTokenMints = localStorageTokens.map((token) => token.mint)
  const tokenDecimals = await asyncMap(localStorageTokenMints, (mint) => getOnlineTokenDecimals(mint))
  const tokens = tokenDecimals.map((decimals, idx) =>
    decimals ? createSplToken({ ...localStorageTokens[idx], decimals, userAdded: true }) : undefined
  )
  return tokens
}
