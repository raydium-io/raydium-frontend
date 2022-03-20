import { jsonInfo2PoolKeys, Liquidity, LiquidityPoolJsonInfo } from '@raydium-io/raydium-sdk'
import { Connection } from '@solana/web3.js'

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
import sdkParseJsonLiquidityInfo from '../utils/sdkParseJsonLiquidityInfo'
import { useEffect } from 'react'

/**
 * will auto fresh  liquidity's coin1Amount and coin2Amount with liquidity's jsonInfos and coin1 and coin2
 * @requires {@link useConnection `useConnection`} and {@link useLiquidity `useLiquidity`}
 * delayly refresh
 */
export default function useLiquidityAmountCalculator() {
  const connection = useConnection((s) => s.connection)

  const jsonInfos = useLiquidity((s) => s.jsonInfos)
  const currentJsonInfo = useLiquidity((s) => s.currentJsonInfo)

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
    if (!coin1 || !coin2 || !currentJsonInfo || !connection || !jsonInfos) return
    if (
      !hasSameItems([currentJsonInfo.baseMint, currentJsonInfo.quoteMint], [String(coin1.mint), String(coin2.mint)]) ||
      (focusSide === 'coin1' && eq(userCoin1Amount, 0)) ||
      (focusSide === 'coin2' && eq(userCoin2Amount, 0))
    ) {
      if (focusSide === 'coin1') useLiquidity.setState({ coin2Amount: '' })
      if (focusSide === 'coin2') useLiquidity.setState({ coin1Amount: '' })
      return
    }
    try {
      const pairCoinAmount = await calculatePairTokenAmount({
        coin1,
        userCoin1Amount,
        coin2,
        userCoin2Amount,
        focusSide,
        connection,
        currentJsonInfo,
        slippageTolerance
      })
      if (focusSide === 'coin1') {
        useLiquidity.setState({ coin2Amount: pairCoinAmount })
      } else {
        useLiquidity.setState({ coin1Amount: pairCoinAmount })
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
    jsonInfos,
    currentJsonInfo,
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

  connection,
  slippageTolerance,
  currentJsonInfo: jsonInfo
}: {
  coin1: SplToken
  userCoin1Amount?: Numberish
  coin2: SplToken
  userCoin2Amount?: Numberish
  focusSide: 'coin1' | 'coin2'

  connection: Connection
  slippageTolerance: Numberish
  currentJsonInfo: LiquidityPoolJsonInfo
}): Promise<string> {
  const sdkParsedInfo = sdkParsedInfoCache.has(jsonInfo.id)
    ? sdkParsedInfoCache.get(jsonInfo.id)!
    : await (async () => {
        const result = await sdkParseJsonLiquidityInfo([jsonInfo], connection)
        const sdkParsed: SDKParsedLiquidityInfo | undefined = result[0]
        sdkParsedInfoCache.set(jsonInfo.id, sdkParsed)
        return sdkParsed
      })()

  const inputToken = focusSide === 'coin1' ? coin1 : coin2
  const pairToken = inputToken === coin1 ? coin2 : coin1
  const inputAmount = toTokenAmount(inputToken, focusSide === 'coin1' ? userCoin1Amount : userCoin2Amount, {
    alreadyDecimaled: true
  })
  const { maxAnotherAmount } = Liquidity.computeAnotherAmount({
    poolKeys: jsonInfo2PoolKeys(jsonInfo),
    poolInfo: sdkParsedInfo,
    amount: deUITokenAmount(inputAmount),
    anotherCurrency: deUIToken(pairToken),
    slippage: toPercent(toPercent(slippageTolerance))
  })

  return shakeZero(toUITokenAmount(maxAnotherAmount).toExact())
}
