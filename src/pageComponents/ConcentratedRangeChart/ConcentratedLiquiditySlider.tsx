import { Clmm } from '@raydium-io/raydium-sdk'
import { useMemo, useRef } from 'react'

import { getEpochInfo } from '@/application/clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '@/application/clmmMigration/getMultiMintInfos'
import useConcentrated, { ConcentratedStore } from '@/application/concentrated/useConcentrated'
import RangeSliderBox from '@/components/RangeSliderBox'
import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isArray } from '@/functions/judgers/dateType'
import { makeAbortable } from '@/functions/makeAbortable'
import { div, minus, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toFraction from '@/functions/numberish/toFraction'
import { useThrottle } from '@/hooks/useDebounce'
import { useEvent } from '@/hooks/useEvent'
import { AnyFn } from '@/types/constants'
import React from 'react'

export default React.memo(function ConcentratedLiquiditySlider({ isAdd = false }: { isAdd?: boolean }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  const liquidity = useConcentrated((s) => s.liquidity)

  assert(coin1, 'base token not been set')
  assert(coin2, 'quote token not been set')

  const position = useMemo(() => {
    if (currentAmmPool && targetUserPositionAccount) {
      return currentAmmPool.positionAccount?.find(
        (p) => toPubString(p.nftMint) === toPubString(targetUserPositionAccount.nftMint)
      )
    }
    return undefined
  }, [currentAmmPool, targetUserPositionAccount])

  const tick = useMemo(() => div(position?.liquidity, 100) ?? toFraction(0), [position?.liquidity])

  const aborter = useRef<AnyFn>()

  const setUserDataToStore = useThrottle(
    (v: Partial<ConcentratedStore>) => {
      useConcentrated.setState(v)
    },
    { throttleOption: { delay: 200, invokeImmediatelyInInitual: true } }
  )

  // handler Slider value change
  const onSliderChange = useEvent((sliderValue: number | number[]) => {
    // abort previous
    aborter.current?.()
    const { abort } = makeAbortable(async (canContinue) => {
      if (!sliderValue || isArray(sliderValue) || !currentAmmPool || !position) return // ignore array (for current version)

      const [token2022Infos, epochInfo] = await Promise.all([
        getMultiMintInfos({ mints: [currentAmmPool.state.mintA.mint, currentAmmPool.state.mintB.mint] }),
        getEpochInfo()
      ])
      if (!canContinue()) return
      const bnValue = toBN(mul(sliderValue, tick))
      const amountFromLiquidity = Clmm.getAmountsFromLiquidity({
        poolInfo: currentAmmPool.state,
        // ownerPosition: position,
        liquidity: bnValue,
        slippage: 0, // always 0, for remove liquidity only
        add: false,
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        token2022Infos,
        epochInfo
      })
      setUserDataToStore({
        coin1Amount: toTokenAmount(
          currentAmmPool.base!,
          minus(amountFromLiquidity.amountSlippageA.amount, amountFromLiquidity.amountSlippageA.fee ?? 0)
        ),
        coin2Amount: toTokenAmount(
          currentAmmPool.quote!,
          minus(amountFromLiquidity.amountSlippageB.amount, amountFromLiquidity.amountSlippageB.fee ?? 0)
        ),
        coin1AmountFee: toTokenAmount(currentAmmPool.base!, amountFromLiquidity.amountSlippageA.fee),
        coin2AmountFee: toTokenAmount(currentAmmPool.quote!, amountFromLiquidity.amountSlippageB.fee),
        coin1ExpirationTime: amountFromLiquidity.amountSlippageA.expirationTime,
        coin2ExpirationTime: amountFromLiquidity.amountSlippageB.expirationTime,
        isInput: false,
        liquidity: bnValue
      })
    })
    aborter.current = abort
  })
  // TODO: dirty fixed tick
  return (
    <RangeSliderBox
      max={100}
      tick={tick}
      className="py-3 px-3 ring-1 mobile:ring-1 ring-[#abc4ff40] rounded-xl mobile:rounded-xl "
      onChange={onSliderChange}
      liquidity={liquidity}
    />
  )
})
