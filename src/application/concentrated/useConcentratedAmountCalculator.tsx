import { useEffect, useMemo } from 'react'

import { AmmV3 } from 'test-r-sdk'

import useAppSettings from '@/application/appSettings/useAppSettings'
import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'

import useConcentrated from './useConcentrated'

/**
 * will auto fresh  concentrated's coin1Amount and coin2Amount with concentrated's jsonInfos and coin1 and coin2
 * @requires {@link useConcentrated `useConcentrated`}
 */
export default function useConcentratedAmountCalculator() {
  const slippageToleranceByConfig = useAppSettings((s) => s.slippageTolerance)
  const {
    coin1,
    coin1Amount,
    priceUpperTick,
    coin2,
    coin2Amount,
    priceLowerTick,
    focusSide,
    userCursorSide,
    isRemoveDialogOpen
  } = useConcentrated()

  const slippageTolerance = useMemo(() => {
    if (isRemoveDialogOpen) return 0
    return slippageToleranceByConfig
  }, [isRemoveDialogOpen, slippageToleranceByConfig])

  useEffect(() => {
    try {
      calcConcentratedPairsAmount(slippageTolerance)
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
function calcConcentratedPairsAmount(slippageTolerance: Numberish): void {
  // const { slippageTolerance } = useAppSettings.getState()
  const {
    coin1,
    coin1Amount,
    priceUpperTick,
    coin2,
    coin2Amount,
    priceLowerTick,
    userCursorSide,
    currentAmmPool,
    isRemoveDialogOpen,
    isInput
  } = useConcentrated.getState()
  assert(currentAmmPool, 'not pool info')
  assert(coin1, 'not set coin1')
  assert(priceUpperTick, 'not set priceUpperTick')
  assert(coin2, 'not set coin2')
  assert(priceLowerTick, 'not set priceLowerTick')

  if (isRemoveDialogOpen && isInput === false) return // while removing liquidity, need to know the source is from input or from slider

  const isFocus1 = userCursorSide === 'coin1'
  const isCoin1Base = isMintEqual(coin1.mint, currentAmmPool.state.mintA.mint)
  const isPairPoolDirectionEq = (isFocus1 && isCoin1Base) || (!isCoin1Base && !isFocus1)

  const inputAmount = isFocus1 ? coin1Amount : coin2Amount
  const hasInput = inputAmount !== undefined && inputAmount !== ''
  const inputAmountBN = isFocus1
    ? toBN(mul(coin1Amount ?? 0, 10 ** coin1.decimals))
    : toBN(mul(coin2Amount ?? 0, 10 ** coin2.decimals))
  const { liquidity, amountSlippageA, amountSlippageB } = AmmV3.getLiquidityAmountOutFromAmountIn({
    poolInfo: currentAmmPool.state,
    slippage: Number(toString(slippageTolerance)),
    inputA: isPairPoolDirectionEq,
    tickUpper: Math.max(priceUpperTick, priceLowerTick),
    tickLower: Math.min(priceLowerTick, priceUpperTick),
    amount: inputAmountBN,
    add: !isRemoveDialogOpen // SDK flag for math round direction
  })

  if (isFocus1) {
    useConcentrated.setState({
      coin2Amount: hasInput
        ? toTokenAmount(coin2, isCoin1Base ? amountSlippageB : amountSlippageA).toFixed()
        : undefined
    })
  } else {
    useConcentrated.setState({
      coin1Amount: hasInput ? toTokenAmount(coin1, isCoin1Base ? amountSlippageA : amountSlippageB) : undefined
    })
  }

  useConcentrated.setState({ liquidity })
}
