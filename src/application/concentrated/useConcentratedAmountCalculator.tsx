import { AmmV3, GetTransferAmountFee, getTransferAmountFee } from '@raydium-io/raydium-sdk'
import { EpochInfo } from '@solana/web3.js'
import BN from 'bn.js'
import { useCallback, useEffect, useMemo } from 'react'

import useAppSettings from '@/application/common/useAppSettings'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'
import { getEpochInfo } from '../clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '../clmmMigration/getMultiMintInfos'
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

  const calcConcentratedPairsAmount = useCallback(async () => {
    if (!currentAmmPool) return
    // no set coin1 or coin2
    if (!coin1) return
    if (!coin2) return

    // no set priceUpperTick or priceLowerTick
    if (priceUpperTick == null) return
    if (priceLowerTick == null) return

    if (isRemoveDialogOpen && isInput === false) return // while removing liquidity, need to know the source is from input or from slider

    const isFocus1 = userCursorSide === 'coin1'
    const isCoin1Base = isMintEqual(coin1.mint, currentAmmPool.state.mintA.mint)
    const isPairPoolDirectionEq = (isFocus1 && isCoin1Base) || (!isCoin1Base && !isFocus1)

    const inputAmount = isFocus1 ? coin1Amount : coin2Amount
    const inputMint = toPubString(isFocus1 ? coin1.mint : coin2.mint)
    const outputMint = toPubString(isFocus1 ? coin2.mint : coin1.mint)
    const hasInput = inputAmount !== undefined && inputAmount !== ''
    const inputAmountBN = isFocus1
      ? toBN(mul(coin1Amount ?? 0, 10 ** coin1.decimals))
      : toBN(mul(coin2Amount ?? 0, 10 ** coin2.decimals))

    const [token2022Infos, epochInfo] = await Promise.all([
      getMultiMintInfos({ mints: [coin1.mint, coin2.mint] }),
      getEpochInfo()
    ])
    try {
      const { liquidity, amountSlippageA, amountSlippageB } =
        isRemoveDialogOpen &&
        currentAmmPool &&
        position &&
        targetUserPositionAccount &&
        targetUserPositionAccount.amountA &&
        targetUserPositionAccount.amountB &&
        isMeaningfulNumber(position.liquidity)
          ? await getRemoveLiquidityAmountOutFromAmountIn({
              inputAmountBN,
              maxLiquidity: position.liquidity,
              inputMint,
              outputMint,
              amountA: toBN(position.amountA),
              amountB: toBN(position.amountB),
              isFocus1,
              epochInfo
            })
          : AmmV3.getLiquidityAmountOutFromAmountIn({
              poolInfo: currentAmmPool.state,
              slippage: 0,
              inputA: isPairPoolDirectionEq,
              tickUpper: Math.max(priceUpperTick, priceLowerTick),
              tickLower: Math.min(priceLowerTick, priceUpperTick),
              amount: inputAmountBN,
              add: !isRemoveDialogOpen,
              epochInfo,
              token2022Infos,
              amountHasFee: true
            })

      const coin1SlippageResult = isCoin1Base ? amountSlippageA : amountSlippageB
      const coin2SlippageResult = isCoin1Base ? amountSlippageB : amountSlippageA
      const coin1SlippageAmount = toTokenAmount(coin1, coin1SlippageResult.amount)

      const coin1AmountFee = coin1SlippageResult.fee && toTokenAmount(coin1, coin1SlippageResult.fee)
      const coin1ExpirationTime = coin1SlippageResult.expirationTime
      const coin2SlippageAmount = toTokenAmount(coin2, coin2SlippageResult.amount)
      const coin2AmountFee = coin2SlippageResult.fee && toTokenAmount(coin2, coin2SlippageResult.fee)
      const coin2ExpirationTime = coin2SlippageResult.expirationTime

      const params = {
        coin1Amount: isFocus1 ? coin1Amount : hasInput ? coin1SlippageAmount : undefined,
        coin1SlippageAmount: isFocus1 ? coin1Amount : hasInput ? coin1SlippageAmount : undefined,
        coin1AmountFee,
        coin1ExpirationTime: hasInput ? coin1ExpirationTime : undefined,

        coin2Amount: isFocus1 ? (hasInput ? coin2SlippageAmount : undefined) : coin2Amount,
        coin2SlippageAmount: isFocus1 ? (hasInput ? coin2SlippageAmount : undefined) : coin2Amount,
        coin2AmountFee,
        coin2ExpirationTime: hasInput ? coin2ExpirationTime : undefined,

        liquidity
      }
      useConcentrated.setState(params)
      // eslint-disable-next-line no-empty
    } catch (err) {}
  }, [
    coin1,
    toString(userCursorSide === 'coin1' ? coin1Amount : coin2Amount),
    priceUpperTick,
    coin2,
    priceLowerTick,
    userCursorSide,
    currentAmmPool,
    isRemoveDialogOpen,
    isInput,
    targetUserPositionAccount,
    position
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

async function getRemoveLiquidityAmountOutFromAmountIn({
  inputAmountBN,
  maxLiquidity,
  inputMint,
  outputMint,
  amountA,
  amountB,
  epochInfo,
  isFocus1
}: {
  inputAmountBN: BN
  maxLiquidity: BN
  inputMint: string
  outputMint: string
  amountA: BN
  amountB: BN
  epochInfo: EpochInfo
  isFocus1: boolean
}): Promise<{
  liquidity: BN
  amountSlippageA: GetTransferAmountFee
  amountSlippageB: GetTransferAmountFee
  amountA: GetTransferAmountFee
  amountB: GetTransferAmountFee
}> {
  const maxDenominator = isFocus1 ? amountA : amountB
  const inputRatio = div(inputAmountBN, maxDenominator)
  const outputAmount = toBN(isFocus1 ? mul(amountB, inputRatio) : mul(amountA, inputRatio))

  const mintInfos = await getMultiMintInfos({
    mints: [inputMint, outputMint]
  })
  const inputMintInfo = mintInfos[inputMint]
  const outputMintInfo = mintInfos[outputMint]
  return {
    liquidity: toBN(mul(maxLiquidity, inputRatio)),
    amountA: getTransferAmountFee(
      isFocus1 ? inputAmountBN : outputAmount,
      (isFocus1 ? inputMintInfo : outputMintInfo).feeConfig,
      epochInfo,
      false
    ),
    amountB: getTransferAmountFee(
      isFocus1 ? outputAmount : inputAmountBN,
      (isFocus1 ? outputMintInfo : inputMintInfo).feeConfig,
      epochInfo,
      false
    ),
    amountSlippageA: getTransferAmountFee(
      isFocus1 ? inputAmountBN : outputAmount,
      (isFocus1 ? inputMintInfo : outputMintInfo).feeConfig,
      epochInfo,
      false
    ),
    amountSlippageB: getTransferAmountFee(
      isFocus1 ? outputAmount : inputAmountBN,
      (isFocus1 ? outputMintInfo : inputMintInfo).feeConfig,
      epochInfo,
      false
    )
  }
}

// return {
//   liquidity: toBN(mul(maxLiquidity, inputRatio)),

//   // amountSlippageA: isFocus1 ? inputAmountBN : outputAmount,
//   // amountSlippageB: isFocus1 ? outputAmount : inputAmountBN,
//   // amountA: isFocus1 ? inputAmountBN : outputAmount,
//   // amountB: isFocus1 ? outputAmount : inputAmountBN,
//   amountA: {
//     amount: isFocus1 ? inputAmountBN : outputAmount,
//     fee: toBN(0),
//     expirationTime
//   }
// }
// }
