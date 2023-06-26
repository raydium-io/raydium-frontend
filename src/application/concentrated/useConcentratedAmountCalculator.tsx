import useAppSettings from '@/application/common/useAppSettings'
import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { AmmV3, GetTransferAmountFee, getTransferAmountFee } from '@raydium-io/raydium-sdk'
import { EpochInfo } from '@solana/web3.js'
import BN from 'bn.js'
import { useCallback, useEffect, useMemo } from 'react'
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

    const [token2022Infos, epochInfo] = await Promise.all([
      getMultiMintInfos({ mints: [coin1.mint, coin2.mint] }),
      getEpochInfo()
    ])

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
            mintA: toPubString(currentAmmPool.base?.mint),
            mintB: toPubString(currentAmmPool.quote?.mint),
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
            add: !isRemoveDialogOpen, // SDK flag for math round direction
            epochInfo,
            token2022Infos
          })

    if (isFocus1) {
      const coinAmount = hasInput
        ? toTokenAmount(coin2, isCoin1Base ? amountSlippageB.amount : amountSlippageA.amount)
        : undefined
      const coinAmountFee = hasInput
        ? toTokenAmount(coin2, isCoin1Base ? amountSlippageB.fee : amountSlippageA.fee)
        : undefined
      const coinExpirationTime = hasInput
        ? isCoin1Base
          ? amountSlippageB.expirationTime
          : amountSlippageA.expirationTime
        : undefined

      useConcentrated.setState({
        coin2Amount: coinAmount,
        coin2SlippageAmount: coinAmount,
        coin2AmountFee: coinAmountFee,
        coin2ExpirationTime: coinExpirationTime
      })
    } else {
      const coinAmount = hasInput
        ? toTokenAmount(coin1, isCoin1Base ? amountSlippageA.amount : amountSlippageB.amount)
        : undefined
      const coinAmountFee = hasInput
        ? toTokenAmount(coin1, isCoin1Base ? amountSlippageA.fee : amountSlippageB.fee)
        : undefined
      const coinExpirationTime = hasInput
        ? isCoin1Base
          ? amountSlippageA.expirationTime
          : amountSlippageB.expirationTime
        : undefined

      useConcentrated.setState({
        coin1Amount: coinAmount,
        coin1SlippageAmount: coinAmount,
        coin1AmountFee: coinAmountFee,
        coin1ExpirationTime: coinExpirationTime
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
  mintA,
  mintB,
  amountA,
  amountB,
  epochInfo,
  isFocus1
}: {
  inputAmountBN: BN
  maxLiquidity: BN
  mintA: string
  mintB: string
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

  const inputTokenMint = 'todo'
  const outputTokenMint = 'todo 2'

  const mintInfos = await getMultiMintInfos({
    mints: [inputTokenMint, outputTokenMint]
  })
  const inputMintInfo = mintInfos[inputTokenMint]
  const outputMintInfo = mintInfos[outputTokenMint]
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
      true
    ),
    amountSlippageB: getTransferAmountFee(
      isFocus1 ? outputAmount : inputAmountBN,
      (isFocus1 ? outputMintInfo : inputMintInfo).feeConfig,
      epochInfo,
      true
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
