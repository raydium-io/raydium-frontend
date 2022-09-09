import useAppSettings from '@/application/appSettings/useAppSettings'
import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
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
  const { coin1, coin1Amount, priceUpperTick, coin2, coin2Amount, priceLowerTick, focusSide } = useConcentrated()
  useEffect(() => {
    try {
      calcConcentratedPairsAmount()
    } catch (err) {
      /* still can't calc amount */
      // eslint-disable-next-line no-console
      console.log(`still can't calc amount`, err) /* TEST */
    }
  }, [
    slippageTolerance,
    coin1,
    focusSide === 'coin1' ? coin1Amount : coin2Amount,
    priceUpperTick,
    coin2,
    priceLowerTick,
    focusSide
  ])
}

/** dirty */
function calcConcentratedPairsAmount(): void {
  const { slippageTolerance } = useAppSettings.getState()
  const { coin1, coin1Amount, priceUpperTick, coin2, coin2Amount, priceLowerTick, focusSide } =
    useConcentrated.getState()
  assert(coin1, 'not set coin1')
  assert(priceUpperTick, 'not set priceUpperTick')
  assert(coin2, 'not set coin2')
  assert(priceLowerTick, 'not set priceLowerTick')
  const isFixA = focusSide === 'coin1'
  const { liquidity, amountOut } = AmmV3.getLiquidityAmountOutFromAmountIn({
    slippage: Number(toString(slippageTolerance)),
    inputA: isFixA,
    priceUpper: priceUpperTick,
    priceLower: priceLowerTick,
    amount: isFixA
      ? toBN(mul(coin1Amount ?? 0, 10 ** coin1.decimals))
      : toBN(mul(coin2Amount ?? 0, 10 ** coin2.decimals))
  })
  if (isFixA) {
    useConcentrated.setState({ coin2Amount: toTokenAmount(coin2, amountOut) })
  } else {
    useConcentrated.setState({ coin1Amount: toTokenAmount(coin1, amountOut) })
  }
  useConcentrated.setState({ liquidity })
}
