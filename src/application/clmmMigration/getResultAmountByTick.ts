import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { AmmV3, AmmV3PoolInfo, TokenAmount } from '@raydium-io/raydium-sdk'

export function getResultAmountByTick(params: {
  info: AmmV3PoolInfo
  baseAmount: TokenAmount
  quoteAmount: TokenAmount
  tickLower: number
  tickUpper: number
  slippage: number
}) {
  const { amountA, amountB, liquidity } = AmmV3.getLiquidityFromAmounts({
    add: true, // backend force
    poolInfo: params.info,
    amountA: params.baseAmount.raw,
    amountB: params.quoteAmount.raw,
    tickLower: Math.min(params.tickLower, params.tickUpper),
    tickUpper: Math.max(params.tickLower, params.tickUpper),
    slippage: params.slippage
  })
  return {
    resultBaseAmount: toTokenAmount(params.baseAmount.token, amountA),
    resultQuoteAmount: toTokenAmount(params.quoteAmount.token, amountB),
    liquidity
  }
}
