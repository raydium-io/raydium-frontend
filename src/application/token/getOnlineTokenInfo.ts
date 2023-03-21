import { SPL_MINT_LAYOUT } from '@raydium-io/raydium-sdk'
import { AccountInfo } from '@solana/web3.js'

import toPubString, { toPub } from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'

import useToken from './useToken'

export async function verifyToken(
  mintish: PublicKeyish,
  options?: {
    noLog?: boolean
    /** if provided, not need get again */
    cachedAccountInfo?: AccountInfo<Buffer>
  }
) {
  try {
    const { connection } = useConnection.getState() // TEST devnet
    if (!connection) return false
    const tokenAccount = options?.cachedAccountInfo ?? (await connection.getAccountInfo(toPub(mintish)))
    if (!tokenAccount) return false
    if (tokenAccount.data.length !== SPL_MINT_LAYOUT.span) return false
    const layout = SPL_MINT_LAYOUT.decode(tokenAccount.data)

    const { tokenListSettings } = useToken.getState()
    const { logError } = useNotification.getState()
    const { decimals, freezeAuthorityOption } = layout ?? {}
    const isAPIToken =
      tokenListSettings['Raydium Token List'].mints?.has(toPubString(mintish)) ||
      tokenListSettings['Solana Token List'].mints?.has(toPubString(mintish))

    if (decimals != null && !isAPIToken && freezeAuthorityOption === 1) {
      if (!options?.noLog) {
        logError('Token Verify Error', 'Token freeze authority enabled')
      }
      return false
    }
    return true
  } catch {
    return false
  }
}
/**
 * need connection
 */
export async function getOnlineTokenInfo(mintish: PublicKeyish, options?: { shouldVerification?: boolean }) {
  try {
    const { connection } = useConnection.getState() // TEST devnet
    if (!connection) return
    const tokenAccount = await connection.getAccountInfo(toPub(mintish))
    if (!tokenAccount) return
    if (tokenAccount.data.length !== SPL_MINT_LAYOUT.span) return
    const layout = SPL_MINT_LAYOUT.decode(tokenAccount.data)

    if (options?.shouldVerification) {
      const { tokens } = useToken.getState()
      const logError = useNotification((s) => s.logError)
      const { decimals, freezeAuthorityOption } = layout ?? {}
      if (decimals != null && !tokens[toPubString(mintish)] && freezeAuthorityOption === 1) {
        logError('Token Verify Error', 'Token freeze authority enabled')
        return undefined
      } else {
        return layout
      }
    }
    return layout
  } catch {
    return
  }
}

/**
 * need connection
 */
export async function getOnlineTokenDecimals(mintish: PublicKeyish, options?: { shouldVerification?: boolean }) {
  const { decimals } = (await getOnlineTokenInfo(mintish, options)) ?? {}
  return decimals
}
