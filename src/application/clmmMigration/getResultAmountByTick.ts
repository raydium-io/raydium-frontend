import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { Clmm, ClmmPoolInfo, TokenAmount } from '@raydium-io/raydium-sdk'
import { getMultiMintInfos } from './getMultiMintInfos'
import { getEpochInfo } from './getEpochInfo'

export async function getResultAmountByTick({
  info,
  baseAmount,
  quoteAmount,
  tickLower,
  tickUpper,
  slippage
}: {
  info: ClmmPoolInfo
  baseAmount: TokenAmount
  quoteAmount: TokenAmount
  tickLower: number
  tickUpper: number
  slippage: number
}) {
  const [token2022Infos, epochInfo] = await Promise.all([
    getMultiMintInfos({ mints: [info.mintA.mint, info.mintB.mint] }),
    getEpochInfo()
  ])
  const { amountA, amountB, liquidity, amountSlippageA, amountSlippageB } = Clmm.getLiquidityFromAmounts({
    add: true, // backend force
    poolInfo: info,
    amountA: baseAmount.raw,
    amountB: quoteAmount.raw,
    tickLower: Math.min(tickLower, tickUpper),
    tickUpper: Math.max(tickLower, tickUpper),
    slippage: slippage,
    token2022Infos,
    epochInfo
  })
  return {
    resultBaseAmount: toTokenAmount(baseAmount.token, amountA.amount),
    resultQuoteAmount: toTokenAmount(quoteAmount.token, amountB.amount),
    liquidity,
    amountSlippageBase: amountSlippageA,
    amountSlippageQuote: amountSlippageB
  }
}
