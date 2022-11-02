import { useCallback, useEffect, useMemo } from 'react'

import { AmmV3, ReturnTypeGetLiquidityAmountOutFromAmountIn } from '@raydium-io/raydium-sdk'

import BN from 'bn.js'

import useAppSettings from '@/application/common/useAppSettings'
import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'

import useConcentrated from './useConcentrated'

/**
 * will auto fresh  concentrated's coin1Amount and coin2Amount with concentrated's jsonInfos and coin1 and coin2
 * @requires {@link useConcentrated `useConcentrated`}
 */
export default function useConcentratedAmountCalculator() {
  const slippageToleranceByConfig = useAppSettings((s) => s.slippageTolerance)
  const coin1 = useConcentrated((s) => s.coin1)
  const coin1Amount = useConcentrated((s) => s.coin1Amount)
  const priceUpperTick = useConcentrated((s) => s.priceUpperTick)
  const coin2 = useConcentrated((s) => s.coin2)
  const coin2Amount = useConcentrated((s) => s.coin2Amount)
  const priceLowerTick = useConcentrated((s) => s.priceLowerTick)
  const userCursorSide = useConcentrated((s) => s.userCursorSide)
  const isRemoveDialogOpen = useConcentrated((s) => s.isRemoveDialogOpen)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const isInput = useConcentrated((s) => s.isInput)

  const slippageTolerance = useMemo(() => {
    if (isRemoveDialogOpen) return 0
    return slippageToleranceByConfig
  }, [isRemoveDialogOpen, slippageToleranceByConfig])

  const position = useMemo(() => {
    if (currentAmmPool && targetUserPositionAccount) {
      return currentAmmPool.positionAccount?.find(
        (p) => toPubString(p.nftMint) === toPubString(targetUserPositionAccount.nftMint)
      )
    }
    return undefined
  }, [currentAmmPool, targetUserPositionAccount])

  const calcConcentratedPairsAmount = useCallback(() => {
    assert(currentAmmPool, 'not pool info')
    assert(coin1, 'not set coin1')
    assert(priceUpperTick !== undefined, 'not set priceUpperTick')
    assert(coin2, 'not set coin2')
    assert(priceLowerTick !== undefined, 'not set priceLowerTick')

    if (isRemoveDialogOpen && isInput === false) return // while removing liquidity, need to know the source is from input or from slider

    const isFocus1 = userCursorSide === 'coin1'
    const isCoin1Base = isMintEqual(coin1.mint, currentAmmPool.state.mintA.mint)
    const isPairPoolDirectionEq = (isFocus1 && isCoin1Base) || (!isCoin1Base && !isFocus1)

    const inputAmount = isFocus1 ? coin1Amount : coin2Amount
    const hasInput = inputAmount !== undefined && inputAmount !== ''
    const inputAmountBN = isFocus1
      ? toBN(mul(coin1Amount ?? 0, 10 ** coin1.decimals))
      : toBN(mul(coin2Amount ?? 0, 10 ** coin2.decimals))

    const { liquidity, amountSlippageA, amountSlippageB } =
      isRemoveDialogOpen &&
      position &&
      targetUserPositionAccount &&
      targetUserPositionAccount.amountA &&
      targetUserPositionAccount.amountB &&
      isMeaningfulNumber(position.liquidity)
        ? getRemoveLiquidityAmountOutFromAmountIn(
            inputAmountBN,
            position?.liquidity,
            toBN(position.amountA),
            toBN(position.amountB),
            isFocus1
          )
        : AmmV3.getLiquidityAmountOutFromAmountIn({
            poolInfo: currentAmmPool.state,
            slippage: 0,
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
        coin1Amount: hasInput
          ? toTokenAmount(coin1, isCoin1Base ? amountSlippageA : amountSlippageB).toFixed()
          : undefined
      })
    }

    useConcentrated.setState({ liquidity })
  }, [
    coin1,
    coin1Amount,
    priceUpperTick,
    coin2,
    coin2Amount,
    priceLowerTick,
    userCursorSide,
    currentAmmPool,
    isRemoveDialogOpen,
    isInput,
    targetUserPositionAccount,
    position,
    slippageTolerance
  ])

  useEffect(() => {
    try {
      calcConcentratedPairsAmount()
    } catch (err) {
      /* still can't calc amount */
      // eslint-disable-next-line no-console
      console.log(`still can't calc amount`, err instanceof Error ? err.message : err)
    }
  }, [calcConcentratedPairsAmount])
}

function getRemoveLiquidityAmountOutFromAmountIn(
  inputAmountBN: BN,
  maxLiquidity: BN,
  amountA: BN,
  amountB: BN,
  isFocus1: boolean
): ReturnTypeGetLiquidityAmountOutFromAmountIn {
  const maxDenominator = isFocus1 ? amountA : amountB
  const newRatio = div(inputAmountBN, maxDenominator)
  const outputAmount = toBN(isFocus1 ? mul(amountB, newRatio) : mul(amountA, newRatio))

  return {
    liquidity: toBN(mul(maxLiquidity, newRatio)),
    amountSlippageA: isFocus1 ? inputAmountBN : outputAmount,
    amountSlippageB: isFocus1 ? outputAmount : inputAmountBN,
    amountA: isFocus1 ? inputAmountBN : outputAmount,
    amountB: isFocus1 ? outputAmount : inputAmountBN
  }
}
