import { useCallback, useMemo } from 'react'

import { AmmV3 } from 'test-r-sdk'

import BN from 'bn.js'

import useAppSettings from '@/application/common/useAppSettings'
import useConcentrated from '@/application/concentrated/useConcentrated'
import RangeSliderBox from '@/components/RangeSliderBox'
import assert from '@/functions/assert'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { isArray } from '@/functions/judgers/dateType'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'

export default function ConcentratedLiquiditySlider({ isAdd = false }: { isAdd?: boolean }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)
  const liquidity = useConcentrated((s) => s.liquidity)
  const isInput = useConcentrated((s) => s.isInput)
  const isRemoveDialogOpen = useConcentrated((s) => s.isRemoveDialogOpen)

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

  const tick = useMemo(() => {
    return div(position?.liquidity, 100) ?? toFraction(0)
  }, [position?.liquidity])

  const onSliderChange = useCallback(
    (value: number | number[]) => {
      if (isArray(value) || !currentAmmPool || !position) return // ignore array (for current version)
      const bnValue = toBN(mul(value, tick))
      const amountFromLiquidity = AmmV3.getAmountsFromLiquidity({
        poolInfo: currentAmmPool.state,
        ownerPosition: position,
        liquidity: bnValue,
        slippage: 0, // always 0, for remove liquidity only
        add: false
      })
      useConcentrated.setState({
        coin1Amount: toString(div(toFraction(amountFromLiquidity.amountSlippageA), 10 ** coin1.decimals), {
          decimalLength: 'auto 10'
        }),
        coin2Amount: toString(div(toFraction(amountFromLiquidity.amountSlippageB), 10 ** coin2.decimals), {
          decimalLength: 'auto 10'
        }),
        isInput: false,
        liquidity: bnValue
      })
    },
    [currentAmmPool, coin1, coin2, tick]
  )
  // TODO: dirty fixed tick
  return (
    <RangeSliderBox
      max={100}
      tick={tick}
      className="py-3 px-3 ring-1 mobile:ring-1 ring-[#abc4ff40] rounded-xl mobile:rounded-xl "
      onChange={throttle(onSliderChange)}
      liquidity={liquidity}
    />
  )
}
