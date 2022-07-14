import { toPub } from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'
import { SPL_MINT_LAYOUT } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'

/**
 * need connection
 */
export async function getOnlineTokenInfo(mintish: PublicKeyish) {
  try {
    const { connection } = useConnection.getState()
    if (!connection) return
    const tokenAccount = await connection.getAccountInfo(toPub(mintish))
    if (!tokenAccount) return
    if (tokenAccount.data.length !== SPL_MINT_LAYOUT.span) return
    return SPL_MINT_LAYOUT.decode(tokenAccount.data)
  } catch {
    return
  }
}

/**
 * need connection
 */
export async function getOnlineTokenDecimals(mintish: PublicKeyish) {
  const { decimals } = (await getOnlineTokenInfo(mintish)) ?? {}
  return decimals
}
