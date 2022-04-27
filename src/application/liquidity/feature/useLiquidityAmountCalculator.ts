import { jsonInfo2PoolKeys, Liquidity, LiquidityPoolJsonInfo } from '@raydium-io/raydium-sdk'

import useAppSettings from '@/application/appSettings/useAppSettings'
import { SplToken } from '@/application/token/type'
import { deUIToken, deUITokenAmount, toUITokenAmount } from '@/application/token/utils/quantumSOL'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { eq } from '@/functions/numberish/compare'
import { shakeZero } from '@/functions/numberish/shakeZero'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { HexAddress, Numberish } from '@/types/constants'

import { hasSameItems } from '../../../functions/arrayMethods'
import useConnection from '../../connection/useConnection'
import { SDKParsedLiquidityInfo } from '../type'
import useLiquidity from '../useLiquidity'
import { useEffect } from 'react'
import toPubString from '@/functions/format/toMintString'

/**
 * will auto fresh  liquidity's coin1Amount and coin2Amount with liquidity's jsonInfos and coin1 and coin2
 * @requires {@link useConnection `useConnection`} and {@link useLiquidity `useLiquidity`}
 * delayly refresh
 */
export default function useLiquidityAmountCalculator() {
  const connection = useConnection((s) => s.connection)

  const currentJsonInfo = useLiquidity((s) => s.currentJsonInfo)
  const currentSdkParsedInfo = useLiquidity((s) => s.currentSdkParsedInfo)

  const coin1 = useLiquidity((s) => s.coin1)
  const coin2 = useLiquidity((s) => s.coin2)
  const userCoin1Amount = useLiquidity((s) => s.coin1Amount)
  const userCoin2Amount = useLiquidity((s) => s.coin2Amount)
  const focusSide = useLiquidity((s) => s.focusSide)
  const refreshCount = useLiquidity((s) => s.refreshCount)

  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)

  useEffect(() => {
    cleanCalcCache()
  }, [refreshCount])

  useAsyncEffect(async () => {
    if (!coin1 || !coin2 || !currentSdkParsedInfo || !currentJsonInfo /* acctually no need, but for ts type gard */)
      return
    if (
      !hasSameItems(
        [toPubString(currentSdkParsedInfo.baseMint), toPubString(currentSdkParsedInfo.quoteMint)],
        [String(coin1.mint), String(coin2.mint)]
      ) ||
      (focusSide === 'coin1' && eq(userCoin1Amount, 0)) ||
      (focusSide === 'coin2' && eq(userCoin2Amount, 0))
    ) {
      if (focusSide === 'coin1') useLiquidity.setState({ coin2Amount: '', unslippagedCoin2Amount: '' })
      if (focusSide === 'coin2') useLiquidity.setState({ coin1Amount: '', unslippagedCoin1Amount: '' })
      return
    }
    try {
      const { amount: pairCoinAmount, unslippagedAmount: unslippagedPairCoinAmount } = await calculatePairTokenAmount({
        coin1,
        userCoin1Amount,
        coin2,
        userCoin2Amount,
        focusSide,
        currentJsonInfo,
        currentSdkParsedInfo,
        slippageTolerance
      })

      // for calculatePairTokenAmount is async, result maybe droped. if that, just stop it
      const resultStillFresh = (() => {
        const { coin1Amount, coin2Amount } = useLiquidity.getState()
        const currentFocusSideAmount = focusSide === 'coin1' ? coin1Amount : coin2Amount
        const focusSideAmount = focusSide === 'coin1' ? userCoin1Amount : userCoin2Amount
        return eq(currentFocusSideAmount, focusSideAmount)
      })()
      if (!resultStillFresh) return

      if (focusSide === 'coin1') {
        useLiquidity.setState({ coin2Amount: pairCoinAmount, unslippagedCoin2Amount: unslippagedPairCoinAmount })
      } else {
        useLiquidity.setState({ coin1Amount: pairCoinAmount, unslippagedCoin1Amount: unslippagedPairCoinAmount })
      }
    } catch (err) {
      console.error('err: ', err)
    }
  }, [
    coin1,
    coin2,
    userCoin1Amount,
    userCoin2Amount,
    focusSide,
    connection,
    // jsonInfos, no need , because sdkParsed changed jsonInfo must change before
    //currentJsonInfo, no need , because sdkParsed changed jsonInfo must change before
    currentSdkParsedInfo,
    slippageTolerance,
    refreshCount
  ])
}

const sdkParsedInfoCache = new Map<HexAddress, SDKParsedLiquidityInfo>()

function cleanCalcCache() {
  sdkParsedInfoCache.clear()
}

async function calculatePairTokenAmount({
  coin1,
  coin2,
  userCoin1Amount,
  userCoin2Amount,
  focusSide,

  slippageTolerance,
  currentJsonInfo: jsonInfo,
  currentSdkParsedInfo: sdkParsedInfo
}: {
  coin1: SplToken
  userCoin1Amount?: Numberish
  coin2: SplToken
  userCoin2Amount?: Numberish
  focusSide: 'coin1' | 'coin2'

  slippageTolerance: Numberish
  currentJsonInfo: LiquidityPoolJsonInfo
  currentSdkParsedInfo: SDKParsedLiquidityInfo
}): Promise<{
  amount: string
  unslippagedAmount: string
}> {
  const inputToken = focusSide === 'coin1' ? coin1 : coin2
  const pairToken = inputToken === coin1 ? coin2 : coin1
  const inputAmount = toTokenAmount(inputToken, focusSide === 'coin1' ? userCoin1Amount : userCoin2Amount, {
    alreadyDecimaled: true
  })
  const { maxAnotherAmount, anotherAmount } = Liquidity.computeAnotherAmount({
    poolKeys: jsonInfo2PoolKeys(jsonInfo),
    poolInfo: sdkParsedInfo,
    amount: deUITokenAmount(inputAmount),
    anotherCurrency: deUIToken(pairToken),
    slippage: toPercent(toPercent(slippageTolerance))
  })

  return {
    amount: shakeZero(toUITokenAmount(maxAnotherAmount).toExact()),
    unslippagedAmount: shakeZero(toUITokenAmount(anotherAmount).toExact())
  }
}
