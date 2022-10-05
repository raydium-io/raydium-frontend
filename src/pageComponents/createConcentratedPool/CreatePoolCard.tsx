import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import Decimal from 'decimal.js'
import useConcentrated from '@/application/concentrated/useConcentrated'
import { SplToken } from '@/application/token/type'
import useAppSettings from '@/application/appSettings/useAppSettings'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import { toString } from '@/functions/numberish/toString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { decimalToFraction } from '@/application/txTools/decimal2Fraction'
import TokenSelectorDialog from '../dialogs/TokenSelectorDialog'
import { ConcentratedFeeSwitcher } from './ConcentratedFeeSwitcher'
import SwitchFocusTabs from './SwitchFocusTabs'
import PriceRangeInput from './PriceRangeInput'
import { Range } from './type'
import {
  getPriceBoundary,
  getPriceTick,
  getTickPrice,
  calLowerUpper
} from '@/application/concentrated/getNearistDataPoint'
import { Numberish } from '@/types/constants'
import usePrevious from '@/hooks/usePrevious'

const getSideState = ({ side, price, tick }: { side: Range; price: Numberish; tick: number }) =>
  side === Range.Low ? { [side]: price, priceLowerTick: tick } : { [side]: price, priceUpperTick: tick }

export function CreatePoolCard() {
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const { currentAmmPool, coin1, coin2, coin1Amount, coin2Amount, focusSide, priceLower } = useConcentrated()
  const coinInputBox1ComponentRef = useRef<CoinInputBoxHandle>()
  const coinInputBox2ComponentRef = useRef<CoinInputBoxHandle>()
  const tickRef = useRef<{ [Range.Low]?: number; [Range.Upper]?: number }>({
    [Range.Low]: undefined,
    [Range.Upper]: undefined
  })

  const [prices, setPrices] = useState<(string | undefined)[]>([])
  const [position, setPosition] = useState<{
    [Range.Low]: undefined | Numberish
    [Range.Upper]: undefined | Numberish
  }>({
    [Range.Low]: undefined,
    [Range.Upper]: undefined
  })
  const updatePrice1 = useCallback((tokenP) => setPrices((p) => [tokenP?.toExact(), p[1]]), [])
  const updatePrice2 = useCallback((tokenP) => setPrices((p) => [p[0], tokenP?.toExact()]), [])
  const poolFocusKey = `${currentAmmPool?.idString}-${focusSide}`
  const prevFocusKey = usePrevious<string | undefined>(poolFocusKey)
  const totalDeposit = prices.filter((p) => !!p).reduce((acc, cur) => acc + parseFloat(cur!), 0)
  const decimals = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const isCoin1Base = isMintEqual(currentAmmPool?.state.mintA.mint, coin1)
  const isFocus1 = focusSide === 'coin1'
  const isPairPoolDirectionEq = (isFocus1 && isCoin1Base) || (!isCoin1Base && !isFocus1)
  const currentPrice = currentAmmPool
    ? decimalToFraction(
        isPairPoolDirectionEq
          ? currentAmmPool.state.currentPrice
          : new Decimal(1).div(currentAmmPool.state.currentPrice)
      )
    : undefined

  const boundaryData = useMemo(() => {
    const res = getPriceBoundary({
      coin1,
      coin2,
      ammPool: currentAmmPool,
      reverse: !isPairPoolDirectionEq
    })
    tickRef.current[Range.Low] = res?.priceLowerTick
    tickRef.current[Range.Upper] = res?.priceUpperTick
    return res
  }, [coin1, coin2, currentAmmPool, isPairPoolDirectionEq])

  useEffect(() => {
    if (poolFocusKey === prevFocusKey || !boundaryData) return
    useConcentrated.setState(boundaryData)
    setPosition({
      [Range.Low]: boundaryData.priceLower,
      [Range.Upper]: boundaryData.priceUpper
    })
  }, [boundaryData, poolFocusKey, prevFocusKey])

  const blurRef = useRef<Range>()
  const handleChangeFocus = useCallback((focusSide) => useConcentrated.setState({ focusSide }), [])
  const handleSelectToken = useCallback((token, tokenKey) => useConcentrated.setState({ [tokenKey!]: token }), [])
  const handlePriceChange = useCallback(({ side, val }) => {
    setPosition((p) => ({ ...p, [side]: val }))
    blurRef.current = side
  }, [])

  const handleBlur = useCallback(
    ({ side, val }: { side: Range; val?: number | string }) => {
      if (!currentAmmPool || !coin1 || !coin2 || !blurRef.current || !val) return
      blurRef.current = undefined
      const res = getPriceTick({
        p: val,
        coin1,
        coin2,
        reverse: !isFocus1,
        ammPool: currentAmmPool
      })
      tickRef.current[side] = res.tick
      setPosition((p) => ({ ...p, [side]: res.price }))
      useConcentrated.setState(getSideState({ side, price: res.price, tick: res.tick }))
    },
    [coin1, coin2, currentAmmPool?.idString, isFocus1]
  )

  const handleClickInDecrease = useCallback(
    ({ val, side, isIncrease }: { val?: number | string; side: Range; isIncrease: boolean }) => {
      if (!currentAmmPool || !coin1 || !coin2 || !val) return
      const targetCoin = isFocus1 ? coin1 : coin2
      const nextTick =
        tickRef.current[side]! +
        (isIncrease ? currentAmmPool.state.tickSpacing : -1 * currentAmmPool.state.tickSpacing) *
          Math.pow(-1, isCoin1Base ? (isFocus1 ? 0 : 1) : isFocus1 ? 1 : 0)
      const { price } = getTickPrice({
        poolInfo: currentAmmPool.state,
        baseIn: isMintEqual(currentAmmPool.state.mintA.mint, targetCoin?.mint),
        tick: nextTick
      })
      tickRef.current[side] = nextTick
      useConcentrated.setState(getSideState({ side, price, tick: nextTick }))
      setPosition((p) => ({ ...p, [side]: price }))
      return price
    },
    [coin1, coin2, currentAmmPool?.idString, isFocus1, isCoin1Base]
  )

  return (
    <Card
      className={twMerge(
        `flex gap-4 p-6 mobile:py-4 mobile:px-2 rounded-3xl w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card`
      )}
      size="lg"
    >
      {/* left */}
      <div className="w-1/2 border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
        <div className="mb-8">
          <div className="font-medium text-[#abc4ff] my-1">Select Tokens</div>
          <Grid className="grid-cols-2 gap-4">
            <SelectTokenItem title="Base Token" tokenKey="coin1" onSelectToken={handleSelectToken} />
            <SelectTokenItem title="Quote Token" tokenKey="coin2" onSelectToken={handleSelectToken} />
          </Grid>
        </div>

        <div>
          <div className="font-medium text-[#abc4ff] my-1">Select Fee</div>
          <ConcentratedFeeSwitcher />
        </div>

        <div>
          <CoinInputBox
            className="mt-5 mb-4 mobile:mt-0 py-2 mobile:py-1 px-3 mobile:px-2 border-1.5 border-[#abc4ff40]"
            disabled={isApprovePanelShown}
            disabledInput={!currentAmmPool}
            noDisableStyle
            componentRef={coinInputBox1ComponentRef}
            value={currentAmmPool ? toString(coin1Amount) : undefined}
            haveHalfButton
            haveCoinIcon
            topLeftLabel=""
            onPriceChange={updatePrice1}
            onUserInput={(amount) => {
              useConcentrated.setState({ coin1Amount: amount, userCursorSide: 'coin1' })
            }}
            onEnter={(input) => {
              if (!input) return
              if (!coin2) coinInputBox2ComponentRef.current?.selectToken?.()
            }}
            token={coin1}
          />

          <CoinInputBox
            className="py-2 mobile:py-1 px-3 mobile:px-2 border-1.5 border-[#abc4ff40]"
            componentRef={coinInputBox2ComponentRef}
            disabled={isApprovePanelShown}
            disabledInput={!currentAmmPool}
            noDisableStyle
            value={currentAmmPool ? toString(coin2Amount) : undefined}
            haveHalfButton
            haveCoinIcon
            topLeftLabel=""
            onPriceChange={updatePrice2}
            onEnter={(input) => {
              if (!input) return
              if (!coin1) coinInputBox1ComponentRef.current?.selectToken?.()
            }}
            onUserInput={(amount) => {
              useConcentrated.setState({ coin2Amount: amount, userCursorSide: 'coin2' })
            }}
            token={coin2}
          />
        </div>
      </div>

      {/* right */}
      <div className="w-1/2 border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
        <div>
          <div>
            <div className="font-medium text-[#abc4ff] my-1">Set Starting Price</div>
            <SwitchFocusTabs coin1={coin1} coin2={coin2} focusSide={focusSide} onChangeFocus={handleChangeFocus} />
          </div>

          <InputBox
            decimalMode
            prefix={
              <span className="text-base text-secondary-title opacity-50">
                Current {isFocus1 ? coin1?.symbol : coin2?.symbol} Price
              </span>
            }
            suffix={
              <span className="text-xs text-secondary-title opacity-50">
                {isFocus1 ? coin2?.symbol : coin1?.symbol}
              </span>
            }
            value={currentPrice?.toFixed(decimals)}
            onUserInput={(value) => {
              useConcentrated.setState({ userSettedCurrentPrice: value })
            }}
          />
        </div>
        <PriceRangeInput
          decimals={decimals}
          minValue={toString(position[Range.Low])}
          maxValue={toString(position[Range.Upper])}
          onBlur={handleBlur}
          onPriceChange={handlePriceChange}
          onInDecrease={handleClickInDecrease}
        />
      </div>
    </Card>
  )
}

function SelectTokenItem({
  tokenKey,
  title,
  onSelectToken
}: {
  tokenKey?: string
  title?: string
  onSelectToken?: (token: SplToken, tokenKey?: string) => void
}) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [cachedToken, setCachedToken] = useState<SplToken>()
  return (
    <>
      <Grid
        className="bg-[#141041] rounded-xl py-2 cursor-pointer place-content-center"
        onClick={() => setIsSelectorOpen(true)}
      >
        {cachedToken ? (
          <div>
            <div className="text-xs font-medium text-[#abc4ff80] my-1 text-center">{title}</div>
            <Row className="items-center gap-2">
              <CoinAvatar token={cachedToken} />
              <div className="text-[#abc4ff] font-medium">{cachedToken.symbol ?? ''}</div>
              <Icon size="sm" className="text-[#abc4ff]" heroIconName="chevron-down" />
            </Row>
          </div>
        ) : (
          <div>{title}</div>
        )}
      </Grid>
      <TokenSelectorDialog
        open={isSelectorOpen}
        onClose={() => {
          setIsSelectorOpen(false)
        }}
        onSelectToken={(token) => {
          onSelectToken?.(token, tokenKey)
          setCachedToken(token)
        }}
      />
    </>
  )
}
