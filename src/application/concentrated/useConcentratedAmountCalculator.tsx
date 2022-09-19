import useAppSettings from '@/application/appSettings/useAppSettings'
import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'
import { useEffect } from 'react'
import { AmmV3 } from 'test-r-sdk'
import useConcentrated from './useConcentrated'

/**
 * will auto fresh  concentrated's coin1Amount and coin2Amount with concentrated's jsonInfos and coin1 and coin2
 * @requires {@link useConcentrated `useConcentrated`}
 */
export default function useConcentratedAmountCalculator() {
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)
  const { coin1, coin1Amount, priceUpperTick, coin2, coin2Amount, priceLowerTick, focusSide, userCursorSide } =
    useConcentrated()
  useEffect(() => {
    if (!isMeaningfulNumber(userCursorSide === 'coin1' ? coin1Amount : coin2Amount)) return
    try {
      calcConcentratedPairsAmount()
    } catch (err) {
      /* still can't calc amount */
      // eslint-disable-next-line no-console
      console.log(`still can't calc amount`, err instanceof Error ? err.message : err)
    }
  }, [
    slippageTolerance,
    coin1,
    userCursorSide === 'coin1' ? coin1Amount : coin2Amount,
    priceUpperTick,
    coin2,
    priceLowerTick,
    focusSide,
    userCursorSide
  ])
}

/** dirty */
function calcConcentratedPairsAmount(): void {
  const { slippageTolerance } = useAppSettings.getState()
  const { coin1, coin1Amount, priceUpperTick, coin2, coin2Amount, priceLowerTick, userCursorSide, currentAmmPool } =
    useConcentrated.getState()
  assert(currentAmmPool, 'not pool info')
  assert(coin1, 'not set coin1')
  assert(priceUpperTick, 'not set priceUpperTick')
  assert(coin2, 'not set coin2')
  assert(priceLowerTick, 'not set priceLowerTick')
  const isFixA = userCursorSide === 'coin1'
  const { liquidity, amountA, amountB } = AmmV3.getLiquidityAmountOutFromAmountIn({
    poolInfo: currentAmmPool.state,
    slippage: Number(toString(slippageTolerance)),
    inputA: isFixA,
    tickUpper: priceUpperTick,
    tickLower: priceLowerTick,
    amount: isFixA
      ? toBN(mul(coin1Amount ?? 0, 10 ** coin1.decimals))
      : toBN(mul(coin2Amount ?? 0, 10 ** coin2.decimals)),
    add: true // NOTE what's is it ?
  })
  if (isFixA) {
    useConcentrated.setState({ coin2Amount: toTokenAmount(coin2, amountB) })
  } else {
    useConcentrated.setState({ coin1Amount: toTokenAmount(coin1, amountA) })
  }
  useConcentrated.setState({ liquidity })
}
