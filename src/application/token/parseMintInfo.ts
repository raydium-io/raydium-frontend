import { PublicKeyish } from '@raydium-io/raydium-sdk'
import { TokenMintInfo, getOnlineTokenInfo } from './getOnlineTokenInfo'
import { lt } from '@/functions/numberish/compare'
import toPubString from '@/functions/format/toMintString'
import { isToken2022 } from './isToken2022'

export function parseMintInfo(info: TokenMintInfo) {
  return {
    isTransferable: lt(info.transferFeePercent, 1 /*  BPS max 100% */)
  }
}

export async function isTransactableToken(mintish: PublicKeyish) {
  const mint = toPubString(mintish)
  if (!isToken2022(mint)) return true
  const mintInfo = getOnlineTokenInfo(mint)
  const isTransactable = mintInfo.then((mintInfo) => {
    if (!mintInfo) return false
    return parseMintInfo(mintInfo).isTransferable
  })
  return isTransactable
}
