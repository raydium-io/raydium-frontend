import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { TokenAmount, getTransferAmountFee } from '@raydium-io/raydium-sdk'
import { getEpochInfo } from '../clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '../clmmMigration/getMultiMintInfos'

export type ITransferAmountFee = {
  amount: TokenAmount
  fee?: TokenAmount
  /** unit: s */
  expirationTime?: number
}
export async function getTransferFeeInfos({ amount, addFee }: { amount: TokenAmount; addFee?: boolean }) {
  const mint = amount.token.mint

  const [epochInfo, mintInfos] = await Promise.all([getEpochInfo(), getMultiMintInfos({ mints: amount.token.mint })])

  const feeConfig = mintInfos[toPubString(mint)]?.feeConfig

  const rawInfo = getTransferAmountFee(amount.raw, feeConfig, epochInfo, Boolean(addFee))

  const info: ITransferAmountFee = {
    amount: toTokenAmount(amount.token, rawInfo.amount),
    fee: rawInfo.fee != null ? toTokenAmount(amount.token, rawInfo.fee) : undefined,
    expirationTime: rawInfo.expirationTime
  }
  return info
}
