import { AmmV3 } from '@raydium-io/raydium-sdk'
import { useCallback, useMemo } from 'react'

import { getEpochInfo } from '@/application/clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '@/application/clmmMigration/getMultiMintInfos'
import useConcentrated from '@/application/concentrated/useConcentrated'
import RangeSliderBox from '@/components/RangeSliderBox'
import assert from '@/functions/assert'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isArray } from '@/functions/judgers/dateType'
import { div, minus, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toFraction from '@/functions/numberish/toFraction'

export default function ConcentratedLiquiditySlider({ isAdd = false }: { isAdd?: boolean }) {
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

  const tick = useMemo(() => {
    return div(position?.liquidity, 100) ?? toFraction(0)
  }, [position?.liquidity])

  const onSliderChange = useCallback(
    async (value: number | number[]) => {
      if (isArray(value) || !currentAmmPool || !position) return // ignore array (for current version)

      const [token2022Infos, epochInfo] = await Promise.all([
        getMultiMintInfos({ mints: [currentAmmPool.state.mintA.mint, currentAmmPool.state.mintB.mint] }),
        getEpochInfo()
      ])
      const bnValue = toBN(mul(value, tick))
      const amountFromLiquidity = AmmV3.getAmountsFromLiquidity({
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

      useConcentrated.setState({
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
