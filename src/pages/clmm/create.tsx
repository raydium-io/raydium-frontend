import useAppSettings from '@/application/appSettings/useAppSettings'
import useConcentrated, { TimeBasis } from '@/application/concentrated/useConcentrated'
import txCreateConcentrated from '@/application/concentrated/txCreateConcentrated'
import useConcentratedAmmSelector from '@/application/concentrated/useConcentratedAmmSelector'
import useConcentratedAmountCalculator from '@/application/concentrated/useConcentratedAmountCalculator'
import toPercentString from '@/functions/format/toPercentString'
import toPubString from '@/functions/format/toMintString'
import { decimalToFraction } from '@/application/txTools/decimal2Fraction'
import toFraction from '@/functions/numberish/toFraction'
import toBN from '@/functions/numberish/toBN'
import { isMintEqual } from '@/functions/judgers/areEqual'
import toUsdVolume from '@/functions/format/toUsdVolume'
import useWallet from '@/application/wallet/useWallet'
import Button, { ButtonHandle } from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import PageLayout from '@/components/PageLayout'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { gt, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import createContextStore from '@/functions/react/createContextStore'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useSwapTwoElements } from '@/hooks/useSwapTwoElements'
import useToggle from '@/hooks/useToggle'
import useToken from '@/application/token/useToken'
import TokenSelectorDialog from '@/pageComponents/dialogs/TokenSelectorDialog'
import { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getPriceBoundary,
  getPriceTick,
  getTickPrice,
  calLowerUpper
} from '@/application/concentrated/getNearistDataPoint'
import InputLocked from '@/pageComponents/Concentrated/InputLocked'
import Chart from '../../pageComponents/ConcentratedRangeChart/Chart'
import { Range } from '../../pageComponents/ConcentratedRangeChart/chartUtil'
import AddLiquidityConfirmDialog from '../../pageComponents/Concentrated/AddLiquidityConfirmDialog'
import { Fraction } from 'test-r-sdk'
import { RemainSOLAlert, canTokenPairBeSelected, toXYChartFormat, PairInfoTitle } from '@/pageComponents/Concentrated'
import Decimal from 'decimal.js'
import useConcentratedInitCoinFiller from '@/application/concentrated/useConcentratedInitCoinFiller'
import { routeBack, routeTo } from '@/application/routeTools'
import Row from '@/components/Row'
import Grid from '@/components/Grid'
import { FadeIn } from '@/components/FadeIn'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import { div, sub } from '@/functions/numberish/operations'
import { twMerge } from 'tailwind-merge'
import Icon from '@/components/Icon'
import { inClient } from '@/functions/judgers/isSSR'
import { BN } from 'bn.js'

const { ContextProvider: ConcentratedUIContextProvider, useStore: useLiquidityContextStore } = createContextStore({
  hasAcceptedPriceChange: false,
  coinInputBox1ComponentRef: createRef<CoinInputBoxHandle>(),
  coinInputBox2ComponentRef: createRef<CoinInputBoxHandle>(),
  liquidityButtonComponentRef: createRef<ButtonHandle>()
})

export default function Concentrated() {
  return (
    <ConcentratedUIContextProvider>
      <ConcentratedEffects />
      <PageLayout mobileBarTitle="Concentrated" metaTitle="Concentrated - Raydium">
        <NavButtons />
        <ConcentratedCard />
        {/* <UserLiquidityExhibition /> */}
      </PageLayout>
    </ConcentratedUIContextProvider>
  )
}

function NavButtons() {
  return (
    <Row
      className={twMerge(
        '-mt-4 mobile:mt-4 mb-8 mobile:mb-2 sticky z-10 -top-4 mobile:top-0 mobile:-translate-y-2 mobile:bg-[#0f0b2f] items-center justify-between'
      )}
    >
      <Button
        type="text"
        className="text-sm text-[#ABC4FF] opacity-50 px-0"
        prefix={<Icon heroIconName="chevron-left" size="sm" />}
        onClick={() => {
          if (inClient && window.history.length === 1) {
            // user jump directly into /farms/create page by clicking a link, we "goback" to /farms
            routeTo('/clmm/pools')
          } else {
            routeBack()
          }
        }}
      >
        Back to all pools
      </Button>
    </Row>
  )
}

function AsideNavButtons() {
  return (
    <Row
      className={twMerge(
        '-mt-4 mobile:mt-4 mb-8 mobile:mb-2 sticky z-10 -top-4 mobile:top-0 mobile:-translate-y-2 mobile:bg-[#0f0b2f] items-center justify-between'
      )}
    >
      <Button
        type="text"
        className="text-sm text-[#ABC4FF] px-0"
        prefix={<Icon heroIconName="chevron-left" />}
        onClick={() => {
          if (inClient && window.history.length === 1) {
            // user jump directly into /farms/create page by clicking a link, we "goback" to /farms
            routeTo('/clmm/pools')
          } else {
            routeBack()
          }
        }}
      ></Button>
    </Row>
  )
}

function ConcentratedEffects() {
  useConcentratedAmmSelector()
  useConcentratedAmountCalculator()
  useConcentratedInitCoinFiller()
  return null
}

function ConcentratedCard() {
  const chartPoints = useConcentrated((s) => s.chartPoints)
  const timeBasis = useConcentrated((s) => s.timeBasis)
  const connected = useWallet((s) => s.connected)
  const [isConfirmOn, { off: onConfirmClose, on: onConfirmOpen }] = useToggle(false)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const [isCoinSelectorOn, { on: turnOnCoinSelector, off: turnOffCoinSelector }] = useToggle()
  const getToken = useToken((s) => s.getToken)
  // it is for coin selector panel
  const [targetCoinNo, setTargetCoinNo] = useState<'1' | '2'>('1')
  const checkWalletHasEnoughBalance = useWallet((s) => s.checkWalletHasEnoughBalance)
  const {
    coin1,
    coin1Amount,
    coin2,
    coin2Amount,
    focusSide,
    currentAmmPool,
    hydratedAmmPools,
    priceUpper,
    priceLower
  } = useConcentrated()
  const chartRef = useRef<{ getPosition: () => { min: number; max: number } }>()
  const tickRef = useRef<{ lower?: number; upper?: number }>({ lower: undefined, upper: undefined })
  const hasReward = !!currentAmmPool && currentAmmPool.state.rewardInfos.length > 0
  const decimals = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const isCoin1Base = isMintEqual(currentAmmPool?.state.mintA.mint, coin1)
  const isFocus1 = focusSide === 'coin1'
  const isPairPoolDirectionEq = (isFocus1 && isCoin1Base) || (!isCoin1Base && !isFocus1)
  const points = useMemo(() => {
    const formatPoints = chartPoints ? toXYChartFormat(chartPoints) : undefined
    if (isPairPoolDirectionEq) return formatPoints
    return formatPoints ? formatPoints.map((p) => ({ x: 1 / p.x, y: p.y })).reverse() : undefined
  }, [chartPoints, isPairPoolDirectionEq])

  const { coinInputBox1ComponentRef, coinInputBox2ComponentRef, liquidityButtonComponentRef } =
    useLiquidityContextStore()

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

  const currentPrice = currentAmmPool
    ? decimalToFraction(
        isPairPoolDirectionEq
          ? currentAmmPool.state.currentPrice
          : new Decimal(1).div(currentAmmPool.state.currentPrice)
      )
    : undefined

  const inputDisable =
    currentAmmPool && currentPrice && priceUpper !== undefined && priceUpper !== undefined
      ? [
          toBN(priceUpper || 0, decimals).lt(toBN(currentPrice || 0, decimals)),
          toBN(priceLower || 0, decimals).gt(toBN(currentPrice || 0, decimals))
        ]
      : [false, false]

  if (!isFocus1) inputDisable.reverse()
  const [coin1InputDisabled, coin2InputDisabled] = inputDisable

  useEffect(() => {
    coin1InputDisabled && useConcentrated.setState({ coin1Amount: '0' })
    coin2InputDisabled && useConcentrated.setState({ coin2Amount: '0' })
  }, [coin1InputDisabled, coin2InputDisabled])

  const haveEnoughCoin1 =
    coin1 && checkWalletHasEnoughBalance(toTokenAmount(coin1, coin1Amount, { alreadyDecimaled: true }))
  const haveEnoughCoin2 =
    coin2 && checkWalletHasEnoughBalance(toTokenAmount(coin2, coin2Amount, { alreadyDecimaled: true }))

  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    useConcentrated.setState({
      scrollToInputBox: () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [cardRef])

  const boundaryData = useMemo(() => {
    const res = getPriceBoundary({
      coin1,
      coin2,
      ammPool: currentAmmPool,
      reverse: !isPairPoolDirectionEq
    })
    tickRef.current.lower = res?.priceLowerTick
    tickRef.current.upper = res?.priceUpperTick
    return res
  }, [coin1, coin2, currentAmmPool, isPairPoolDirectionEq])

  useEffect(() => {
    boundaryData && useConcentrated.setState(boundaryData)
  }, [boundaryData])

  const handleClickInDecrease = useCallback(
    ({ p, isMin, isIncrease }: { p: number; isMin: boolean; isIncrease: boolean }) => {
      if (!currentAmmPool || !coin1 || !coin2) return
      const targetCoin = isFocus1 ? coin1 : coin2
      const tickKey = isMin ? 'lower' : 'upper'
      if (tickRef.current[tickKey] === undefined) {
        const res = getPriceTick({
          p: p * 1.002,
          coin1,
          coin2,
          reverse: !isFocus1,
          ammPool: currentAmmPool
        })
        tickRef.current[tickKey] = res.tick
      }

      const nextTick =
        tickRef.current[tickKey]! +
        (isIncrease ? 1 : -1) * Math.pow(-1, isCoin1Base ? (isFocus1 ? 0 : 1) : isFocus1 ? 1 : 0)
      const { price, tick } = getTickPrice({
        poolInfo: currentAmmPool.state,
        baseIn: isMintEqual(currentAmmPool.state.mintA.mint, targetCoin?.mint),
        tick: nextTick
      })
      tickRef.current[tickKey] = nextTick
      isMin && useConcentrated.setState({ priceLower: price, priceLowerTick: nextTick })
      !isMin && useConcentrated.setState({ priceUpper: price, priceUpperTick: nextTick })
      return price
    },
    [coin1?.mint, coin2?.mint, currentAmmPool?.ammConfig.id, isFocus1, isCoin1Base]
  )

  const prices = [coin1Amount ? toFraction(coin1Amount) : undefined, coin2Amount ? toFraction(coin2Amount) : undefined]
  const totalDeposit = prices
    .filter((p) => !!p)
    .reduce((acc, cur) => {
      const newAcc = acc!.add(toFraction(cur!))

      return newAcc
    }, new Fraction(0))

  const ratio1 = currentPrice
    ? toFraction(coin1Amount || '0')
        .mul(currentPrice)
        .div(
          toBN(coin1Amount || 0).gt(new BN(0))
            ? toFraction(coin1Amount!)
                .mul(currentPrice)
                .add(toFraction(coin2Amount || '0'))
            : toFraction(1)
        )
        .mul(100)
        .toFixed(1)
    : '0'
  const ratio2 = currentPrice
    ? toFraction(coin2Amount || '0')
        .div(
          toBN(coin1Amount || 0).gt(new BN(0))
            ? toFraction(coin1Amount || '0')
                .mul(currentPrice)
                .add(toFraction(coin2Amount || '0'))
            : toFraction(1)
        )
        .mul(100)
        .toFixed(1)
    : '0'

  const handlePosChange = useCallback(
    ({ side, userInput, ...pos }: { min: number; max: number; side?: Range; userInput?: boolean }) => {
      if (!currentAmmPool || !coin1 || !coin2 || !pos.min || !pos.max) return
      const res = calLowerUpper({
        ...pos,
        coin1,
        coin2,
        ammPool: currentAmmPool,
        reverse: !isFocus1
      })!
      if (userInput && side) {
        const isMin = side === Range.Min
        const res = getPriceTick({
          p: pos[side] * 1.002,
          coin1,
          coin2,
          reverse: !isFocus1,
          ammPool: currentAmmPool
        })
        tickRef.current[isMin ? 'lower' : 'upper'] = res.tick
        isMin && useConcentrated.setState({ priceLowerTick: res.tick, priceLower: pos[side] })
        !isMin && useConcentrated.setState({ priceUpperTick: res.tick, priceUpper: pos[side] })
      } else {
        tickRef.current = { lower: res.priceLowerTick, upper: res.priceUpperTick }
        useConcentrated.setState(res)
      }
      return res
    },
    [toPubString(coin1?.mint), toPubString(coin2?.mint), toPubString(currentAmmPool?.ammConfig.id), isFocus1]
  )

  const handleClickCreatePool = useCallback(() => {
    const position = chartRef.current?.getPosition()
    if (!position) return
    useConcentrated.setState({
      priceLower: position.min,
      priceUpper: position.max
    })
    onConfirmOpen()
  }, [onConfirmOpen])

  const chartOptions = useMemo(
    () => ({
      points: points || [],
      initMinBoundaryX: boundaryData?.priceLower,
      initMaxBoundaryX: boundaryData?.priceUpper
    }),
    [points, boundaryData]
  )

  return (
    <CyberpunkStyleCard
      domRef={cardRef}
      wrapperClassName="w-[min(912px,100%)] w-full self-center cyberpunk-bg-light"
      className="p-6 mobile:py-5 mobile:px-3"
    >
      <div className="absolute -left-8 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <AsideNavButtons />
      </div>

      <PairInfoTitle
        coin1={coin1}
        coin2={coin2}
        fee={toPercentString(currentAmmPool?.tradeFeeRate, { exact: true })}
        focusSide={focusSide}
        onChangeFocus={(focusSide) => useConcentrated.setState({ focusSide })}
      />

      <div className="flex flex-gap-1 gap-3 mb-3">
        <div className="bg-dark-blue rounded-xl flex flex-col justify-between flex-1 px-3 py-4">
          <div>
            <div className="text-base leading-[22px] text-secondary-title mb-5">Deposit Amount</div>

            {/* input twin */}
            <div ref={swapElementBox1} className="relative">
              {coin1InputDisabled && <InputLocked />}
              <CoinInputBox
                className="mt-5 mb-4 mobile:mt-0 py-2 mobile:py-1 px-3 mobile:px-2 border-1.5 border-[#abc4ff40]"
                disabled={isApprovePanelShown}
                disabledInput={!currentAmmPool || coin1InputDisabled}
                noDisableStyle
                componentRef={coinInputBox1ComponentRef}
                value={currentAmmPool ? toString(coin1Amount) : undefined}
                haveHalfButton
                haveCoinIcon
                showTokenSelectIcon
                topLeftLabel=""
                onTryToTokenSelect={() => {
                  turnOnCoinSelector()
                  setTargetCoinNo('1')
                }}
                onUserInput={(amount) => {
                  useConcentrated.setState({ coin1Amount: amount, userCursorSide: 'coin1' })
                }}
                onEnter={(input) => {
                  if (!input) return
                  if (!coin2) coinInputBox2ComponentRef.current?.selectToken?.()
                  if (coin2 && coin2Amount) liquidityButtonComponentRef.current?.click?.()
                }}
                token={coin1}
              />
            </div>
            <div ref={swapElementBox2} className="relative">
              {coin2InputDisabled && <InputLocked />}
              <CoinInputBox
                className="py-2 mobile:py-1 px-3 mobile:px-2 border-1.5 border-[#abc4ff40]"
                componentRef={coinInputBox2ComponentRef}
                disabled={isApprovePanelShown}
                disabledInput={!currentAmmPool || coin2InputDisabled}
                noDisableStyle
                value={currentAmmPool ? toString(coin2Amount) : undefined}
                haveHalfButton
                haveCoinIcon
                showTokenSelectIcon
                topLeftLabel=""
                onTryToTokenSelect={() => {
                  turnOnCoinSelector()
                  setTargetCoinNo('2')
                }}
                onEnter={(input) => {
                  if (!input) return
                  if (!coin1) coinInputBox1ComponentRef.current?.selectToken?.()
                  if (coin1 && coin1Amount) liquidityButtonComponentRef.current?.click?.()
                }}
                onUserInput={(amount) => {
                  useConcentrated.setState({ coin2Amount: amount, userCursorSide: 'coin2' })
                }}
                token={coin2}
              />
            </div>

            <div className="mt-4 border-1.5 border-secondary-title border-opacity-50  rounded-xl px-3 py-4">
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
          </div>
          {coin1InputDisabled || coin2InputDisabled ? (
            <FadeIn>
              <div className="p-2 bg-[#141041] rounded mt-4 text-sm text-[#abc4ff]">
                Your position will not trade or earn fees until price moves into your range.
              </div>
            </FadeIn>
          ) : (
            ''
          )}

          {/* supply button */}
          <Button
            className="frosted-glass-teal w-full mt-5"
            componentRef={liquidityButtonComponentRef}
            isLoading={isApprovePanelShown}
            validators={[
              {
                should: connected,
                forceActive: true,
                fallbackProps: {
                  onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                  children: 'Connect Wallet'
                }
              },
              {
                should: currentAmmPool,
                fallbackProps: {
                  children: 'Pool Not Found'
                }
              },
              {
                should: gt(sub(priceUpper, priceLower), div(currentAmmPool?.currentPrice, 1000)),
                fallbackProps: {
                  children: 'Range to small'
                }
              },
              {
                should: coin1 && coin2,
                fallbackProps: { children: 'Select a token' }
              },
              {
                should: isMeaningfulNumber(coin1Amount) || isMeaningfulNumber(coin2Amount),
                fallbackProps: { children: 'Enter an amount' }
              },
              {
                should: haveEnoughCoin1,
                fallbackProps: { children: `Insufficient ${coin1?.symbol ?? ''} balance` }
              },
              {
                should: haveEnoughCoin2,
                fallbackProps: { children: `Insufficient ${coin2?.symbol ?? ''} balance` }
              }
            ]}
            onClick={() => {
              handleClickCreatePool()
            }}
          >
            Preview
          </Button>
          <RemainSOLAlert />
        </div>

        <div
          className={`relative bg-dark-blue min-h-[180px] rounded-xl flex-1 px-3 py-4 ${
            currentAmmPool ? '' : 'pointer-events-none select-none'
          }`}
        >
          {!currentAmmPool && (
            <div className="absolute inset-0 z-10 grid grid-child-center backdrop-blur-md text-[#abc4ff]">
              {hydratedAmmPools.length ? 'Pool Not Found' : 'Loading...'}
            </div>
          )}
          <div className="text-base leading-[22px] text-secondary-title mb-3">Set Price Range</div>
          <Chart
            ref={chartRef}
            chartOptions={chartOptions}
            currentPrice={currentPrice}
            priceLabel={isFocus1 ? `${coin2?.symbol} per ${coin1?.symbol}` : `${coin1?.symbol} per ${coin2?.symbol}`}
            decimals={decimals}
            onPositionChange={handlePosChange}
            onInDecrease={handleClickInDecrease}
            showZoom
            height={200}
          />
          <div className="mt-4 border-1.5 border-secondary-title border-opacity-50  rounded-xl px-3 py-4">
            <div className="flex justify-between items-center">
              <span className="text-sm leading-[18px] text-secondary-title">Estimated APR</span>
              <span className="text-2xl leading-[30px]">
                ≈
                {toPercentString(
                  currentAmmPool?.[
                    timeBasis === TimeBasis.DAY
                      ? 'totalApr24h'
                      : timeBasis === TimeBasis.WEEK
                      ? 'totalApr7d'
                      : 'totalApr30d'
                  ]
                )}
              </span>
            </div>
            {hasReward && (
              <Grid className="grid-cols-2 mt-[18px] border border-secondary-title border-opacity-50 rounded-xl p-2.5">
                <div>
                  <div className="text-sm leading-[18px] text-secondary-title my-1.5">Rewards</div>
                  {currentAmmPool?.state.rewardInfos.map((reward, idx) => {
                    const rewardToken = getToken(reward.tokenMint)
                    return (
                      <div key={reward.tokenMint.toBase58()} className="flex items-center mb-2">
                        <CoinAvatar className="inline-block" size="sm" token={rewardToken} />
                        <span className="text-xs text-[#abc4ff80] ml-1 mr-4">{rewardToken?.symbol}</span>
                        <span className="text-sm">
                          {toPercentString(
                            currentAmmPool?.[
                              timeBasis === TimeBasis.DAY
                                ? 'rewardApr24h'
                                : timeBasis === TimeBasis.WEEK
                                ? 'rewardApr7d'
                                : 'rewardApr30d'
                            ][idx]
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div className="text-sm leading-[18px] text-secondary-title my-1.5">Fees</div>
                  <div className="flex items-center mb-2">
                    <CoinAvatar className="inline-block" size="sm" token={coin1} />
                    <span className="text-xs text-[#abc4ff80] ml-1 mr-4">Trading Fees</span>
                    <span className="text-sm">
                      {toPercentString(
                        currentAmmPool?.[
                          timeBasis === TimeBasis.DAY
                            ? 'feeApr24h'
                            : timeBasis === TimeBasis.WEEK
                            ? 'feeApr7d'
                            : 'feeApr30d'
                        ]
                      )}
                    </span>
                  </div>
                </div>
              </Grid>
            )}
          </div>
        </div>
      </div>
      {/** coin selector panel */}
      <TokenSelectorDialog
        open={isCoinSelectorOn}
        close={turnOffCoinSelector}
        onSelectCoin={(token) => {
          if (targetCoinNo === '1') {
            useConcentrated.setState({ coin1: token })
            // delete other
            if (!canTokenPairBeSelected(token, coin2)) {
              useConcentrated.setState({ coin2: undefined, coin2Amount: undefined, priceLowerTick: undefined })
            }
          } else {
            // delete other
            useConcentrated.setState({ coin2: token })
            if (!canTokenPairBeSelected(token, coin1)) {
              useConcentrated.setState({ coin1: undefined, coin1Amount: undefined, priceUpperTick: undefined })
            }
          }
          turnOffCoinSelector()
        }}
      />
      <AddLiquidityConfirmDialog
        open={isConfirmOn}
        coin1={coin1}
        coin2={coin2}
        coin1Amount={coin1Amount}
        coin2Amount={coin2Amount}
        decimals={decimals}
        position={chartRef.current?.getPosition()}
        totalDeposit={toUsdVolume(totalDeposit)}
        currentPrice={
          currentAmmPool
            ? decimalToFraction(
                isCoin1Base ? currentAmmPool.state.currentPrice : new Decimal(1).div(currentAmmPool.state.currentPrice)
              )
            : undefined
        }
        onConfirm={(close) =>
          txCreateConcentrated().then(({ allSuccess }) => {
            if (allSuccess) close()
          })
        }
        onClose={onConfirmClose}
      />
    </CyberpunkStyleCard>
  )
}
