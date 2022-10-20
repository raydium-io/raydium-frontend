import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/common/useAppSettings'
import { getPriceTick, getTickPrice } from '@/application/concentrated/getNearistDataPoint'
import { useAutoCreateAmmv3Pool } from '@/application/concentrated/useAutoCreateAmmv3Pool'
import useConcentrated from '@/application/concentrated/useConcentrated'
import { SplToken } from '@/application/token/type'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinInputBox from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import { FadeIn } from '@/components/FadeIn'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { useEvent } from '@/hooks/useEvent'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useSwapTwoElements } from '@/hooks/useSwapTwoElements'
import { Numberish } from '@/types/constants'
import TokenSelectorDialog from '../dialogs/TokenSelectorDialog'
import { CreateFeeSwitcher } from './CreateFeeSwitcher'
import EmptyCoinInput from './EmptyCoinInput'
import InputLocked from './InputLocked'
import PriceRangeInput from './PriceRangeInput'
import SwitchFocusTabs from './SwitchFocusTabs'
import { Range } from './type'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { calculateRatio } from '../Concentrated'

const getSideState = ({ side, price, tick }: { side: Range; price: Numberish; tick: number }) =>
  side === Range.Low ? { [side]: price, priceLowerTick: tick } : { [side]: price, priceUpperTick: tick }

export function CreatePoolCard() {
  useAutoCreateAmmv3Pool()

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  const coin1Amount = useConcentrated((s) => s.coin1Amount)
  const coin2Amount = useConcentrated((s) => s.coin2Amount)
  const focusSide = useConcentrated((s) => s.focusSide)
  const priceLower = useConcentrated((s) => s.priceLower)
  const priceUpper = useConcentrated((s) => s.priceUpper)
  const userSettedCurrentPrice = useConcentrated((s) => s.userSettedCurrentPrice)

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
  const totalDeposit = useMemo(
    () => prices.filter((p) => !!p).reduce((acc, cur) => acc.add(toFraction(cur!)), toFraction(0)),
    [prices]
  )
  const decimals = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const isCoin1Base = isMintEqual(currentAmmPool?.state.mintA.mint, coin1)
  const isFocus1 = focusSide === 'coin1'
  const tickDirection = useMemo(
    () => Math.pow(-1, isCoin1Base ? (isFocus1 ? 0 : 1) : isFocus1 ? 1 : 0),
    [isCoin1Base, isFocus1]
  )

  useEffect(
    () => () => {
      if (!useConcentrated.getState().userSettedCurrentPrice) return
      useConcentrated.setState({
        userSettedCurrentPrice: div(1, useConcentrated.getState().userSettedCurrentPrice)
      })
    },
    [focusSide]
  )

  const inputDisable =
    currentAmmPool && userSettedCurrentPrice !== undefined && priceLower !== undefined && priceUpper !== undefined
      ? [
          toBN(priceUpper || 0, decimals).lt(toBN(userSettedCurrentPrice || 0, decimals)),
          toBN(priceLower || 0, decimals).gt(toBN(userSettedCurrentPrice || 0, decimals))
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
    if (!res) return
    tickRef.current[side] = res.tick
    setPosition((p) => ({ ...p, [side]: toFixedNumber(val) }))
    blurCheckTickRef.current = true
  })

  useEffect(() => {
    if (!userSettedCurrentPrice) {
      setPosition({
        [Range.Low]: undefined,
        [Range.Upper]: undefined
      })
      return
    }
    handleBlur({
      side: Range.Upper,
      val: mul(userSettedCurrentPrice, 1.5)?.toFixed(decimals),
      skipCheck: true,
      noTimeOut: true
    })
    handleBlur({
      side: Range.Low,
      val: mul(userSettedCurrentPrice, 0.5)?.toFixed(decimals),
      skipCheck: true
    })
  }, [userSettedCurrentPrice, handlePriceChange, poolFocusKey, decimals])

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
    ({
      side,
      val,
      skipCheck,
      noTimeOut
    }: {
      side: Range
      val?: number | string
      skipCheck?: boolean
      noTimeOut?: boolean
    }) => {
      if (!currentAmmPool || !coin1 || !coin2 || !val) return
      const fn = () => {
        if (blurCheckTickRef.current || skipCheck) {
          const res = getPriceTick({
            p: val,
            coin1,
            coin2,
            reverse: !isFocus1,
            ammPool: currentAmmPool
          })
          if (!res) return undefined
          tickRef.current[side] = res.tick
          setPosition((p) => ({ ...p, [side]: toFixedNumber(res.price) }))
          useConcentrated.setState(getSideState({ side, price: res.price, tick: res.tick }))
        }
        blurCheckTickRef.current = false
        !skipCheck && handleAdjustMin()
        return undefined
      }
      blurTimerRef.current = noTimeOut ? fn() : window.setTimeout(fn, 200)
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

  const { ratio1, ratio2 } = calculateRatio({
    currentPrice: userSettedCurrentPrice != null ? toFraction(userSettedCurrentPrice) : userSettedCurrentPrice,
    coin1InputDisabled,
    coin2InputDisabled,
    coin1Amount,
    coin2Amount
  })

  return (
    <Card
      className={twMerge(
        `flex gap-4 p-6 mobile:py-4 mobile:px-2 rounded-3xl w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card`
      )}
      size="lg"
    >
      {/* left */}
      <Col className="gap-6 w-1/2 border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
        <div>
          <div className="font-medium text-[#abc4ff] mb-2">Select Tokens</div>
          <Grid className="grid-cols-2 gap-4">
            <SelectTokenInputBox
              title="Base Token"
              tokenKey="coin1"
              onSelectToken={handleSelectToken}
              token={coin1}
              disableTokens={coin2 ? [coin2] : undefined}
            />
            <SelectTokenInputBox
              title="Quote Token"
              tokenKey="coin2"
              onSelectToken={handleSelectToken}
              token={coin2}
              disableTokens={coin1 ? [coin1] : undefined}
            />
          </Grid>
        </div>

        <div>
          <div className="font-medium text-[#abc4ff] mb-2">Select Trade Fee Rate</div>
          <CreateFeeSwitcher />
        </div>

        <div>
          <div className="flex mb-1">
            <div className="font-medium text-[#abc4ff] my-1">Set Starting Price</div>
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
            value={userSettedCurrentPrice}
            decimalCount={decimals}
            onUserInput={(value) => {
              useConcentrated.setState({ userSettedCurrentPrice: value })
            }}
          />
        </div>
        <div>
          <div className="text-secondary-title font-medium mb-2">Set Price Range</div>
          <PriceRangeInput
            decimals={decimals}
            minValue={toString(position[Range.Low])}
            maxValue={toString(position[Range.Upper])}
            onBlur={handleBlur}
            onPriceChange={handlePriceChange}
            onInDecrease={handleClickInDecrease}
          />
        </div>
      </Col>

      {/* right */}
      <Col className="gap-6 w-1/2 border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
        <div>
          <Row className="text-secondary-title justify-between mb-2">
            <div className="font-medium text-[#abc4ff] my-1">Deposit Amount</div>
            <SwitchFocusTabs coin1={coin1} coin2={coin2} focusSide={focusSide} onChangeFocus={handleChangeFocus} />
          </Row>
          <div>
            <div className="relative" ref={swapElementBox1}>
              {coin1InputDisabled && <InputLocked />}
              {coin1 ? (
                <CoinInputBox
                  className="mb-4 mobile:mt-0 py-2 mobile:py-1 px-3 mobile:px-2"
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
                  className="py-2 mobile:py-1 px-3 mobile:px-2"
                  disabled={isApprovePanelShown}
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

        <div className="border-1.5 border-secondary-title border-opacity-50  rounded-xl px-3 py-4">
          <div className="flex justify-between mb-4">
            <span className="text-sm leading-[18px] text-secondary-title">Total Deposit</span>
            <span className="text-lg leading-[18px]">
              {Boolean(currentAmmPool) && (isMeaningfulNumber(coin1Amount) || isMeaningfulNumber(coin2Amount))
                ? toUsdVolume(totalDeposit)
                : '--'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm leading-[18px] text-secondary-title">Deposit Ratio</span>
            <span className="text-lg flex leading-[18px]">
              {currentAmmPool && <CoinAvatarPair size="sm" token1={coin1} token2={coin2} />}
              {Boolean(currentAmmPool) && (isMeaningfulNumber(coin1Amount) || isMeaningfulNumber(coin2Amount))
                ? `${ratio1}% / ${ratio2}%`
                : '--'}
            </span>
          </div>
        </div>

        {coin1InputDisabled || coin2InputDisabled ? (
          <FadeIn>
            <div className="flex items-center p-3 bg-[#2C2B57] rounded-xl text-sm text-[#D6CC56]">
              <Icon size="sm" className="mr-1.5" heroIconName="exclamation-circle" />
              Your position will not trade or earn fees until price moves into your range.
            </div>
          </FadeIn>
        ) : (
          ''
        )}

        <div className="text-xs bg-[#abc4ff14] p-3 rounded-xl text-[#abc4ff] leading-5">
          To initialize and create the pool, first set the starting price. Then, enter your price range and deposit
          amounts.
        </div>
      </Col>
    </Card>
  )
}

function SelectTokenInputBox({
  tokenKey,
  title,
  token,
  disableTokens,
  onSelectToken
}: {
  tokenKey?: string
  title?: string
  token?: SplToken
  disableTokens?: SplToken[]
  onSelectToken?: (token: SplToken, tokenKey?: string) => void
}) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  return (
    <>
      <Grid
        className=" grid items-center bg-[#141041] rounded-xl h-[70px] cursor-pointer px-3"
        onClick={() => setIsSelectorOpen(true)}
      >
        {token ? (
          <div>
            <div className="text-xs text-[#abc4ff80] my-1">{title}</div>
            <Row className="items-center gap-2">
              <CoinAvatar token={token} />
              <div className="text-[#abc4ff] font-medium text-lg">{token.symbol ?? ''}</div>
              <Icon size="sm" className="text-[#abc4ff]" heroIconName="chevron-down" />
            </Row>
          </div>
        ) : (
          <div className="text-[#abc4ff80] text-center">{title}</div>
        )}
      </Grid>
      <TokenSelectorDialog
        open={isSelectorOpen}
        onClose={() => {
          setIsSelectorOpen(false)
        }}
        disableTokens={disableTokens}
        onSelectToken={(token) => {
          onSelectToken?.(token, tokenKey)
        }}
      />
    </>
  )
}
