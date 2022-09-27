import { useCallback, useMemo } from 'react'

import BN from 'bn.js'
import { AmmV3 } from 'test-r-sdk'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConcentrated from '@/application/concentrated/useConcentrated'
import RangeSliderBox from '@/components/RangeSliderBox'
import assert from '@/functions/assert'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { isArray } from '@/functions/judgers/dateType'
import { div } from '@/functions/numberish/operations'
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

  const onSliderChange = useCallback(
    (value) => {
      if (isArray(value) || !currentAmmPool || !position) return // ignore array (for current version)
      const amountFromLiquidity = AmmV3.getAmountsFromLiquidity({
        poolInfo: currentAmmPool.state,
        ownerPosition: position,
        liquidity: new BN(value),
        slippage: Number(slippageTolerance),
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
        liquidity: new BN(value)
      })
    },
    [currentAmmPool, coin1, coin2]
  )

  return (
    <RangeSliderBox
      max={position?.liquidity.toNumber() ?? 0}
      className="py-3 px-3 ring-1 mobile:ring-1 ring-[rgba(54, 185, 226, 0.5)] rounded-xl mobile:rounded-xl "
      onChange={throttle(onSliderChange)}
      liquidity={liquidity}
    />
  )
}
