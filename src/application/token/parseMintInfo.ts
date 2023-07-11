import { PublicKeyish } from '@raydium-io/raydium-sdk'
import { TokenMintInfo, getOnlineTokenInfo } from './getOnlineTokenInfo'
import { gte, isMeaningfulNumber, lt } from '@/functions/numberish/compare'
import toPubString from '@/functions/format/toMintString'
import { isToken2022 } from './isToken2022'
import { Numberish } from '@/types/constants'
import { div } from '@/functions/numberish/operations'

export function parseMintInfo(info: TokenMintInfo, amount?: Numberish) {
  return {
    isTransferable: !(
      isMeaningfulNumber(amount) &&
      gte(info.transferFeePercent, 1 /*  BPS max 100% */) &&
      lt(amount, div(info.maximumFee, 1))
    )
  }
}

export async function isTransactableToken(mintish: PublicKeyish, amount?: Numberish) {
  const mint = toPubString(mintish)
  if (!isToken2022(mint)) return true
  const mintInfo = getOnlineTokenInfo(mint)
  const isTransactable = mintInfo.then((mintInfo) => {
    if (!mintInfo) return false
    return parseMintInfo(mintInfo, amount).isTransferable
  })
  return isTransactable
}
