import { Fraction, TOKEN_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import { AccountInfo } from '@solana/web3.js'

import toPubString, { toPub } from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'

import assert from '@/functions/assert'
import { createTimeoutMap } from '@/functions/createTimeoutMap'
import jFetch from '@/functions/dom/jFetch'
import { isPubEqual } from '@/functions/judgers/areEqual'
import { div } from '@/functions/numberish/operations'
import { TOKEN_2022_PROGRAM_ID, getTransferFeeConfig, unpackMint } from '@solana/spl-token'
import base58 from 'bs58'
import { getEpochInfo } from '../clmmMigration/getEpochInfo'
import useToken, { RAYDIUM_MAINNET_TOKEN_LIST_NAME } from './useToken'

let onlineWhiteList: string[] | undefined = undefined

const verifyWhiteList = [
  { mint: 'AhhdRu5YZdjVkKR3wbnUDaymVQL2ucjMQ63sZ3LFHsch', decimals: 9, is2022Token: false },
  { mint: 'C4Kkr9NZU3VbyedcgutU6LKmi6MKz81sx6gRmk5pX519', decimals: 9, is2022Token: false },
  { mint: '9TPL8droGJ7jThsq4momaoz6uhTcvX2SeMqipoPmNa8R', decimals: 9, is2022Token: false }
]

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
  const isOfficialToken = tokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME].mints?.has(toPubString(mintish))

  // load white list if needed
  if (!onlineWhiteList && options?.canWhiteList) {
    const data = await jFetch('https://api.debridge.finance/api/Pairs/getForChain?chainId=7565164')
    try {
      onlineWhiteList = data.map((i) => {
        try {
          return base58.encode(Buffer.from(i.tokenAddress.slice(2), 'hex')) // witer:Rudy
        } catch {
          return ''
        }
      })
    } catch {
      onlineWhiteList = []
    }
  }

  if (options?.canWhiteList && onlineWhiteList?.find((i) => i === toPubString(mintish))) {
    return getOnlineTokenInfo(mintish, { cachedAccountInfo: options?.cachedAccountInfo })
  }

  if (options?.canWhiteList && verifyWhiteList.find((i) => i.mint === toPubString(mintish)))
    return verifyWhiteList.find((i) => i.mint === toPubString(mintish))! // Temporary force

  const { connection } = useConnection.getState()
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

  nextTransferFeePercent?: number // Percent
  nextMaximumFee?: Fraction
  expirationTimeOffset?: number
}

const mintInfoCache = createTimeoutMap<string, Promise<TokenMintInfo>>({ maxAgeMs: 30 * 1000 })

/**
 * need connection
 */
export async function getOnlineTokenInfo(
  mintish: PublicKeyish,
  options?: { cachedAccountInfo?: AccountInfo<Buffer> }
): Promise<TokenMintInfo> {
  if (!mintish) return Promise.reject('mintish is empty')
  if (mintInfoCache.has(toPubString(mintish))) return mintInfoCache.get(toPubString(mintish))!
  const { connection } = useConnection.getState() // TEST devnet
  assert(connection, "must set connection to get token's online token info")
  const pub = toPub(mintish)
  assert(pub, 'provided string is not publicKey')
  const [mintAccount, epochInfo] = await Promise.all([
    options?.cachedAccountInfo ?? connection.getAccountInfo(pub),
    getEpochInfo()
  ])
  assert(mintAccount, "can't fetch mintAccount")

  const isNormalToken = isPubEqual(mintAccount.owner, TOKEN_PROGRAM_ID)
  const is2022Token = isPubEqual(mintAccount.owner, TOKEN_2022_PROGRAM_ID)
  assert(isNormalToken || is2022Token, 'input mint is not token ')
  const mintData = unpackMint(toPub(mintish), mintAccount, is2022Token ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID)
  const dfee = getTransferFeeConfig(mintData)
  const [nowFeeConfig, nextFeeConfig] = dfee
    ? epochInfo.epoch < dfee.newerTransferFee.epoch
      ? [dfee.olderTransferFee, dfee.newerTransferFee]
      : [dfee.newerTransferFee, undefined]
    : []
  const tokenMintInfo = {
    is2022Token,
    mint: toPubString(mintish),
    decimals: mintData.decimals,
    freezeAuthority: toPubString(mintData.freezeAuthority) || undefined,
    // now
    transferFeePercent: nowFeeConfig && nowFeeConfig.transferFeeBasisPoints / 10000 /* number unit */,
    maximumFee: nowFeeConfig && div(nowFeeConfig.maximumFee, 10 ** mintData.decimals),
    //next
    nextTransferFeePercent: nextFeeConfig && nextFeeConfig.transferFeeBasisPoints / 10000,
    nextMaximumFee: nextFeeConfig && div(nextFeeConfig.maximumFee, 10 ** mintData.decimals),
    //time offset
    expirationTimeOffset:
      nextFeeConfig && epochInfo.epoch < nextFeeConfig.epoch
        ? ((Number(nextFeeConfig.epoch) * epochInfo.slotsInEpoch - epochInfo.absoluteSlot) * 400) / 1000 // author: Rudy
        : undefined
  }
  mintInfoCache.set(toPubString(mintish), Promise.resolve(tokenMintInfo))
  return tokenMintInfo
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
