import useAppSettings from '@/application/common/useAppSettings'
import { getPriceBoundary, getPriceTick, getTickPrice } from '@/application/concentrated/getNearistDataPoint'
import { useAutoCreateAmmv3Pool } from '@/application/concentrated/useAutoCreateAmmv3Pool'
import useConcentrated from '@/application/concentrated/useConcentrated'
import { SplToken } from '@/application/token/type'
import { decimalToFraction } from '@/application/txTools/decimal2Fraction'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinInputBox from '@/components/CoinInputBox'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { isMintEqual } from '@/functions/judgers/areEqual'
import toBN from '@/functions/numberish/toBN'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { useEvent } from '@/hooks/useEvent'
import usePrevious from '@/hooks/usePrevious'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useSwapTwoElements } from '@/hooks/useSwapTwoElements'
import { Numberish } from '@/types/constants'
import Decimal from 'decimal.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import TokenSelectorDialog from '../dialogs/TokenSelectorDialog'
import { ConcentratedFeeSwitcher } from './ConcentratedFeeSwitcher'
import EmptyCoinInput from './EmptyCoinInput'
import InputLocked from './InputLocked'
import PriceRangeInput from './PriceRangeInput'
import SwitchFocusTabs from './SwitchFocusTabs'
import { Range } from './type'

const getSideState = ({ side, price, tick }: { side: Range; price: Numberish; tick: number }) =>
  side === Range.Low ? { [side]: price, priceLowerTick: tick } : { [side]: price, priceUpperTick: tick }

export function CreatePoolCard() {
  useAutoCreateAmmv3Pool()

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const {
    currentAmmPool,
    coin1,
    coin2,
    coin1Amount,
    coin2Amount,
    focusSide,
    priceLower,
    priceUpper,
    userSettedCurrentPrice
  } = useConcentrated()
  const tickRef = useRef<{ [Range.Low]?: number; [Range.Upper]?: number }>({
    [Range.Low]: undefined,
    [Range.Upper]: undefined
  })
  const blurTimerRef = useRef<number | undefined>()

  const [prices, setPrices] = useState<(string | undefined)[]>([])
  const [position, setPosition] = useState<{
    [Range.Low]: undefined | number
    [Range.Upper]: undefined | number
  }>({
    [Range.Low]: undefined,
    [Range.Upper]: undefined
  })
  const updatePrice1 = useCallback((tokenP) => setPrices((p) => [tokenP?.toExact(), p[1]]), [])
  const updatePrice2 = useCallback((tokenP) => setPrices((p) => [p[0], tokenP?.toExact()]), [])
  const poolFocusKey = `${currentAmmPool?.idString}-${focusSide}`
  const prevFocusKey = usePrevious<string | undefined>(poolFocusKey)
  const totalDeposit = useMemo(
    () => prices.filter((p) => !!p).reduce((acc, cur) => acc.add(toFraction(cur!)), toFraction(0)),
    [prices]
  )
  const decimals = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const isCoin1Base = isMintEqual(currentAmmPool?.state.mintA.mint, coin1)
  const isFocus1 = focusSide === 'coin1'
  const isPairPoolDirectionEq = (isFocus1 && isCoin1Base) || (!isCoin1Base && !isFocus1)
  const tickDirection = useMemo(
    () => Math.pow(-1, isCoin1Base ? (isFocus1 ? 0 : 1) : isFocus1 ? 1 : 0),
    [isCoin1Base, isFocus1]
  )

  const currentPrice = currentAmmPool
    ? decimalToFraction(
        isCoin1Base ? currentAmmPool.state.currentPrice : new Decimal(1).div(currentAmmPool.state.currentPrice)
      )
    : undefined

  const inputDisable =
    currentAmmPool && currentPrice && priceLower !== undefined && priceUpper !== undefined
      ? [
          toBN(priceUpper || 0, decimals).lt(toBN(currentPrice || 0, decimals)),
          toBN(priceLower || 0, decimals).gt(toBN(currentPrice || 0, decimals))
        ]
      : [false, false]

  if (!isFocus1) inputDisable.reverse()
  const [coin1InputDisabled, coin2InputDisabled] = inputDisable

  const swapElementBox1 = useRef<HTMLDivElement>(null)
  const swapElementBox2 = useRef<HTMLDivElement>(null)
  const [, { toggleSwap: toggleUISwap }] = useSwapTwoElements(swapElementBox1, swapElementBox2)
  useRecordedEffect(
    ([prevFocusSide]) => {
      if (prevFocusSide && prevFocusSide !== focusSide) {
        toggleUISwap()
      }
    },
    [focusSide]
  )

  const toFixedNumber = useCallback((val: Numberish): number => Number(toFraction(val).toFixed(decimals)), [decimals])

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

  useEffect(
    () => () =>
      useConcentrated.setState({
        focusSide: 'coin1',
        userCursorSide: 'coin1',
        totalDeposit: undefined
      }),
    []
  )
  useEffect(() => useConcentrated.setState({ totalDeposit }), [totalDeposit])
  useEffect(() => {
    if (poolFocusKey === prevFocusKey || !boundaryData) return
    useConcentrated.setState(boundaryData)
    setPosition({
      [Range.Low]: Number(boundaryData.priceLower.toFixed(decimals)),
      [Range.Upper]: Number(boundaryData.priceUpper.toFixed(decimals))
    })
  }, [boundaryData, poolFocusKey, prevFocusKey, decimals])

  const blurCheckTickRef = useRef<boolean>(false)
  const isEmptyPoolData = !coin1 || !coin2 || !currentAmmPool
  const handleChangeFocus = useCallback((focusSide) => useConcentrated.setState({ focusSide }), [])
  const handleSelectToken = useCallback((token, tokenKey) => useConcentrated.setState({ [tokenKey!]: token }), [])
  const handlePriceChange = useEvent(({ side, val }) => {
    if (isEmptyPoolData) return
    const res = getPriceTick({
      p: val,
      coin1,
      coin2,
      reverse: !isFocus1,
      ammPool: currentAmmPool
    })
    tickRef.current[side] = res.tick
    setPosition((p) => ({ ...p, [side]: toFixedNumber(val) }))
    blurCheckTickRef.current = true
  })

  const handleAdjustMin = useEvent((): void => {
    if (!currentAmmPool || position[Range.Low] === undefined || position[Range.Upper] === undefined) return
    if (position[Range.Low]! >= position[Range.Upper]!) {
      const targetCoin = isFocus1 ? coin1 : coin2
      const minTick = tickRef.current[Range.Upper]! - currentAmmPool.state.tickSpacing * tickDirection
      const { price, tick } = getTickPrice({
        poolInfo: currentAmmPool.state,
        baseIn: isMintEqual(currentAmmPool.state.mintA.mint, targetCoin?.mint),
        tick: minTick
      })
      tickRef.current[Range.Low] = tick
      useConcentrated.setState({ priceLowerTick: tick, priceLower: price })
      setPosition((p) => ({ ...p, [Range.Low]: toFixedNumber(price) }))
    }
  })

  const handleBlur = useCallback(
    ({ side, val }: { side: Range; val?: number | string }) => {
      if (!currentAmmPool || !coin1 || !coin2 || !val) return
      blurTimerRef.current = window.setTimeout(() => {
        if (blurCheckTickRef.current) {
          const res = getPriceTick({
            p: val,
            coin1,
            coin2,
            reverse: !isFocus1,
            ammPool: currentAmmPool
          })
          tickRef.current[side] = res.tick
          setPosition((p) => ({ ...p, [side]: toFixedNumber(res.price) }))
          useConcentrated.setState(getSideState({ side, price: res.price, tick: res.tick }))
        }
        blurCheckTickRef.current = false
        handleAdjustMin()
      }, 200)
    },
    [coin1, coin2, currentAmmPool?.idString, isFocus1, toFixedNumber]
  )

  const handleClickInDecrease = useEvent(
    ({ val, side, isIncrease }: { val?: number | string; side: Range; isIncrease: boolean }) => {
      if (!currentAmmPool || !coin1 || !coin2 || !val) return 0
      blurTimerRef && clearTimeout(blurTimerRef.current)
      blurCheckTickRef.current = false
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
      const priceNum = Number(price.toFixed(decimals))
      if (side === Range.Low && priceNum >= position[Range.Upper]!) return Number(val)
      tickRef.current[side] = nextTick
      useConcentrated.setState(getSideState({ side, price, tick: nextTick }))
      setPosition((p) => ({ ...p, [side]: priceNum }))
      return priceNum
    }
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
            <SelectTokenInputBox title="Base Token" tokenKey="coin1" onSelectToken={handleSelectToken} />
            <SelectTokenInputBox title="Quote Token" tokenKey="coin2" onSelectToken={handleSelectToken} />
          </Grid>
        </div>

        <div>
          <div className="font-medium text-[#abc4ff] my-1">Select Fee</div>
          <ConcentratedFeeSwitcher />
        </div>
        <div className="text-secondary-title mt-5 mb-3">Deposit Amount</div>
        <div>
          <div className="relative" ref={swapElementBox1}>
            {coin1InputDisabled && <InputLocked />}
            {coin1 ? (
              <CoinInputBox
                className="mb-4 mobile:mt-0 py-2 mobile:py-1 px-3 mobile:px-2 border-1.5 border-[#abc4ff40]"
                disabled={isApprovePanelShown}
                disabledInput={!currentAmmPool}
                noDisableStyle
                value={currentAmmPool ? toString(coin1Amount) : undefined}
                haveHalfButton
                haveCoinIcon
                topLeftLabel=""
                onPriceChange={updatePrice1}
                onUserInput={(amount) => {
                  useConcentrated.setState({ coin1Amount: amount, userCursorSide: 'coin1' })
                }}
                token={coin1}
              />
            ) : (
              <EmptyCoinInput />
            )}
          </div>

          <div className="relative" ref={swapElementBox2}>
            {coin2InputDisabled && <InputLocked />}
            {coin2 ? (
              <CoinInputBox
                className="py-2 mobile:py-1 px-3 mobile:px-2 border-1.5 border-[#abc4ff40]"
                disabled={isApprovePanelShown}
                disabledInput={!currentAmmPool}
                noDisableStyle
                value={currentAmmPool ? toString(coin2Amount) : undefined}
                haveHalfButton
                haveCoinIcon
                topLeftLabel=""
                onPriceChange={updatePrice2}
                onUserInput={(amount) => {
                  useConcentrated.setState({ coin2Amount: amount, userCursorSide: 'coin2' })
                }}
                token={coin2}
              />
            ) : (
              <EmptyCoinInput />
            )}
          </div>
        </div>
      </div>

      {/* right */}
      <div className="w-1/2 border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
        <div>
          <div className="flex mb-6">
            <div className="font-medium text-[#abc4ff] my-1">Set Starting Price</div>
            <SwitchFocusTabs coin1={coin1} coin2={coin2} focusSide={focusSide} onChangeFocus={handleChangeFocus} />
          </div>

          <InputBox
            decimalMode
            inputClassName="text-right"
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
            value={currentPrice ? toFixedNumber(currentPrice) : ''}
            onUserInput={(value) => {
              useConcentrated.setState({ userSettedCurrentPrice: value })
            }}
          />
        </div>
        <div className="text-secondary-title mt-5 mb-3">Set Price Range</div>
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

function SelectTokenInputBox({
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
