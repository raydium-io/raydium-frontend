import { useRouter } from 'next/router'

import { WSOL } from '@raydium-io/raydium-sdk'

import { getAllSwapableRouteInfos } from '@/application/ammV3PoolInfoAndLiquidity/ammAndLiquidity'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { makeAbortable } from '@/functions/makeAbortable'
import { eq, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { useDebounce } from '@/hooks/useDebounce'
import { useIdleEffect } from '@/hooks/useIdleEffect'

import useAppSettings from '../common/useAppSettings'
import useConnection from '../connection/useConnection'
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
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)

  /** for swap is always from up to down, up/down is easier to calc */
  const upCoin = directionReversed ? coin2 : coin1
  const upCoinAmount = (directionReversed ? userCoin2Amount : userCoin1Amount) || '0'
  const downCoin = directionReversed ? coin1 : coin2
  const downCoinAmount = (directionReversed ? userCoin1Amount : userCoin2Amount) || '0'

  const jsonInfos = useLiquidity((s) => s.jsonInfos)

  // get preflight
  useIdleEffect(async () => {
    if (!coin1 || !coin2) return // not fullfilled
    if (isMeaningfulNumber(userCoin1Amount) && isMeaningfulNumber(userCoin2Amount)) return // no need to check
    useSwap.setState({
      preflightCalcResult: undefined,
      canFindPools: undefined,
      swapable: undefined
    })
    const {
      routeList: preflightCalcResult,
      bestResult,
      bestResultStartTimes
    } = (await getAllSwapableRouteInfos({
      connection,
      input: coin1,
      output: coin2,
      inputAmount: 1,
      slippageTolerance: 0.05
    })) ?? {}

    const swapable = Boolean(bestResult?.poolReady)
    const canFindPools = Boolean(bestResult)
    useSwap.setState({
      preflightCalcResult: preflightCalcResult,
      canFindPools,
      swapable,
      selectedCalcResultPoolStartTimes: bestResultStartTimes
    })
  }, [connection, coin1, coin2])

  const startCalc = useDebounce(
    () => {
      if (isApprovePanelShown) return // prevent update if approve panel shown

      // pairInfo is not enough
      if (!upCoin || !downCoin || !connection || !pathname.startsWith('/swap')) {
        useSwap.setState({
          calcResult: undefined,
          selectedCalcResult: undefined,
          selectedCalcResultPoolStartTimes: undefined,
          isCalculating: false,
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
          selectedCalcResult: undefined,
          selectedCalcResultPoolStartTimes: undefined,
          isCalculating: false,
          fee: undefined,
          minReceived: undefined,
          maxSpent: undefined,
          priceImpact: undefined,
          executionPrice: undefined,
          ...{
            [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']:
              focusSide === 'coin1' ? toString(userCoin1Amount) : toString(userCoin2Amount),
            [focusSide === 'coin1' ? 'isCoin2CalculateTarget' : 'isCoin1CalculateTarget']: false
          }
        })
        return
      }

      // empty upCoinAmount
      if (!isMeaningfulNumber(upCoinAmount)) {
        useSwap.setState(directionReversed ? { coin1Amount: undefined } : { coin2Amount: undefined })
        useSwap.setState({
          calcResult: undefined,
          selectedCalcResult: undefined,
          selectedCalcResultPoolStartTimes: undefined,
          isCalculating: false,
          fee: undefined,
          minReceived: undefined,
          maxSpent: undefined,
          priceImpact: undefined,
          executionPrice: undefined
        })
        return
      }

      const { abort: abortCalc } = makeAbortable(async (canContinue) => {
        useSwap.setState({ isCalculating: true })
        const infos = await getAllSwapableRouteInfos({
          connection,
          input: upCoin,
          output: downCoin,
          inputAmount: upCoinAmount,
          slippageTolerance
        })
          .then((result) => {
            const { routeList, bestResult, bestResultStartTimes } = result ?? {}
            return { routeList, bestResult, bestResultStartTimes }
          })
          .catch((err) => {
            console.error(err)
          })
        if (!infos) return
        if (!canContinue()) return

        const { routeList: calcResult, bestResult, bestResultStartTimes } = infos
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
        const swapable = bestResult?.poolReady
        const canFindPools = Boolean(calcResult?.length)
        const { priceImpact, executionPrice, currentPrice, routeType, fee, amountOut, minAmountOut, poolKey } =
          bestResult ?? {}

        useSwap.setState({
          fee,
          calcResult,
          preflightCalcResult: calcResult,
          selectedCalcResult: bestResult,
          selectedCalcResultPoolStartTimes: bestResultStartTimes,
          isCalculating: false,

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
            [focusSide === 'coin1' ? 'isCoin2CalculateTarget' : 'isCoin1CalculateTarget']: false
          }
        })
      })

      return abortCalc
    },
    { debouncedOptions: { delay: 300 } }
  )

  // if don't check focusSideCoin, it will calc twice.
  // one for coin1Amount then it will change coin2Amount
  // changing coin2Amount will cause another calc
  useIdleEffect(startCalc, [
    isApprovePanelShown,
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
