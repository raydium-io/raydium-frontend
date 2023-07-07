import { Fraction, TOKEN_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import {
  getTransferFeeAmount, getTransferFeeConfig, TOKEN_2022_PROGRAM_ID, TransferFee, unpackMint
} from '@solana/spl-token'
import { AccountInfo } from '@solana/web3.js'

import { BN } from 'bn.js'

import assert from '@/functions/assert'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { isPubEqual } from '@/functions/judgers/areEqual'
import { div } from '@/functions/numberish/operations'
import { PublicKeyish } from '@/types/constants'

import { getEpochInfo } from '../clmmMigration/getEpochInfo'
import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'

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
  const { tokenListSettings } = useToken.getState()
  const { logError } = useNotification.getState()
  const isOfficialToken = tokenListSettings['Raydium Token List'].mints?.has(toPubString(mintish))

  if (options?.canWhiteList && verifyWhiteList.find((i) => i.mint === toPubString(mintish)))
    return verifyWhiteList.find((i) => i.mint === toPubString(mintish))! // Temporary force
  const { connection } = useConnection.getState() // TEST devnet
  if (!connection) return undefined
  const info = await getOnlineTokenInfo(mintish, { cachedAccountInfo: options?.cachedAccountInfo })
  if (!info) return false
  const { decimals, freezeAuthority } = info

  if (decimals != null && !isOfficialToken && Boolean(freezeAuthority)) {
    if (!options?.noLog) {
      logError('Token Verify Error', 'Token freeze authority enabled')
    }
    return false
  }
  return info
}

export type TokenMintInfo = {
  is2022Token: boolean
  mint: string
  decimals: number
  freezeAuthority?: string
  transferFeePercent?: number // Percent
  maximumFee?: Fraction
  nextTransferFeePercent?: number
  nextMaximumFee?: Fraction
  expirationTime?: number
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
  const [mintAccount, epochInfo] = await Promise.all([
    options?.cachedAccountInfo ?? connection.getAccountInfo(toPub(mintish)),
    getEpochInfo()
  ])
  assert(mintAccount, "can't fetch mintAccount")

  const isNormalToken = isPubEqual(mintAccount.owner, TOKEN_PROGRAM_ID)
  const is2022Token = isPubEqual(mintAccount.owner, TOKEN_2022_PROGRAM_ID)
  assert(isNormalToken || is2022Token, 'input mint is not token ')
  const mintData = unpackMint(toPub(mintish), mintAccount, is2022Token ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID)
  const dfee = getTransferFeeConfig(mintData)

  let transferFeePercent: number | undefined = undefined
  let maximumFee: Fraction | undefined = undefined

  let nextTransferFeePercent: number | undefined = undefined
  let nextMaximumFee: Fraction | undefined = undefined

  let expirationTime: number | undefined = undefined

  if (dfee) {
    const [nowFeeConfig, nextFeeConfig]: [TransferFee, TransferFee | undefined] = epochInfo.epoch < dfee.newerTransferFee.epoch ? [dfee.olderTransferFee, dfee.newerTransferFee] : [dfee.newerTransferFee, undefined]

    transferFeePercent = nowFeeConfig.transferFeeBasisPoints / 10000
    maximumFee = div(nowFeeConfig.maximumFee, 10 ** mintData.decimals)

    expirationTime = nextFeeConfig && epochInfo.epoch < nextFeeConfig.epoch ? (Number(nextFeeConfig.epoch) * epochInfo.slotsInEpoch - epochInfo.absoluteSlot) * 400 / 1000 : undefined

    nextTransferFeePercent = nextFeeConfig ? nextFeeConfig.transferFeeBasisPoints / 10000 : undefined
    nextMaximumFee = nextFeeConfig ? div(nextFeeConfig.maximumFee, 10 ** mintData.decimals) : undefined
  }
  return {
    is2022Token,
    mint: toPubString(mintish),
    decimals: mintData.decimals,
    freezeAuthority: toPubString(mintData.freezeAuthority) || undefined,
    transferFeePercent,
    maximumFee,
    nextTransferFeePercent,
    nextMaximumFee,
    expirationTime,
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
