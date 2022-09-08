import { createRef, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConcentrated from '@/application/concentrated/useConcentrated'
import txAddLiquidity from '@/application/liquidity/txAddLiquidity'
import { routeTo } from '@/application/routeTools'
import { SOLDecimals, SOL_BASE_BALANCE } from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import Button, { ButtonHandle } from '@/components/Button'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import { FadeIn } from '@/components/FadeIn'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import PageLayout from '@/components/PageLayout'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'
import Tooltip from '@/components/Tooltip'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gte, isMeaningfulNumber, lt } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import createContextStore from '@/functions/react/createContextStore'
import useToggle from '@/hooks/useToggle'
import { SearchAmmDialog } from '@/pageComponents/dialogs/SearchAmmDialog'
import TokenSelectorDialog from '@/pageComponents/dialogs/TokenSelectorDialog'
import { ConcentratedRangeInputChart } from '../../pageComponents/ConcentratedRangeChart/ConcentratedRangeInputChart'
import useConcentratedInfoLoader from '@/application/concentrated/useConcentratedInfoLoader'
import useConcentratedAmmSelector from '@/application/concentrated/useConcentratedAmmSelector'
import { ApiAmmPoint } from 'test-r-sdk'
import { ChartPoint } from '@/pageComponents/ConcentratedRangeChart/ConcentratedRangeInputChartBody'
import { decimalToFraction } from '@/application/txTools/decimal2Fraction'
import toPubString from '@/functions/format/toMintString'

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
  useConcentratedInfoLoader()
  useConcentratedAmmSelector()
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

function ConcentratedCard() {
  const chartPoints = useConcentrated((s) => s.chartPoints)
  const { connected } = useWallet()
  const [isCoinSelectorOn, { on: turnOnCoinSelector, off: turnOffCoinSelector }] = useToggle()
  // it is for coin selector panel
  const [targetCoinNo, setTargetCoinNo] = useState<'1' | '2'>('1')

  const checkWalletHasEnoughBalance = useWallet((s) => s.checkWalletHasEnoughBalance)

  const { coin1, coin1Amount, coin2, coin2Amount, focusSide, isSearchAmmDialogOpen, refreshConcentrated } =
    useConcentrated()
  const refreshTokenPrice = useToken((s) => s.refreshTokenPrice)

  const { coinInputBox1ComponentRef, coinInputBox2ComponentRef, liquidityButtonComponentRef } =
    useLiquidityContextStore()

  const haveEnoughCoin1 =
    coin1 && checkWalletHasEnoughBalance(toTokenAmount(coin1, coin1Amount, { alreadyDecimaled: true }))
  const haveEnoughCoin2 =
    coin2 && checkWalletHasEnoughBalance(toTokenAmount(coin2, coin2Amount, { alreadyDecimaled: true }))

  const cardRef = useRef<HTMLDivElement>(null)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <CyberpunkStyleCard
      domRef={cardRef}
      wrapperClassName="w-[min(456px,100%)] self-center cyberpunk-bg-light"
      className="py-8 pt-4 px-6 mobile:py-5 mobile:px-3"
    >
      {/* input twin */}
      <>
        <CoinInputBox
          className="mt-5 mobile:mt-0"
          disabled={isApprovePanelShown}
          noDisableStyle
          componentRef={coinInputBox1ComponentRef}
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
            useConcentrated.setState({ coin1Amount: amount, focusSide: 'coin1' })
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
            <Icon heroIconName="plus" className="p-1 text-[#39D0D8]" />
            {/* <FadeIn>{hasHydratedLiquidityPool && <LiquidityCardPriceIndicator className="w-max" />}</FadeIn> */}
          </Row>
          <Row className="absolute right-0 items-center">
            <Icon
              size="sm"
              heroIconName="search"
              className={`p-2 frosted-glass frosted-glass-teal rounded-full mr-4 clickable text-[#39D0D8] select-none ${
                isApprovePanelShown ? 'not-clickable' : ''
              }`}
              onClick={() => {
                useConcentrated.setState({ isSearchAmmDialogOpen: true })
              }}
            />
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
            useConcentrated.setState({ coin2Amount: amount, focusSide: 'coin2' })
          }}
          token={coin2}
        />
      </>

      <ConcentratedFeeSwitcher className="mt-12" />
      <ConcentratedRangeInputChart
        className="mt-5"
        chartOptions={{
          points: chartPoints ? toXYChartFormat(chartPoints) : undefined
        }}
        currentPrice={decimalToFraction(currentAmmPool?.state.currentPrice)}
        poolId={toPubString(currentAmmPool?.state.id)}
      />

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
            should: coin1Amount && isMeaningfulNumber(coin1Amount) && coin2Amount && isMeaningfulNumber(coin2Amount),
            fallbackProps: { children: 'Enter an amount' }
          },
          {
            should: haveEnoughCoin1,
            fallbackProps: { children: `Insufficient ${coin1?.symbol ?? ''} balance` }
          },
          {
            should: haveEnoughCoin2,
            fallbackProps: { children: `Insufficient ${coin2?.symbol ?? ''} balance` }
          },
          {
            should: isMeaningfulNumber(coin1Amount) && isMeaningfulNumber(coin2Amount),
            fallbackProps: { children: 'Enter an amount' }
          }
        ]}
        onClick={() => {
          txAddLiquidity()
        }}
      >
        Add Liquidity
      </Button>
      {/* alert user if sol is not much */}
      <RemainSOLAlert />
      {/** coin selector panel */}
      <TokenSelectorDialog
        open={isCoinSelectorOn}
        close={turnOffCoinSelector}
        onSelectCoin={(token) => {
          if (targetCoinNo === '1') {
            useConcentrated.setState({ coin1: token })
            // delete other
            if (!canTokenPairBeSelected(token, coin2)) {
              useConcentrated.setState({ coin2: undefined, coin2Amount: undefined, coin2Tick: undefined })
            }
          } else {
            // delete other
            useConcentrated.setState({ coin2: token })
            if (!canTokenPairBeSelected(token, coin1)) {
              useConcentrated.setState({ coin1: undefined, coin1Amount: undefined, coin1Tick: undefined })
            }
          }
          turnOffCoinSelector()
        }}
      />
      <SearchAmmDialog
        open={isSearchAmmDialogOpen}
        onClose={() => {
          useConcentrated.setState({ isSearchAmmDialogOpen: false })
        }}
      />
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
  return (
    <Collapse className={twMerge('bg-[#141041] rounded-xl', className)}>
      <Collapse.Face>{(open) => <ConcentratedFeeSwitcherFace open={open} />}</Collapse.Face>
      <Collapse.Body>
        <ConcentratedFeeSwitcherContent />
      </Collapse.Body>
    </Collapse>
  )
}

function ConcentratedFeeSwitcherFace({ open }: { open: boolean }) {
  return (
    <Row className={`py-5 px-8 mobile:py-4 mobile:px-5 gap-2 items-stretch`}>
      <div className="grow">0.3% fee tier</div>
      <Grid className="w-6 h-6 place-items-center self-center">
        <Icon size="sm" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
      </Grid>
    </Row>
  )
}

function ConcentratedFeeSwitcherContent() {
  const fees = [
    { id: 'hello', label: 'hello' },
    { id: 'world', label: 'world ' }
  ]
  return (
    <Row className="p-4 gap-4">
      {fees.map((fee) => (
        <div
          key={fee.id}
          className="grow py-5 px-8 mobile:py-4 mobile:px-5 gap-2 items-stretch ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-xl"
        >
          {fee.label}
        </div>
      ))}
    </Row>
  )
}

function toXYChartFormat(points: ApiAmmPoint[]): ChartPoint[] {
  return points.map(({ liquidity, price }) => ({
    x: Number(price),
    y: Number(liquidity)
  }))
}
