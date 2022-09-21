import { isMintEqual } from '@/functions/judgers/areEqual'
import { eq, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { useEffectWithTransition } from '@/hooks/useEffectWithTransition'
import { getAllSwapableRouteInfos } from '@/models/ammAndLiquidity'
import { makeAbortable } from '@/models/makeAbortable'
import { HexAddress } from '@/types/constants'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { WSOL } from 'test-r-sdk'
import useAppSettings from '../appSettings/useAppSettings'
import useConnection from '../connection/useConnection'
import { SDKParsedLiquidityInfo } from '../liquidity/type'
import useLiquidity from '../liquidity/useLiquidity'
import useWallet from '../wallet/useWallet'
import { useSwap } from './useSwap'

export function useSwapAmountCalculator() {
  const { pathname } = useRouter()
  const connection = useConnection((s) => s.connection)
  const coin1 = useSwap((s) => s.coin1)
  const coin2 = useSwap((s) => s.coin2)
  const userCoin1Amount = useSwap((s) => s.coin1Amount)
  const userCoin2Amount = useSwap((s) => s.coin2Amount)
  const refreshCount = useSwap((s) => s.refreshCount)
  const directionReversed = useSwap((s) => s.directionReversed)
  const focusSide = directionReversed ? 'coin2' : 'coin1' // temporary focus side is always up, due to swap route's `Trade.getBestAmountIn()` is not ready
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)
  const connected = useWallet((s) => s.connected)

  /** for swap is always from up to down, up/down is easier to calc */
  const upCoin = directionReversed ? coin2 : coin1
  const upCoinAmount = (directionReversed ? userCoin2Amount : userCoin1Amount) || '0'
  const downCoin = directionReversed ? coin1 : coin2
  const downCoinAmount = (directionReversed ? userCoin1Amount : userCoin2Amount) || '0'

  const jsonInfos = useLiquidity((s) => s.jsonInfos)
  useEffect(() => {
    cleanCalcCache()
  }, [refreshCount])

  // get preflight
  useEffectWithTransition(async () => {
    if (!coin1 || !coin2) return // not fullfilled
    useSwap.setState({ preflightCalcResult: undefined, canFindPools: undefined, swapable: undefined })
    const preflightCalcResult = await getAllSwapableRouteInfos({
      connection,
      input: coin1,
      output: coin2,
      inputAmount: 1,
      slippageTolerance: 0
    })
    const swapable = Boolean(preflightCalcResult?.[0]?.poolReady)
    const canFindPools = Boolean(preflightCalcResult?.length)
    useSwap.setState({ preflightCalcResult: preflightCalcResult, canFindPools, swapable })
  }, [connection, coin1, coin2])

  // if don't check focusSideCoin, it will calc twice.
  // one for coin1Amount then it will change coin2Amount
  // changing coin2Amount will cause another calc
  useEffect(() => {
    // pairInfo is not enough
    if (!upCoin || !downCoin || !connection || !pathname.startsWith('/swap')) {
      useSwap.setState({
        calcResult: undefined,
        fee: undefined,
        minReceived: undefined,
        maxSpent: undefined,
        priceImpact: undefined,
        executionPrice: undefined,
        ...{ [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']: undefined }
      })
      return
    }

    const focusDirectionSide = 'up' // temporary focus side is always up, due to swap route's `Trade.getBestAmountIn()` is not ready
    // focusSide === 'coin1' ? (directionReversed ? 'down' : 'up') : directionReversed ? 'up' : 'down'

    // SOL / WSOL is special
    const inputIsSolWSOL = isMintEqual(coin1, coin2) && isMintEqual(coin1, WSOL.mint)
    if (inputIsSolWSOL) {
      if (eq(userCoin1Amount, userCoin2Amount)) return
      const { isApprovePanelShown } = useAppSettings.getState()
      if (isApprovePanelShown) return // !don't refresh when approve shown
      useSwap.setState({
        calcResult: undefined,
        fee: undefined,
        minReceived: undefined,
        maxSpent: undefined,
        priceImpact: undefined,
        executionPrice: undefined,
        ...{
          [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']:
            focusSide === 'coin1' ? toString(userCoin1Amount) : toString(userCoin2Amount),
          [focusSide === 'coin1' ? 'isCoin2Calculating' : 'isCoin1Calculating']: false
        }
      })
      return
    }

    // empty upCoinAmount
    if (!isMeaningfulNumber(upCoinAmount)) {
      useSwap.setState(directionReversed ? { coin1Amount: undefined } : { coin2Amount: undefined })
      useSwap.setState({
        calcResult: undefined,
        fee: undefined,
        minReceived: undefined,
        maxSpent: undefined,
        priceImpact: undefined,
        executionPrice: undefined
      })
      return
    }

    const { abort: abortCalc, result: abortableCalcResult } = makeAbortable(() =>
      getAllSwapableRouteInfos({
        connection,
        input: upCoin,
        output: downCoin,
        inputAmount: upCoinAmount,
        slippageTolerance
      }).catch((err) => {
        console.error(err)
      })
    )
    // console.log('calc 3', abortableCalcResult)
    abortableCalcResult.then((calcResult) => {
      // console.log('calcResult: ', calcResult)
      if (!calcResult) return
      const resultStillFresh = (() => {
        const directionReversed = useSwap.getState().directionReversed
        const currentUpCoinAmount =
          (directionReversed ? useSwap.getState().coin2Amount : useSwap.getState().coin1Amount) || '0'
        const currentDownCoinAmount =
          (directionReversed ? useSwap.getState().coin1Amount : useSwap.getState().coin2Amount) || '0'
        const currentFocusSideAmount = focusDirectionSide === 'up' ? currentUpCoinAmount : currentDownCoinAmount
        const focusSideAmount = focusDirectionSide === 'up' ? upCoinAmount : downCoinAmount
        return eq(currentFocusSideAmount, focusSideAmount)
      })()
      if (!resultStillFresh) return

      // if (focusDirectionSide === 'up') {
      const swapable = calcResult[0]?.poolReady
      const canFindPools = Boolean(calcResult?.length)
      const { priceImpact, executionPrice, currentPrice, routeType, fee, amountOut, minAmountOut, poolKey } =
        calcResult?.[0] ?? {}

      useSwap.setState({
        fee,
        calcResult,
        priceImpact,
        executionPrice,
        currentPrice,
        minReceived: minAmountOut,
        maxSpent: undefined,
        swapable,
        routeType,
        canFindPools,
        ...{
          [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']: amountOut,
          [focusSide === 'coin1' ? 'isCoin2Calculating' : 'isCoin1Calculating']: false
        }
      })
    })

    // console.log('calc')
    // for calculatePairTokenAmount is async, result maybe droped. if that, just stop it

    return () => {
      // console.log('calc abort')
      abortCalc()
    }
  }, [
    upCoin,
    downCoin,
    directionReversed,
    focusSide === 'coin1' ? toString(userCoin1Amount) : toString(userCoin2Amount),
    focusSide,
    slippageTolerance,
    connection,
    pathname,
    refreshCount,
    connected, // init fetch data
    jsonInfos
  ])
}

const sdkParsedInfoCache = new Map<HexAddress, SDKParsedLiquidityInfo[]>()

function cleanCalcCache() {
  sdkParsedInfoCache.clear()
}
