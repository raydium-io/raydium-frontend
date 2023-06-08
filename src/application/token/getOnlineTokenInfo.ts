import { SPL_MINT_LAYOUT, TOKEN_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import { AccountInfo } from '@solana/web3.js'

import toPubString, { toPub } from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'

import useToken from './useToken'
import { isPubEqual } from '@/functions/judgers/areEqual'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'

const verifyWhiteList = ['Fishy64jCaa3ooqXw7BHtKvYD8BTkSyAPh6RNE3xZpcN'] // Temporary force white list

export async function verifyToken(
  mintish: PublicKeyish,
  options?: {
    noLog?: boolean
    /** if provided, not need get again */
    cachedAccountInfo?: AccountInfo<Buffer>
    canWhiteList?: boolean
  }
): Promise<{ is2022Token?: boolean } | false | undefined> {
  if (options?.canWhiteList && verifyWhiteList.includes(toPubString(mintish))) return {} // Temporary force
  try {
    const { connection } = useConnection.getState() // TEST devnet
    if (!connection) return undefined
    const tokenAccount = options?.cachedAccountInfo ?? (await connection.getAccountInfo(toPub(mintish)))
    if (!tokenAccount) return false
    const isNormalToken = isPubEqual(tokenAccount.owner, TOKEN_PROGRAM_ID)
    const is2022Token = isPubEqual(tokenAccount.owner, TOKEN_2022_PROGRAM_ID)
    if (!isNormalToken && !is2022Token) return false
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
    return { is2022Token }
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
    const isNormalToken = isPubEqual(tokenAccount.owner, TOKEN_PROGRAM_ID)
    const is2022Token = isPubEqual(tokenAccount.owner, TOKEN_2022_PROGRAM_ID)
    if (!isNormalToken && !is2022Token) return
    if (tokenAccount.data.length !== SPL_MINT_LAYOUT.span) return
    const layout = SPL_MINT_LAYOUT.decode(tokenAccount.data)

    if (options?.shouldVerification) {
      const { tokens } = useToken.getState()
      const logError = useNotification((s) => s.logError)
      const { decimals, freezeAuthorityOption } = layout ?? {}
      if (decimals != null && !tokens[toPubString(mintish)] && freezeAuthorityOption === 1) {
        logError('Token Verify Error', 'Token freeze authority enabled')
        return undefined
      }
    }
    return { ...layout, is2022Token }
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
