import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isArray } from '@/functions/judgers/dateType'
import { minus } from '@/functions/numberish/operations'
import { ReturnTypeFetchMultipleMintInfos, TokenAmount, getTransferAmountFee } from '@raydium-io/raydium-sdk'
import { EpochInfo } from '@solana/web3.js'
import { getEpochInfo } from '../clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '../clmmMigration/getMultiMintInfos'
import { isToken2022 } from './isToken2022'

export type ITransferAmountFee = {
  amount: TokenAmount
  fee?: TokenAmount
  /* pure + fee = amount */
  pure: TokenAmount
  /** unit: s */
  expirationTime?: number
}

export async function getTransferFeeInfos<T extends TokenAmount | TokenAmount[]>({
  amount,
  addFee,
  fetchedEpochInfo = getEpochInfo(),
  fetchedMints = getMultiMintInfos({ mints: [amount].flat().map((i) => i.token.mint) })
}: {
  amount: T
  addFee?: boolean
  /** provied for faster fetch */
  fetchedEpochInfo?: Promise<EpochInfo> | EpochInfo
  /** provied for faster fetch */
  fetchedMints?: Promise<ReturnTypeFetchMultipleMintInfos> | ReturnTypeFetchMultipleMintInfos
}): Promise<(T extends any[] ? ITransferAmountFee[] : ITransferAmountFee) | undefined> {
  const [epochInfo, mintInfos] = await Promise.all([fetchedEpochInfo, fetchedMints])
  if (isArray(amount)) {
    const innerAmount = amount.filter((i) => isToken2022(i.token))
    return getTransferFeeInfosSync({ amount: innerAmount, addFee, mintInfos, epochInfo }) as any
  } else {
    if (!isToken2022(amount.token)) return undefined
    return getTransferFeeInfosSync({ amount, addFee, mintInfos, epochInfo })
  }
}

export function getTransferFeeInfosSync<T extends TokenAmount | TokenAmount[]>({
  amount,
  addFee,
  mintInfos,
  epochInfo
}: {
  amount: T
  addFee?: boolean
  /** provied for faster fetch */
  mintInfos: ReturnTypeFetchMultipleMintInfos
  epochInfo: EpochInfo
}): T extends any[] ? ITransferAmountFee[] : ITransferAmountFee {
  //@ts-expect-error no need to check
  return isArray(amount)
    ? amount.map((i) => getSignleTransferFeeInfosSync({ amount: i, addFee, mintInfos, epochInfo }))
    : getSignleTransferFeeInfosSync({ amount, addFee, mintInfos, epochInfo })
}

function getSignleTransferFeeInfosSync({
  amount,
  addFee,
  mintInfos,
  epochInfo
}: {
  amount: TokenAmount
  addFee?: boolean
  /** provied for faster fetch */
  mintInfos: ReturnTypeFetchMultipleMintInfos
  epochInfo: EpochInfo
}): ITransferAmountFee {
  const mint = amount.token.mint
  const feeConfig = mintInfos[toPubString(mint)]?.feeConfig
  const rawInfo = getTransferAmountFee(amount.raw, feeConfig, epochInfo, Boolean(addFee))
  const allTokenAmount = toTokenAmount(amount.token, rawInfo.amount)
  const fee = rawInfo.fee != null ? toTokenAmount(amount.token, rawInfo.fee) : undefined
  const pure = toTokenAmount(amount.token, minus(allTokenAmount, fee ?? 0), { alreadyDecimaled: true })
  const info = { amount: allTokenAmount, fee, pure, expirationTime: rawInfo.expirationTime } as ITransferAmountFee
  return info
}
