import { useEffect } from 'react'
import { useRouter } from 'next/router'

import { jsonInfo2PoolKeys, Liquidity, Trade, WSOL, ZERO } from '@raydium-io/raydium-sdk'
import { Connection } from '@solana/web3.js'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { eq, gt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { HexAddress, Numberish } from '@/types/constants'

import useAppSettings from '../appSettings/useAppSettings'
import useConnection from '../connection/useConnection'
import sdkParseJsonLiquidityInfo from '../liquidity/sdkParseJsonLiquidityInfo'
import { SDKParsedLiquidityInfo } from '../liquidity/type'
import useLiquidity from '../liquidity/useLiquidity'
import { deUIToken, deUITokenAmount, toUITokenAmount } from '../token/quantumSOL'
import { SplToken } from '../token/type'
import useWallet from '../wallet/useWallet'

import { checkTokenPairCanSwap } from './check'
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

  // if don't check focusSideCoin, it will calc twice.
  // one for coin1Amount then it will change coin2Amount
  // changing coin2Amount will cause another calc
  useAsyncEffect(async () => {
    // pairInfo is not enough
    if (!upCoin || !downCoin || !connection || !pathname.startsWith('/swap')) {
      useSwap.setState({
        fee: undefined,
        minReceived: undefined,
        maxSpent: undefined,
        routes: undefined,
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
      useSwap.setState({
        fee: undefined,
        minReceived: undefined,
        maxSpent: undefined,
        routes: undefined,
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

    try {
      const calcResult = await calculatePairTokenAmount({
        upCoin,
        upCoinAmount,
        downCoin,
        downCoinAmount,
        connection,
        focusSide: focusDirectionSide,
        slippageTolerance
      })
      // for calculatePairTokenAmount is async, result maybe droped. if that, just stop it
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

      if (focusDirectionSide === 'up') {
        const { routes, priceImpact, executionPrice, currentPrice, swapable, routeType, fee, canFindPools } =
          calcResult ?? {}
        const { amountOut, minAmountOut } = (calcResult?.info ?? {}) as { amountOut?: string; minAmountOut?: string }
        useSwap.setState({
          fee,
          routes,
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
      } else {
        const { routes, priceImpact, executionPrice, currentPrice, swapable, routeType, fee, canFindPools } =
          calcResult ?? {}
        const { amountIn, maxAmountIn } = (calcResult?.info ?? {}) as { amountIn?: string; maxAmountIn?: string }
        useSwap.setState({
          fee,
          routes,
          priceImpact,
          executionPrice,
          currentPrice,
          minReceived: undefined,
          maxSpent: maxAmountIn,
          swapable,
          routeType,
          canFindPools,
          ...{
            [focusSide === 'coin1' ? 'coin2Amount' : 'coin1Amount']: amountIn,
            [focusSide === 'coin1' ? 'isCoin2Calculating' : 'isCoin1Calculating']: false
          }
        })
      }
    } catch (err) {
      console.error(err)
    }
  }, [
    upCoin,
    downCoin,
    upCoinAmount,
    downCoinAmount,
    directionReversed,
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

type SwapCalculatorInfo = {
  executionPrice: ReturnType<typeof Trade['getBestAmountOut']>['executionPrice']
  currentPrice: ReturnType<typeof Trade['getBestAmountOut']>['currentPrice']
  priceImpact: ReturnType<typeof Trade['getBestAmountOut']>['priceImpact'] | undefined
  routes: ReturnType<typeof Trade['getBestAmountOut']>['routes']
  routeType: ReturnType<typeof Trade['getBestAmountOut']>['routeType']
  fee: ReturnType<typeof Trade['getBestAmountOut']>['fee']
  swapable: boolean
  canFindPools: boolean
  info: { amountOut: string; minAmountOut: string } | { amountIn: string; maxAmountIn: string }
}

function cleanCalcCache() {
  sdkParsedInfoCache.clear()
}

async function calculatePairTokenAmount({
  upCoin,
  upCoinAmount,
  downCoin,
  downCoinAmount,
  focusSide,
  connection,
  slippageTolerance
}: {
  upCoin: SplToken
  upCoinAmount: Numberish | undefined
  downCoin: SplToken
  downCoinAmount: Numberish | undefined
  focusSide: 'up' | 'down'
  connection: Connection
  slippageTolerance: Numberish
}): Promise<SwapCalculatorInfo | undefined> {
  const upCoinTokenAmount = toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })
  const downCoinTokenAmount = toTokenAmount(downCoin, downCoinAmount, { alreadyDecimaled: true })

  const { routeRelated: jsonInfos } = await useLiquidity
    .getState()
    .findLiquidityInfoByTokenMint(upCoin.mint, downCoin.mint)

  if (jsonInfos.length) {
    // console.time(1)
    const key = jsonInfos.map((jsonInfo) => jsonInfo.id).join('-')
    const sdkParsedInfos = sdkParsedInfoCache.has(key)
      ? sdkParsedInfoCache.get(key)!
      : await (async () => {
          // console.log('33: ', 33)
          const sdkParsed = await sdkParseJsonLiquidityInfo(jsonInfos, connection)
          sdkParsedInfoCache.set(key, sdkParsed)
          return sdkParsed
        })()
    // console.timeEnd(1)

    // console.time('get pool')
    const pools = jsonInfos.map((jsonInfo, idx) => ({
      poolKeys: jsonInfo2PoolKeys(jsonInfo),
      poolInfo: sdkParsedInfos[idx]
    }))
    // console.timeEnd('get pool')

    // console.time('Trade.getBestAmountOut')
    const { amountOut, minAmountOut, executionPrice, currentPrice, priceImpact, routes, routeType, fee } =
      Trade.getBestAmountOut({
        pools,
        currencyOut: deUIToken(downCoin),
        amountIn: deUITokenAmount(upCoinTokenAmount),
        slippage: toPercent(slippageTolerance)
      })
    // console.timeEnd('Trade.getBestAmountOut')

    // console.time(2)
    const sdkParsedInfoMap = new Map(sdkParsedInfos.map((info) => [toPubString(info.id), info]))
    const choosedSdkParsedInfos = shakeUndifindedItem(
      routes.map((route) => sdkParsedInfoMap.get(toPubString(route.keys.id)))
    )
    const haveAmount = gt(upCoinAmount, 0) || gt(downCoinAmount, 0)
    const swapable = haveAmount
      ? choosedSdkParsedInfos.length > 0 &&
        choosedSdkParsedInfos.every((info) => Liquidity.getEnabledFeatures(info).swap)
      : true
    const canFindPools = checkTokenPairCanSwap(useLiquidity.getState().jsonInfos, upCoin.mint, downCoin.mint)
    const priceImpactIsZeroofZero = priceImpact.denominator.eq(ZERO) && priceImpact.numerator.eq(ZERO)
    // console.timeEnd(2)
    return {
      executionPrice,
      currentPrice,
      priceImpact: priceImpactIsZeroofZero ? undefined : priceImpact,
      routes,
      routeType,
      swapable,
      canFindPools,
      fee,
      info: {
        amountOut: toUITokenAmount(amountOut).toExact(),
        minAmountOut: toUITokenAmount(minAmountOut).toExact()
      }
    }
  }
}
