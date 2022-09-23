import useAppSettings from '@/application/appSettings/useAppSettings'
import txCreateConcentrated from '@/application/concentrated/txCreateConcentrated'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConcentratedAmmSelector from '@/application/concentrated/useConcentratedAmmSelector'
import useConcentratedAmountCalculator from '@/application/concentrated/useConcentratedAmountCalculator'
import useConcentratedInfoLoader from '@/application/concentrated/useConcentratedInfoLoader'
import { routeTo } from '@/application/routeTools'
import { SOLDecimals, SOL_BASE_BALANCE } from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import { decimalToFraction } from '@/application/txTools/decimal2Fraction'
import useWallet from '@/application/wallet/useWallet'
import { Badge } from '@/components/Badge'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import { FadeIn } from '@/components/FadeIn'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import List from '@/components/List'
import PageLayout from '@/components/PageLayout'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'
import Tooltip from '@/components/Tooltip'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gte, isMeaningfulNumber, lt } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import createContextStore from '@/functions/react/createContextStore'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useSwapTwoElements } from '@/hooks/useSwapTwoElements'
import useToggle from '@/hooks/useToggle'
import { ChartPoint } from '@/pageComponents/ConcentratedRangeChart/ConcentratedRangeInputChartBody'
import { ChangeConcentratedPoolDialog } from '@/pageComponents/dialogs/ChangeConcentratedPoolDialog'
import TokenSelectorDialog from '@/pageComponents/dialogs/TokenSelectorDialog'
import { createRef, useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { ApiAmmV3Point } from 'test-r-sdk'
import { ConcentratedRangeInputChart } from '../../pageComponents/ConcentratedRangeChart/ConcentratedRangeInputChart'

const { ContextProvider: ConcentratedUIContextProvider, useStore: useLiquidityContextStore } = createContextStore({
  hasAcceptedPriceChange: false,
  coinInputBox1ComponentRef: createRef<CoinInputBoxHandle>(),
  coinInputBox2ComponentRef: createRef<CoinInputBoxHandle>(),
  liquidityButtonComponentRef: createRef<ButtonHandle>()
})

export default function Concentrated() {
  return (
    <ConcentratedUIContextProvider>
      <ConcentratedEffect />
      <PageLayout mobileBarTitle="Concentrated" metaTitle="Concentrated - Raydium">
        <ConcentratedPageHead />
        <ConcentratedCard />
      </PageLayout>
    </ConcentratedUIContextProvider>
  )
}

function ConcentratedEffect() {
  useConcentratedAmmSelector()
  useConcentratedAmountCalculator()
  return null
}

// const availableTabValues = ['Swap', 'Liquidity'] as const
function ConcentratedPageHead() {
  return (
    <Row className="mb-12 mobile:mb-2 self-center">
      <RowTabs
        currentValue={'Concentrated'}
        values={['Swap', 'Liquidity', 'Concentrated']}
        onChange={(newTab) => {
          if (newTab === 'Swap') routeTo('/swap')
          else if (newTab === 'Liquidity') routeTo('/liquidity/add')
        }}
      />
    </Row>
  )
}
function ConcentratedAmountInputPair() {
  const [isCoinSelectorOn, { on: turnOnCoinSelector, off: turnOffCoinSelector }] = useToggle()
  // it is for coin selector panel
  const [targetCoinNo, setTargetCoinNo] = useState<'1' | '2'>('1')
  const { coin1, coin1Amount, coin2, coin2Amount, focusSide, refreshConcentrated } = useConcentrated()
  const refreshTokenPrice = useToken((s) => s.refreshTokenPrice)

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

  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    useConcentrated.setState({
      scrollToInputBox: () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [cardRef])

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <>
      {/* input twin */}
      <CoinInputBox
        className="mt-5 mobile:mt-0"
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

      {/* swap button */}
      <div className="relative h-8 my-4">
        <Row className={`absolute h-full items-center transition-all ${'left-1/2 -translate-x-1/2'}`}>
          <Icon
            heroIconName="plus"
            className={`p-1 text-[#39D0D8] frosted-glass frosted-glass-teal rounded-full mr-4 select-none transition clickable`}
            onClick={() => {
              useConcentrated.setState((s) => ({ ...s, focusSide: s.focusSide === 'coin1' ? 'coin2' : 'coin1' }))
            }}
          />
        </Row>
        <Row className="absolute right-0 items-center">
          <div className={isApprovePanelShown ? 'not-clickable' : 'clickable'}>
            <RefreshCircle
              run={!isApprovePanelShown}
              refreshKey="liquidity/add"
              popPlacement="right-bottom"
              freshFunction={() => {
                if (isApprovePanelShown) return
                refreshConcentrated()
                refreshTokenPrice()
              }}
            />
          </div>
        </Row>
      </div>

      <CoinInputBox
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
    </>
  )
}

function ConcentratedCard() {
  const chartPoints = useConcentrated((s) => s.chartPoints)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)

  const { connected } = useWallet()
  // it is for coin selector panel
  const { coin1, coin1Amount, coin2, coin2Amount, focusSide } = useConcentrated()
  const focusSideCoin = focusSide === 'coin1' ? coin1 : coin2
  const { liquidityButtonComponentRef } = useLiquidityContextStore()

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

  const cardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    useConcentrated.setState({
      scrollToInputBox: () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [cardRef])

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <CyberpunkStyleCard
      domRef={cardRef}
      wrapperClassName=" w-[min(912px,100%)] self-center cyberpunk-bg-light"
      className="py-8 pt-4 px-6 mobile:py-5 mobile:px-3"
    >
      <Grid className="gap-8 grid-cols-2 w-[min(912px,100%)]">
        <Row className="col-span-full justify-between">
          <Row className="items-center gap-2">
            <CoinAvatarPair token1={currentAmmPool?.base} token2={currentAmmPool?.quote} />
            <div>
              {currentAmmPool?.base?.symbol ?? '--'} / {currentAmmPool?.quote?.symbol ?? '--'}
            </div>
            <Badge>Pool Fee {toPercentString(currentAmmPool?.tradeFeeRate)}</Badge>
          </Row>
          <Row className="items-center gap-2">
            <Badge>Pool Fee {toPercentString(currentAmmPool?.tradeFeeRate)}</Badge>
            {coin1 && coin2 && (
              <RowTabs
                size="sm"
                currentValue={focusSideCoin?.symbol}
                values={[coin1.symbol ?? '--', coin2?.symbol ?? '--']}
                onChange={(value) => {
                  useConcentrated.setState({ focusSide: value === coin1.symbol ? 'coin1' : 'coin2' })
                }}
              />
            )}
          </Row>
        </Row>

        <div>
          <ConcentratedAmountInputPair />
          {/* supply button */}
          <Button
            className="frosted-glass-teal w-full"
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
              }
              // {
              //   should: haveEnoughCoin1,
              //   fallbackProps: { children: `Insufficient ${coin1?.symbol ?? ''} balance` }
              // },
              // {
              //   should: haveEnoughCoin2,
              //   fallbackProps: { children: `Insufficient ${coin2?.symbol ?? ''} balance` }
              // },
            ]}
            onClick={() => {
              txCreateConcentrated()
            }}
          >
            Add Concentrated
          </Button>{' '}
        </div>

        {/* <ConcentratedFeeSwitcher className="mt-12" /> */}
        <div className="relative">
          <ConcentratedRangeInputChart
            className={`mt-5 ${chartPoints ? '' : 'blur-md'}`}
            chartOptions={{
              points: chartPoints ? toXYChartFormat(chartPoints) : undefined
            }}
            currentPrice={decimalToFraction(currentAmmPool?.state.currentPrice)}
            poolId={toPubString(currentAmmPool?.state.id)}
          />
          {!chartPoints && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl whitespace-nowrap text-[#abc4ff80]">
              select token to view this
            </div>
          )}
        </div>
        {/* alert user if sol is not much */}
        <RemainSOLAlert />
      </Grid>
    </CyberpunkStyleCard>
  )
}

function canTokenPairBeSelected(targetToken: SplToken | undefined, candidateToken: SplToken | undefined) {
  return !isMintEqual(targetToken?.mint, candidateToken?.mint)
}

function RemainSOLAlert() {
  const rawsolBalance = useWallet((s) => s.solBalance)
  const solBalance = div(rawsolBalance, 10 ** SOLDecimals)

  return (
    <FadeIn>
      {solBalance && lt(solBalance, SOL_BASE_BALANCE) && gte(solBalance, 0) && (
        <Row className="text-sm mt-2 text-[#D8CB39] items-center justify-center">
          SOL balance: {toString(solBalance)}{' '}
          <Tooltip placement="bottom-right">
            <Icon size="sm" heroIconName="question-mark-circle" className="ml-2 cursor-help" />
            <Tooltip.Panel>
              <p className="w-80">
                SOL is needed for Solana network fees. A minimum balance of {SOL_BASE_BALANCE} SOL is recommended to
                avoid failed transactions. This swap will leave you with less than {SOL_BASE_BALANCE} SOL.
              </p>
            </Tooltip.Panel>
          </Tooltip>
        </Row>
      )}
    </FadeIn>
  )
}

function ConcentratedFeeSwitcher({ className }: { className?: string }) {
  const selectableAmmPools = useConcentrated((s) => s.selectableAmmPools)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const unselectedAmmPools = selectableAmmPools?.filter(
    ({ state: { id } }) => !isMintEqual(id, currentAmmPool?.state.id)
  )
  return (
    <Collapse className={twMerge('bg-[#141041] rounded-xl', className)} disable={!unselectedAmmPools?.length}>
      <Collapse.Face>
        {(open) => (
          <ConcentratedFeeSwitcherFace
            haveArrow={Boolean(unselectedAmmPools?.length)}
            open={open}
            currentPool={currentAmmPool}
          />
        )}
      </Collapse.Face>
      <Collapse.Body>
        <ConcentratedFeeSwitcherContent unselectedAmmPools={unselectedAmmPools} />
      </Collapse.Body>
    </Collapse>
  )
}

function ConcentratedFeeSwitcherFace({
  open,
  currentPool,
  haveArrow
}: {
  haveArrow?: boolean
  open: boolean
  currentPool?: HydratedConcentratedInfo
}) {
  return (
    <Row className={`p-5 mobile:py-4 mobile:px-5 gap-2 items-stretch justify-between`}>
      {currentPool ? (
        <Row className={`${haveArrow ? 'gap-4' : 'justify-between w-full'}`}>
          <div>
            <div className="text-sm text-[#abc4ff80]">protocolFeeRate</div>
            <div className="text-[#abc4ff]">{toPercentString(currentPool.protocolFeeRate, { fixed: 4 })}</div>
          </div>
          <div>
            <div className="text-sm text-[#abc4ff80]">tickSpacing</div>
            <div className="text-[#abc4ff]">{currentPool.state.tickSpacing}</div>
          </div>
          <div>
            <div className="text-sm text-[#abc4ff80]">tradeFeeRate</div>
            <div className="text-[#abc4ff]">{toPercentString(currentPool.tradeFeeRate, { fixed: 4 })}</div>
          </div>
        </Row>
      ) : (
        <div> -- </div>
      )}
      <Grid className={`w-6 h-6 place-items-center self-center ${haveArrow ? '' : 'hidden'}`}>
        <Icon size="sm" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
      </Grid>
    </Row>
  )
}

function ConcentratedFeeSwitcherContent({ unselectedAmmPools }: { unselectedAmmPools?: HydratedConcentratedInfo[] }) {
  return (
    <Row className="p-4 gap-4">
      {unselectedAmmPools?.map((unselectedAmmPool) => (
        <div
          key={toPubString(unselectedAmmPool.state.id)}
          className="grow p-5 mobile:py-4 mobile:px-5 gap-2 items-stretch ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-xl"
          onClick={() => {
            useConcentrated.setState({ currentAmmPool: unselectedAmmPool })
          }}
        >
          <Col className="gap-4">
            <div>
              <div className="text-sm text-[#abc4ff80]">protocolFeeRate</div>
              <div className="text-[#abc4ff]">{toPercentString(unselectedAmmPool.protocolFeeRate, { fixed: 4 })}</div>
            </div>
            <div>
              <div className="text-sm text-[#abc4ff80]">tickSpacing</div>
              <div className="text-[#abc4ff]">{unselectedAmmPool.state.tickSpacing}</div>
            </div>
            <div>
              <div className="text-sm text-[#abc4ff80]">tradeFeeRate</div>
              <div className="text-[#abc4ff]">{toPercentString(unselectedAmmPool.tradeFeeRate, { fixed: 4 })}</div>
            </div>
          </Col>
        </div>
      ))}
    </Row>
  )
}

function toXYChartFormat(points: ApiAmmV3Point[]): ChartPoint[] {
  return points.map(({ liquidity, price }) => ({
    x: Number(price),
    y: Number(liquidity)
  }))
}
