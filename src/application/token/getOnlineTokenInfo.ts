import { Fraction, TOKEN_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import { AccountInfo } from '@solana/web3.js'

import toPubString, { toPub } from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'

import assert from '@/functions/assert'
import { isPubEqual } from '@/functions/judgers/areEqual'
import { div } from '@/functions/numberish/operations'
import { TOKEN_2022_PROGRAM_ID, getTransferFeeConfig, unpackMint } from '@solana/spl-token'
import useToken from './useToken'

const verifyWhiteList = [{ mint: 'Fishy64jCaa3ooqXw7BHtKvYD8BTkSyAPh6RNE3xZpcN', decimals: 6, is2022Token: false }] // Temporary force white list

export async function verifyToken(
  mintish: PublicKeyish,
  options?: {
    noLog?: boolean
    /** if provided, not need get again */
    cachedAccountInfo?: AccountInfo<Buffer>
    canWhiteList?: boolean
  }
): Promise<TokenMintInfo | false | undefined> {
  if (options?.canWhiteList && verifyWhiteList.find((i) => i.mint === toPubString(mintish)))
    return verifyWhiteList.find((i) => i.mint === toPubString(mintish))! // Temporary force
  const { connection } = useConnection.getState() // TEST devnet
  if (!connection) return undefined
  const info = await getOnlineTokenInfo(mintish, { cachedAccountInfo: options?.cachedAccountInfo })
  if (!info) return false
  const { decimals, freezeAuthority } = info

  const { tokenListSettings } = useToken.getState()
  const { logError } = useNotification.getState()
  const isAPIToken =
    tokenListSettings['Raydium Token List'].mints?.has(toPubString(mintish)) ||
    tokenListSettings['Solana Token List'].mints?.has(toPubString(mintish))

  if (decimals != null && !isAPIToken && Boolean(freezeAuthority)) {
    if (!options?.noLog) {
      logError('Token Verify Error', 'Token freeze authority enabled')
    }
    return false
  }
  return info
}

type TokenMintInfo = {
  is2022Token: boolean
  mint: string
  decimals: number
  freezeAuthority?: string
  transferFeeBasisPoints?: number
  maximumFee?: Fraction
}
/**
 * need connection
 */
export async function getOnlineTokenInfo(
  mintish: PublicKeyish,
  options?: { cachedAccountInfo?: AccountInfo<Buffer> }
): Promise<TokenMintInfo> {
  if (!mintish) return Promise.reject('mintish is empty')
  const { connection } = useConnection.getState() // TEST devnet
  assert(connection, "must set connection to get token's online token info")
  const mintAccount = options?.cachedAccountInfo ?? (await connection.getAccountInfo(toPub(mintish)))
  assert(mintAccount, "can't fetch mintAccount")
  const isNormalToken = isPubEqual(mintAccount.owner, TOKEN_PROGRAM_ID)
  const is2022Token = isPubEqual(mintAccount.owner, TOKEN_2022_PROGRAM_ID)
  assert(isNormalToken || is2022Token, 'input mint is not token ')
  const mintData = unpackMint(toPub(mintish), mintAccount, is2022Token ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID)
  const dfee = getTransferFeeConfig(mintData)
  return {
    is2022Token,
    mint: toPubString(mintish),
    decimals: mintData.decimals,
    freezeAuthority: toPubString(mintData.freezeAuthority) || undefined,
    transferFeeBasisPoints:
      dfee?.newerTransferFee.transferFeeBasisPoints != null ? dfee.newerTransferFee.transferFeeBasisPoints : undefined,
    maximumFee:
      dfee?.newerTransferFee.maximumFee != null
        ? div(dfee.newerTransferFee.maximumFee, 10 ** mintData.decimals)
        : undefined
  }
}

/**
 * need connection
 */
export async function getOnlineTokenDecimals(mintish: PublicKeyish) {
  const { decimals } = (await getOnlineTokenInfo(mintish)) ?? {}
  return decimals
}

const cache = new Map<string, boolean>()

export async function isOnlineToken2022(mintish: PublicKeyish) {
  if (cache.has(toPubString(mintish))) return cache.get(toPubString(mintish))!
  const { connection } = useConnection.getState() // TEST devnet
  assert(connection, "must set connection to get token's online token info")
  const mintAccount = await connection.getAccountInfo(toPub(mintish))
  assert(mintAccount, "can't fetch mintAccount")
  const is2022Token = isPubEqual(mintAccount.owner, TOKEN_2022_PROGRAM_ID)
  cache.set(toPubString(mintish), is2022Token)
  return is2022Token
}
