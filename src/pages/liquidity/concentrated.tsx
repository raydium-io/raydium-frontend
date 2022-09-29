import useAppSettings from '@/application/appSettings/useAppSettings'
import useConcentrated from '@/application/concentrated/useConcentrated'
import txCreateConcentrated from '@/application/concentrated/txCreateConcentrated'
import useConcentratedAmmSelector from '@/application/concentrated/useConcentratedAmmSelector'
import useConcentratedAmountCalculator from '@/application/concentrated/useConcentratedAmountCalculator'
import toPercentString from '@/functions/format/toPercentString'
import { decimalToFraction } from '@/application/txTools/decimal2Fraction'
import toFraction from '@/functions/numberish/toFraction'
import { isMintEqual } from '@/functions/judgers/areEqual'
import toUsdVolume from '@/functions/format/toUsdVolume'
import useWallet from '@/application/wallet/useWallet'
import Button, { ButtonHandle } from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import PageLayout from '@/components/PageLayout'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
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
import Chart from '../../pageComponents/ConcentratedRangeChart/Chart'
import { Range } from '../../pageComponents/ConcentratedRangeChart/chartUtil'
import AddLiquidityConfirmDialog from '../../pageComponents/Concentrated/AddLiquidityConfirmDialog'
import { Fraction } from 'test-r-sdk'
import { RemainSOLAlert, canTokenPairBeSelected, toXYChartFormat, PairInfoTitle } from '@/pageComponents/Concentrated'
import Decimal from 'decimal.js'
import useConcentratedInitCoinFiller from '@/application/concentrated/useConcentratedInitCoinFiller'
import { routeTo } from '@/application/routeTools'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'

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
        <ConcentratedHead />
        <ConcentratedCard />
        {/* <UserLiquidityExhibition /> */}
      </PageLayout>
    </ConcentratedUIContextProvider>
  )
}
function ConcentratedEffects() {
  useConcentratedAmmSelector()
  useConcentratedAmountCalculator()
  useConcentratedInitCoinFiller()
  return null
}

// const availableTabValues = ['Swap', 'Liquidity'] as const
function ConcentratedHead() {
  return (
    <Row className="justify-center  mb-12 mobile:mb-2">
      <RowTabs
        currentValue={'Concentrated'}
        values={['Swap', 'Liquidity', 'Concentrated']}
        onChange={(newTab) => {
          if (newTab === 'Liquidity') routeTo('/liquidity/add')
          else if (newTab === 'Swap') routeTo('/swap')
        }}
      />
    </Row>
  )
}

function ConcentratedCard() {
  const chartPoints = useConcentrated((s) => s.chartPoints)
  const connected = useWallet((s) => s.connected)
  const [isConfirmOn, { off: onConfirmClose, on: onConfirmOpen }] = useToggle(false)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const [isCoinSelectorOn, { on: turnOnCoinSelector, off: turnOffCoinSelector }] = useToggle()
  const getToken = useToken((s) => s.getToken)
  // it is for coin selector panel
  const [targetCoinNo, setTargetCoinNo] = useState<'1' | '2'>('1')
  const checkWalletHasEnoughBalance = useWallet((s) => s.checkWalletHasEnoughBalance)
  const { coin1, coin1Amount, coin2, coin2Amount, focusSide, currentAmmPool, priceLowerTick, priceUpperTick } =
    useConcentrated()
  const chartRef = useRef<{ getPosition: () => { min: number; max: number } }>()
  const tickRef = useRef<{ lower?: number; upper?: number }>({ lower: undefined, upper: undefined })
  const hasReward = !!currentAmmPool && currentAmmPool.state.rewardInfos.length > 0
  const decimals = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const isCoin1Base = isMintEqual(currentAmmPool?.state.mintA.mint, coin1)
  const isFocus1 = focusSide === 'coin1'
  const isCoinPoolDirectionEq = !((isFocus1 && isCoin1Base) || (!isCoin1Base && !isFocus1))
  const points = useMemo(() => {
    const formatPoints = chartPoints ? toXYChartFormat(chartPoints) : undefined
    if (isCoinPoolDirectionEq) return formatPoints
    return formatPoints ? formatPoints.map((p) => ({ x: 1 / p.x, y: p.y })).reverse() : undefined
  }, [chartPoints, isCoinPoolDirectionEq])

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
      reverse: !isCoinPoolDirectionEq
    })
    tickRef.current.lower = res?.priceLowerTick
    tickRef.current.upper = res?.priceUpperTick
    return res
  }, [coin1, coin2, currentAmmPool, isCoinPoolDirectionEq])

  useEffect(() => {
    boundaryData && useConcentrated.setState(boundaryData)
  }, [boundaryData])

  const handleClickInDecrease = ({ p, isMin, isIncrease }: { p: number; isMin: boolean; isIncrease: boolean }) => {
    if (!currentAmmPool || !coin1 || !coin2) return
    const targetCoin = isFocus1 ? coin1 : coin2
    const tickKey = isMin ? 'lower' : 'upper'
    if (!tickRef.current[tickKey]) {
      const res = getPriceTick({
        p: p * 1.002,
        coin1,
        coin2,
        reverse: !isFocus1,
        ammPool: currentAmmPool
      })
      tickRef.current[tickKey] = res.tick
    }
    const nextTick = tickRef.current[tickKey]! + (isIncrease ? 1 : -1) * Math.pow(-1, isFocus1 ? 0 : 1)
    const { price, tick } = getTickPrice({
      poolInfo: currentAmmPool.state,
      baseIn: isMintEqual(currentAmmPool.state.mintA.mint, targetCoin?.mint),
      tick: nextTick
    })
    tickRef.current[tickKey] = tick

    return price
  }

  const prices = [coin1Amount ? toFraction(coin1Amount) : undefined, coin2Amount ? toFraction(coin2Amount) : undefined]
  const totalDeposit = prices
    .filter((p) => !!p)
    .reduce((acc, cur) => {
      const newAcc = acc!.add(toFraction(cur!))

      return newAcc
    }, new Fraction(0))

  const ratio1 = parseFloat(prices[0] ? prices[0].div(totalDeposit!).mul(100).toFixed(1, undefined, 0) : '0')
  const ratio2 = prices[1] ? parseFloat((100 - Number(ratio1)).toFixed(1)) : '0'

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
      } else {
        tickRef.current = { lower: res.priceLowerTick, upper: res.priceUpperTick }
        useConcentrated.setState(res)
      }
      return res
    },
    [coin1, coin2, currentAmmPool, isFocus1]
  )

  const handleClickCreatePool = useCallback(() => {
    const position = chartRef.current!.getPosition()
    useConcentrated.setState({
      priceLower: position.min,
      priceUpper: position.max
    })
    onConfirmOpen()
  }, [onConfirmOpen])

  return (
    <CyberpunkStyleCard
      domRef={cardRef}
      wrapperClassName="md:w-[806px] w-full self-center cyberpunk-bg-light"
      className="p-6 mobile:py-5 mobile:px-3"
    >
      <PairInfoTitle
        coin1={coin1}
        coin2={coin2}
        fee={toPercentString(currentAmmPool?.tradeFeeRate)}
        currentPrice={currentAmmPool?.state.currentPrice}
        isCoinPoolDirectionEq={isCoinPoolDirectionEq}
        focusSide={focusSide}
        onChangeFocus={(focusSide) => useConcentrated.setState({ focusSide })}
      />

      <div className="flex flex-gap-1 gap-2.5 mb-10">
        <div className="bg-dark-blue rounded-xl flex flex-col justify-between flex-1 px-3 py-4">
          <div>
            <div className="text-base leading-[22px] text-secondary-title mb-5">Deposit Amount</div>

            {/* input twin */}
            <>
              <CoinInputBox
                className="mt-5 mb-4 mobile:mt-0 border-1.5 border-[#abc4ff40]"
                disabled={isApprovePanelShown}
                noDisableStyle
                componentRef={coinInputBox1ComponentRef}
                domRef={swapElementBox1}
                value={toString(coin1Amount)}
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

              <CoinInputBox
                className="border-1.5 border-[#abc4ff40]"
                componentRef={coinInputBox2ComponentRef}
                domRef={swapElementBox2}
                disabled={isApprovePanelShown}
                noDisableStyle
                value={toString(coin2Amount)}
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
            </>

            <div className="mt-4 border-1.5 border-secondary-title border-opacity-50  rounded-xl px-3 py-4">
              <div className="flex justify-between mb-4">
                <span className="text-sm leading-[18px] text-secondary-title">Total Deposit</span>
                <span className="text-lg leading-[18px]">{toUsdVolume(totalDeposit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm leading-[18px] text-secondary-title">Deposit Ratio</span>
                <span className="text-lg flex leading-[18px]">
                  <CoinAvatar className="z-10 inline-block" noCoinIconBorder size="sm" token={coin1} />
                  <CoinAvatar className="-ml-2 inline-block mr-2" noCoinIconBorder size="sm" token={coin2} />
                  {ratio1}% / {ratio2}%
                </span>
              </div>
            </div>
          </div>

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
            Add Concentrated
          </Button>
          <RemainSOLAlert />
        </div>

        <div className="bg-dark-blue min-h-[180px] rounded-xl flex-1 px-3 py-4">
          <div className="text-base leading-[22px] text-secondary-title mb-3">Set Price Range</div>
          <Chart
            ref={chartRef}
            chartOptions={{
              points: points || [],
              initMinBoundaryX: boundaryData?.priceLower,
              initMaxBoundaryX: boundaryData?.priceUpper
            }}
            currentPrice={
              currentAmmPool
                ? decimalToFraction(
                    isCoinPoolDirectionEq
                      ? currentAmmPool.state.currentPrice
                      : new Decimal(1).div(currentAmmPool.state.currentPrice)
                  )
                : undefined
            }
            decimals={decimals}
            onPositionChange={handlePosChange}
            onInDecrease={handleClickInDecrease}
            showZoom
          />
          <div className="mt-4 border-1.5 border-secondary-title border-opacity-50  rounded-xl px-3 py-4">
            <div className="flex justify-between items-center">
              <span className="text-sm leading-[18px] text-secondary-title">Estimated APR</span>
              <span className="text-2xl leading-[30px]">≈{toPercentString(currentAmmPool?.totalApr30d)}</span>
            </div>
            {hasReward && (
              <div className="flex mt-[18px] border border-secondary-title border-opacity-50 rounded-xl p-2.5">
                <div className="mr-[22px]">
                  <span className="text-sm leading-[18px] text-secondary-title">Rewards</span>
                  {currentAmmPool?.state.rewardInfos.map((reward, idx) => {
                    const rewardToken = getToken(reward.tokenMint)
                    return (
                      <div key={reward.tokenMint.toBase58()} className="flex items-center mb-2">
                        <CoinAvatar className="inline-block" noCoinIconBorder size="sm" token={rewardToken} />
                        <span className="text-xs text-active-cyan opacity-50 mx-1">{rewardToken?.symbol}</span>
                        <span className="text-sm">{toPercentString(currentAmmPool?.rewardApr30d[idx])}</span>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <span className="text-sm leading-[18px] text-secondary-title">Fees</span>
                  <div className="flex items-center mb-2">
                    <CoinAvatar className="inline-block" noCoinIconBorder size="sm" token={coin1} />
                    <span className="text-xs text-active-cyan opacity-50 mx-1">Trading Fees</span>
                    <span className="text-sm">{toPercentString(currentAmmPool?.feeApr30d)}</span>
                  </div>
                </div>
              </div>
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
      {isConfirmOn && (
        <AddLiquidityConfirmDialog
          coin1={coin1!}
          coin2={coin2!}
          coin1Amount={coin1Amount!}
          coin2Amount={coin2Amount!}
          decimals={decimals}
          position={chartRef.current!.getPosition()}
          totalDeposit={toUsdVolume(totalDeposit)}
          currentPrice={currentAmmPool!.state.currentPrice}
          onConfirm={txCreateConcentrated}
          onClose={onConfirmClose}
        />
      )}
    </CyberpunkStyleCard>
  )
}
