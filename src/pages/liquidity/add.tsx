import { createRef, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Percent } from '@raydium-io/raydium-sdk'

import BN from 'bn.js'
import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/common/useAppSettings'
import useFarms from '@/application/farms/useFarms'
import txAddLiquidity from '@/application/liquidity/txAddLiquidity'
import useLiquidity from '@/application/liquidity/useLiquidity'
import useLiquidityAmmSelector from '@/application/liquidity/useLiquidityAmmSelector'
import useLiquidityAmountCalculator from '@/application/liquidity/useLiquidityAmountCalculator'
import useLiquidityInitCoinFiller from '@/application/liquidity/useLiquidityInitCoinFiller'
import useLiquidityUrlParser from '@/application/liquidity/useLiquidityUrlParser'
import { routeTo } from '@/application/routeTools'
import { SOLDecimals, SOL_BASE_BALANCE } from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import { Badge } from '@/components/Badge'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import { FadeIn } from '@/components/FadeIn'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import Link from '@/components/Link'
import List from '@/components/List'
import PageLayout from '@/components/PageLayout'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import Tabs from '@/components/Tabs'
import Tooltip from '@/components/Tooltip'
import { addItem, unifyItem } from '@/functions/arrayMethods'
import formatNumber from '@/functions/format/formatNumber'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gte, isMeaningfulNumber, lt } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { objectShakeFalsy } from '@/functions/objectMethods'
import createContextStore from '@/functions/react/createContextStore'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import useToggle from '@/hooks/useToggle'
import { SearchAmmDialog } from '@/pageComponents/dialogs/SearchAmmDialog'
import { HexAddress } from '@/types/constants'

import { useCLMMMigration } from '@/application/clmmMigration/useCLMMMigration'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConnection from '@/application/connection/useConnection'
import { toUTC } from '@/functions/date/dateFormat'
import { isDateAfter } from '@/functions/date/judges'
import parseDuration from '@/functions/date/parseDuration'
import ConcentratedMigrateDialog from '@/pageComponents/dialogs/ConcentratedMigrateDialog'
import { Checkbox } from '../../components/Checkbox'
import { RemoveLiquidityDialog } from '../../pageComponents/dialogs/RemoveLiquidityDialog'
import TokenSelectorDialog from '../../pageComponents/dialogs/TokenSelectorDialog'

const { ContextProvider: LiquidityUIContextProvider, useStore: useLiquidityContextStore } = createContextStore({
  hasAcceptedPriceChange: false,
  coinInputBox1ComponentRef: createRef<CoinInputBoxHandle>(),
  coinInputBox2ComponentRef: createRef<CoinInputBoxHandle>(),
  liquidityButtonComponentRef: createRef<ButtonHandle>()
})

export default function Liquidity() {
  return (
    <LiquidityUIContextProvider>
      <LiquidityEffect />
      <PageLayout mobileBarTitle="Liquidity" metaTitle="Liquidity - Raydium">
        <LiquidityPageHead />
        <LiquidityCard />
        <UserLiquidityExhibition />
        <CreatePoolCardEntry />
      </PageLayout>
    </LiquidityUIContextProvider>
  )
}

function LiquidityEffect() {
  useLiquidityUrlParser()
  useLiquidityInitCoinFiller()
  useLiquidityAmmSelector()
  //  auto fresh  liquidity's coin1Amount and coin2Amount
  useLiquidityAmountCalculator()
  return null
}

// const availableTabValues = ['Swap', 'Liquidity'] as const
function LiquidityPageHead() {
  return (
    <Row className="mb-12 mobile:mb-2 self-center">
      <Tabs
        currentValue={'Liquidity'}
        values={['Swap', 'Liquidity']}
        onChange={(newTab) => {
          if (newTab === 'Swap') routeTo('/swap')
        }}
      />
    </Row>
  )
}

function useLiquidityWarning() {
  const currentJsonInfo = useLiquidity((s) => s.currentJsonInfo)
  const coin1 = useLiquidity((s) => s.coin1)
  const coin2 = useLiquidity((s) => s.coin2)
  const [userConfirmedList, setUserConfirmedList] = useLocalStorageItem<HexAddress /* ammId */[]>(
    'USER_CONFIRMED_LIQUIDITY_AMM_LIST'
  )
  const userConfirmedListRef = useRef(userConfirmedList)
  userConfirmedListRef.current = userConfirmedList

  const checkPermanent = useCallback(
    () =>
      Boolean(
        useLiquidity.getState().currentJsonInfo &&
          userConfirmedListRef.current?.includes(useLiquidity.getState().currentJsonInfo!.id)
      ),
    []
  )

  // permanent state
  const [hasUserPermanentConfirmed, setHasUserPermanentConfirmed] = useState(checkPermanent)
  // temporary state
  const [hasUserTemporaryConfirmed, setHasUserTemporaryConfirmed] = useState(false)

  // when change coin pair, just reset temporary confirm and permanent confirm
  useEffect(() => {
    if (currentJsonInfo) {
      setHasUserTemporaryConfirmed(false)
    }
    if (currentJsonInfo) {
      setHasUserPermanentConfirmed(checkPermanent())
    }
  }, [currentJsonInfo])

  const applyPermanentConfirm = (ammId: string) => {
    if (hasUserPermanentConfirmed) {
      setUserConfirmedList((old) => unifyItem(addItem(old ?? [], ammId)))
    }
  }
  const toggleTemporarilyConfirm = (checkState: boolean) => setHasUserTemporaryConfirmed(checkState)
  const togglePermanentlyConfirm = (checkState: boolean) => {
    setHasUserPermanentConfirmed(checkState)
    if (checkState) {
      setHasUserTemporaryConfirmed(true)
    }
  }
  // box state
  const [isPanelShown, setIsPanelShown] = useState(
    () => !hasUserPermanentConfirmed && !hasUserTemporaryConfirmed && Boolean(currentJsonInfo)
  )

  useEffect(() => {
    if (!coin1 || !coin2) {
      setIsPanelShown(false)
    } else {
      const noPermanent = !checkPermanent()
      setIsPanelShown(noPermanent)
    }
  }, [coin1, coin2, currentJsonInfo])

  const closePanel = () => setIsPanelShown(false)

  return {
    closePanel,
    toggleTemporarilyConfirm,
    togglePermanentlyConfirm,
    applyPermanentConfirm,
    hasUserPermanentConfirmed,
    hasUserTemporaryConfirmed,
    needConfirmPanel: isPanelShown
  }
}

function ConfirmRiskPanel({
  className,
  temporarilyConfirm,
  permanentlyConfirm,
  onTemporarilyConfirm,
  onPermanentlyConfirm
}: {
  className?: string
  temporarilyConfirm?: boolean
  permanentlyConfirm?: boolean
  onTemporarilyConfirm?: (checkState: boolean) => void
  onPermanentlyConfirm?: (checkState: boolean) => void
}) {
  return (
    <div className={twMerge('bg-[#141041] rounded-xl py-3 px-6 mobile:px-4', className)}>
      <div className="text-sm">
        I have read{' '}
        <Link href="https://raydium.gitbook.io/raydium/exchange-trade-and-swap/liquidity-pools">
          Raydium's Liquidity Guide
        </Link>{' '}
        and understand the risks involved with providing liquidity and impermanent loss.
      </div>

      <Checkbox
        checkBoxSize="sm"
        className="my-2 w-max"
        checked={temporarilyConfirm}
        onChange={onTemporarilyConfirm}
        label={<div className="text-sm italic text-[rgba(171,196,255,0.5)]">Confirm</div>}
      />

      <Checkbox
        checkBoxSize="sm"
        className="my-2 w-max"
        checked={permanentlyConfirm}
        onChange={onPermanentlyConfirm}
        label={<div className="text-sm italic text-[rgba(171,196,255,0.5)]">Do not warn again for this pool</div>}
      />
    </div>
  )
}

function LiquidityCard() {
  const { connected, owner } = useWallet()
  const [isCoinSelectorOn, { on: turnOnCoinSelector, off: turnOffCoinSelector }] = useToggle()
  // it is for coin selector panel
  const [targetCoinNo, setTargetCoinNo] = useState<'1' | '2'>('1')

  const checkWalletHasEnoughBalance = useWallet((s) => s.checkWalletHasEnoughBalance)

  const {
    coin1,
    coin1Amount,
    unslippagedCoin1Amount,
    coin2,
    coin2Amount,
    isCalculatingBczSelection,
    unslippagedCoin2Amount,
    focusSide,
    currentJsonInfo,
    jsonInfos,
    currentHydratedInfo,
    isSearchAmmDialogOpen,
    refreshLiquidity
  } = useLiquidity()

  const tokens = useToken((s) => s.tokens)
  const tokensLoaded = Object.keys(tokens).length > 2 // loading tokens ...

  const poolsJson = useLiquidity((s) => s.jsonInfos)
  const poolsLoaded = poolsJson.length > 0 // loading pools ...

  const refreshTokenPrice = useToken((s) => s.refreshTokenPrice)

  const { coinInputBox1ComponentRef, coinInputBox2ComponentRef, liquidityButtonComponentRef } =
    useLiquidityContextStore()
  const hasLoadLiquidityPools = useMemo(() => jsonInfos.length > 0, [jsonInfos])
  const hasFoundLiquidityPool = useMemo(() => Boolean(currentJsonInfo), [currentJsonInfo])
  const hasHydratedLiquidityPool = useMemo(() => Boolean(currentHydratedInfo), [currentHydratedInfo])

  // TODO: card actually don't need `toggleTemporarilyConfirm()` and `togglePermanentlyConfirm()`, so use React.Context may be better
  const {
    closePanel,
    needConfirmPanel,
    hasUserTemporaryConfirmed,
    hasUserPermanentConfirmed,
    applyPermanentConfirm,
    toggleTemporarilyConfirm,
    togglePermanentlyConfirm
  } = useLiquidityWarning()
  const haveEnoughCoin1 =
    coin1 &&
    checkWalletHasEnoughBalance(
      toTokenAmount(coin1, focusSide === 'coin1' ? coin1Amount : unslippagedCoin1Amount, { alreadyDecimaled: true })
    )
  const haveEnoughCoin2 =
    coin2 &&
    checkWalletHasEnoughBalance(
      toTokenAmount(coin2, focusSide === 'coin2' ? coin2Amount : unslippagedCoin2Amount, { alreadyDecimaled: true })
    )

  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    useLiquidity.setState({
      scrollToInputBox: () => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [])

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)

  // remain-time
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const currentTime = Date.now() + (chainTimeOffset ?? 0)
  const poolIsOpen = currentHydratedInfo && isDateAfter(currentTime, currentHydratedInfo.startTime)
  function getDurationText(val: number) {
    const duration = parseDuration(val)
    return `Pool Opens in ${String(duration.days).padStart(2, '0')}D : ${String(duration.hours).padStart(
      2,
      '0'
    )}H : ${String(duration.minutes).padStart(2, '0')}M`
  }
  const remainTimeText =
    currentHydratedInfo && !poolIsOpen ? getDurationText(currentHydratedInfo?.startTime - currentTime) : undefined
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
          value={focusSide === 'coin1' ? coin1Amount : unslippagedCoin1Amount}
          haveHalfButton
          haveCoinIcon
          showTokenSelectIcon
          topLeftLabel=""
          onTryToTokenSelect={() => {
            turnOnCoinSelector()
            setTargetCoinNo('1')
          }}
          onUserInput={(amount) => {
            useLiquidity.setState({ coin1Amount: amount, focusSide: 'coin1' })
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
          <Row
            className={`absolute h-full items-center transition-all ${
              hasHydratedLiquidityPool ? 'left-4' : 'left-1/2 -translate-x-1/2'
            }`}
          >
            <Icon heroIconName="plus" className="p-1 text-[#39D0D8]" />
            <FadeIn>{hasHydratedLiquidityPool && <LiquidityCardPriceIndicator className="w-max" />}</FadeIn>
          </Row>
          <Row className="absolute right-0 items-center">
            <Icon
              size="sm"
              heroIconName="search"
              className={`p-2 frosted-glass frosted-glass-teal rounded-full mr-4 clickable text-[#39D0D8] select-none ${
                isApprovePanelShown ? 'not-clickable' : ''
              }`}
              onClick={() => {
                useLiquidity.setState({ isSearchAmmDialogOpen: true })
              }}
            />
            <div className={isApprovePanelShown ? 'not-clickable' : 'clickable'}>
              <RefreshCircle
                run={!isApprovePanelShown}
                refreshKey="liquidity/add"
                popPlacement="right-bottom"
                freshFunction={() => {
                  if (isApprovePanelShown) return
                  refreshLiquidity()
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
          value={isCalculatingBczSelection ? '0' : focusSide === 'coin2' ? coin2Amount : unslippagedCoin2Amount}
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
            useLiquidity.setState({ coin2Amount: amount, focusSide: 'coin2' })
          }}
          token={coin2}
        />
      </>
      {/* info panel */}
      <FadeIn>{hasFoundLiquidityPool && coin1 && coin2 && <LiquidityCardInfo className="mt-5" />}</FadeIn>

      {/* confirm panel */}
      {needConfirmPanel && connected && (
        <ConfirmRiskPanel
          className="mt-5"
          temporarilyConfirm={hasUserTemporaryConfirmed}
          permanentlyConfirm={hasUserPermanentConfirmed}
          onTemporarilyConfirm={toggleTemporarilyConfirm}
          onPermanentlyConfirm={togglePermanentlyConfirm}
        />
      )}
      {/* supply button */}
      <Button
        className="frosted-glass-teal w-full mt-5"
        componentRef={liquidityButtonComponentRef}
        isLoading={isApprovePanelShown}
        validators={[
          {
            should: tokensLoaded,
            fallbackProps: {
              children: 'Loading Tokens ...'
            }
          },
          {
            should: poolsLoaded,
            fallbackProps: {
              children: 'Loading Pools ...'
            }
          },
          {
            should: hasLoadLiquidityPools,
            fallbackProps: { children: 'Finding Pool ...' }
          },
          {
            should: coin1 && coin2,
            fallbackProps: { children: 'Select a token' }
          },
          {
            should: currentHydratedInfo ? poolIsOpen : true,
            fallbackProps: { children: remainTimeText ?? 'Calculating...' }
          },
          {
            should: hasFoundLiquidityPool,
            fallbackProps: { children: `Pool not found` }
          },
          {
            should: coin1Amount && isMeaningfulNumber(coin1Amount) && coin2Amount && isMeaningfulNumber(coin2Amount),
            fallbackProps: { children: 'Enter an amount' }
          },
          {
            should: connected,
            forceActive: true,
            fallbackProps: {
              onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
              children: 'Connect Wallet'
            }
          },
          {
            should: !needConfirmPanel || hasUserTemporaryConfirmed,
            fallbackProps: { children: `Confirm liquidity guide` }
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
          currentJsonInfo && applyPermanentConfirm(currentJsonInfo.id)
          txAddLiquidity().then(
            ({ allSuccess }) => allSuccess && needConfirmPanel && hasUserPermanentConfirmed && closePanel()
          )
        }}
      >
        Add Liquidity
      </Button>
      {/* alert user if sol is not much */}
      <RemainSOLAlert />
      {/** coin selector panel */}
      <TokenSelectorDialog
        open={isCoinSelectorOn}
        onClose={turnOffCoinSelector}
        onSelectToken={(token) => {
          if (targetCoinNo === '1') {
            if (!areSameToken(coin1, token)) {
              useLiquidity.setState({ coin1: token, isCalculatingBczSelection: true })
              // delete other
              if (!canTokenPairBeSelected(token, coin2)) {
                useLiquidity.setState({ coin2: undefined, coin2Amount: '', unslippagedCoin2Amount: '' })
              }
            }
          } else {
            if (!areSameToken(coin2, token)) {
              // delete other
              useLiquidity.setState({ coin2: token, isCalculatingBczSelection: true })
              if (!canTokenPairBeSelected(token, coin1)) {
                useLiquidity.setState({ coin1: undefined, coin1Amount: '', unslippagedCoin1Amount: '' })
              }
            }
          }
          turnOffCoinSelector()
        }}
      />
      <SearchAmmDialog
        open={isSearchAmmDialogOpen}
        onClose={() => {
          useLiquidity.setState({ isSearchAmmDialogOpen: false })
        }}
      />
    </CyberpunkStyleCard>
  )
}

function canTokenPairBeSelected(targetToken: SplToken | undefined, candidateToken: SplToken | undefined) {
  return !isMintEqual(targetToken?.mint, candidateToken?.mint)
}

function areSameToken(originToken: SplToken | undefined, newSelected: SplToken): boolean {
  return originToken?.mint === newSelected.mint
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

function LiquidityCardPriceIndicator({ className }: { className?: string }) {
  const [innerReversed, setInnerReversed] = useState(false)

  const currentHydratedInfo = useLiquidity((s) => s.currentHydratedInfo)
  const coin1 = useLiquidity((s) => s.coin1)
  const coin2 = useLiquidity((s) => s.coin2)
  const isMobile = useAppSettings((s) => s.isMobile)

  const pooledBaseTokenAmount = currentHydratedInfo?.baseToken
    ? toTokenAmount(currentHydratedInfo.baseToken, currentHydratedInfo.baseReserve)
    : undefined
  const pooledQuoteTokenAmount = currentHydratedInfo?.quoteToken
    ? toTokenAmount(currentHydratedInfo.quoteToken, currentHydratedInfo.quoteReserve)
    : undefined

  const isCoin1Base = String(currentHydratedInfo?.baseMint) === String(coin1?.mint)
  const [poolCoin1TokenAmount, poolCoin2TokenAmount] = isCoin1Base
    ? [pooledBaseTokenAmount, pooledQuoteTokenAmount]
    : [pooledQuoteTokenAmount, pooledBaseTokenAmount]

  const price =
    isMeaningfulNumber(poolCoin1TokenAmount) && poolCoin2TokenAmount
      ? div(poolCoin2TokenAmount, poolCoin1TokenAmount)
      : undefined

  const innerPriceLeftCoin = innerReversed ? coin2 : coin1
  const innerPriceRightCoin = innerReversed ? coin1 : coin2

  const isStable = useMemo(() => Boolean(currentHydratedInfo?.version === 5), [currentHydratedInfo])

  if (!price || !coin1 || !coin2) return null
  if (isStable) {
    // UI for stable pair
    return (
      <Row className={twMerge('font-medium text-sm mobile:text-xs text-[#ABC4FF]', className)}>
        <div className="flex justify-start align-middle">
          <div className="flex justify-start m-auto text-2xl mobile:text-lg align-middle pb-1">{'{'}&nbsp;</div>
          <div className="min-w-[108px] mobile:min-w-[60px]">
            <Row className="flex w-full justify-between">
              <span>{1}</span>
              <span>&nbsp;{innerPriceLeftCoin?.symbol ?? '--'}</span>
            </Row>
            <Row className="flex w-full justify-between">
              <span>
                {toString(innerReversed ? div(1, price) : price, {
                  decimalLength: isMobile ? 'auto 2' : 'auto 5',
                  zeroDecimalNotAuto: true
                })}
              </span>
              <span>&nbsp;{innerPriceRightCoin?.symbol ?? '--'}</span>
            </Row>
          </div>
        </div>
        <div className="ml-2 rotate-90 m-auto">
          <div className="clickable" onClick={() => setInnerReversed((b) => !b)}>
            ⇋
          </div>
        </div>
      </Row>
    )
  } else {
    // UI for non-stable pair
    return (
      <Row className={twMerge('font-medium text-sm text-[#ABC4FF]', className)}>
        {1} {innerPriceLeftCoin?.symbol ?? '--'} ≈{' '}
        {toString(innerReversed ? div(1, price) : price, {
          decimalLength: isMobile ? 'auto 2' : 'auto',
          zeroDecimalNotAuto: true
        })}{' '}
        {innerPriceRightCoin?.symbol ?? '--'}
        <div className="ml-2 clickable" onClick={() => setInnerReversed((b) => !b)}>
          ⇋
        </div>
      </Row>
    )
  }
}

function LiquidityCardInfo({ className }: { className?: string }) {
  const currentHydratedInfo = useLiquidity((s) => s.currentHydratedInfo)
  const coin1 = useLiquidity((s) => s.coin1)
  const coin2 = useLiquidity((s) => s.coin2)
  const focusSide = useLiquidity((s) => s.focusSide)
  const coin1Amount = useLiquidity((s) => s.coin1Amount)
  const coin2Amount = useLiquidity((s) => s.coin2Amount)
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)
  const slippageToleranceState = useAppSettings((s) => s.slippageToleranceState)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const currentTime = Date.now() + (chainTimeOffset ?? 0)

  const isCoin1Base = String(currentHydratedInfo?.baseMint) === String(coin1?.mint)

  const coinBase = isCoin1Base ? coin1 : coin2
  const coinQuote = isCoin1Base ? coin2 : coin1

  const pooledBaseTokenAmount = currentHydratedInfo?.baseToken
    ? toTokenAmount(currentHydratedInfo.baseToken, currentHydratedInfo.baseReserve)
    : undefined
  const pooledQuoteTokenAmount = currentHydratedInfo?.quoteToken
    ? toTokenAmount(currentHydratedInfo.quoteToken, currentHydratedInfo.quoteReserve)
    : undefined

  const isStable = useMemo(() => Boolean(currentHydratedInfo?.version === 5), [currentHydratedInfo])

  const poolIsOpen = currentHydratedInfo && isDateAfter(currentTime, currentHydratedInfo.startTime)
  return (
    <Col
      className={twMerge(
        'py-4 px-6 flex-grow ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-xl items-center',
        className
      )}
    >
      <Col className="w-full">
        <LiquidityCardItem
          fieldName={`Base`}
          fieldValue={focusSide === 'coin1' ? coin1?.symbol ?? 'unknown' : coin2?.symbol ?? 'unknown'}
        />
        <FadeIn>
          {(coin1Amount || coin2Amount) && (
            <LiquidityCardItem
              fieldName="Max Amount"
              fieldValue={`${formatNumber(focusSide === 'coin1' ? coin2Amount || '' : coin1Amount ?? '', {
                fractionLength: 'auto'
              })} ${focusSide === 'coin1' ? coin2?.symbol ?? 'unknown' : coin1?.symbol ?? 'unknown'}`}
            />
          )}
        </FadeIn>
        <LiquidityCardItem
          fieldName={`Pool liquidity (${coinBase?.symbol ?? 'unknown'})`}
          fieldValue={
            <div>
              {pooledBaseTokenAmount
                ? `${formatNumber(pooledBaseTokenAmount.toExact())} ${coinBase?.symbol ?? 'unknown'}`
                : '--'}
            </div>
          }
        />
        <LiquidityCardItem
          fieldName={`Pool liquidity (${coinQuote?.symbol ?? 'unknown'})`}
          fieldValue={
            <div>
              {pooledQuoteTokenAmount
                ? `${formatNumber(pooledQuoteTokenAmount.toExact())} ${coinQuote?.symbol ?? 'unknown'}`
                : '--'}
            </div>
          }
        />
        <LiquidityCardItem
          fieldName="LP supply"
          fieldValue={
            <Row className="items-center gap-2">
              {isStable && <Badge className="self-center">Stable</Badge>}
              {/* {isOpenBook && <OpenBookTip></OpenBookTip>} */}
              <div>
                {currentHydratedInfo?.lpToken
                  ? `${formatNumber(
                      toString(toTokenAmount(currentHydratedInfo.lpToken, currentHydratedInfo.lpSupply))
                    )} LP`
                  : '--'}
              </div>
            </Row>
          }
        />
        <FadeIn>
          {currentHydratedInfo && !poolIsOpen ? (
            <LiquidityCardItem fieldName="Open at" fieldValue={<div>{toUTC(currentHydratedInfo.startTime)}</div>} />
          ) : undefined}
        </FadeIn>
        <Collapse openDirection="upwards" className="w-full">
          <Collapse.Body>
            <Col>
              <LiquidityCardItem fieldName="Addresses" tooltipContent={<LiquidityCardTooltipPanelAddress />} />
              <LiquidityCardItem
                fieldName="Slippage Tolerance"
                fieldValue={
                  <Row className="py-1 px-2 bg-[#141041] rounded-sm text-[#F1F1F2] font-medium text-xs -my-1">
                    <Input
                      className="w-6"
                      value={toString(mul(slippageTolerance, 100), { decimalLength: 'auto 2' })}
                      onUserInput={(value) => {
                        const n = div(parseFloat(value), 100)
                        if (n) {
                          useAppSettings.setState({ slippageTolerance: n })
                        }
                      }}
                    />
                    <div className="opacity-50 ml-1">%</div>
                  </Row>
                }
              />
              {slippageToleranceState === 'too small' && (
                <div className={`text-[#D8CB39] text-xs mobile:text-sm`}>Your transaction may fail</div>
              )}
              {slippageToleranceState === 'too large' && (
                <div className={`text-[#D8CB39] text-xs mobile:text-sm`}>
                  Your transaction may be frontrun and rusult in an unfavourable trade
                </div>
              )}
            </Col>
          </Collapse.Body>
          <Collapse.Face>
            {({ isOpen }) => (
              <Row className="w-full items-center text-xs font-medium text-[rgba(171,196,255,0.5)] cursor-pointer select-none">
                <div className="py-1.5">{isOpen ? 'Show less' : 'More information'}</div>
                <Icon size="xs" heroIconName={isOpen ? 'chevron-up' : 'chevron-down'} className="ml-1" />
              </Row>
            )}
          </Collapse.Face>
        </Collapse>
      </Col>
    </Col>
  )
}
function LiquidityCardItem({
  className,
  fieldName,
  fieldValue,
  tooltipContent,
  debugForceOpen
}: {
  className?: string
  fieldName?: string
  fieldValue?: ReactNode
  tooltipContent?: ReactNode
  /** !! only use it in debug */
  debugForceOpen?: boolean
}) {
  return (
    <Row className={twMerge('w-full justify-between my-1.5', className)}>
      <Row className="items-center text-xs font-medium text-[#ABC4FF]">
        <div className="mr-1">{fieldName}</div>
        {tooltipContent && (
          <Tooltip className={className} placement="bottom-right" forceOpen={debugForceOpen}>
            <Icon size="xs" heroIconName="question-mark-circle" className="cursor-help" />
            <Tooltip.Panel>{tooltipContent}</Tooltip.Panel>
          </Tooltip>
        )}
      </Row>
      <div className="text-xs font-medium text-white text-right">{fieldValue}</div>
    </Row>
  )
}

function LiquidityCardTooltipPanelAddress() {
  const coin1 = useLiquidity((s) => s.coin1)
  const coin2 = useLiquidity((s) => s.coin2)
  const { lpMint, id, marketId } = useLiquidity((s) => s.currentJsonInfo) ?? {}
  return (
    <div className="w-60">
      <div className="text-sm font-semibold mb-2">Addresses</div>
      <Col className="gap-2">
        {coin1 && (
          <LiquidityCardTooltipPanelAddressItem
            label={coin1.symbol ?? '--'}
            type="token"
            address={String(coin1.mint ?? '--')}
          />
        )}
        {coin2 && (
          <LiquidityCardTooltipPanelAddressItem
            label={coin2.symbol ?? '--'}
            type="token"
            address={String(coin2.mint ?? '--')}
          />
        )}
        {Boolean(lpMint) && <LiquidityCardTooltipPanelAddressItem label="LP" type="token" address={lpMint!} />}
        {Boolean(id) && <LiquidityCardTooltipPanelAddressItem label="Amm ID" address={id!} />}
        {Boolean(marketId) && <LiquidityCardTooltipPanelAddressItem label="Market ID" address={marketId!} />}
      </Col>
    </div>
  )
}

function LiquidityCardTooltipPanelAddressItem({
  className,
  label,
  address,
  type = 'account'
}: {
  className?: string
  label: string
  address: string
  type?: 'token' | 'account'
}) {
  return (
    <Row className={twMerge('grid gap-2 items-center grid-cols-[5em,1fr,auto,auto]', className)}>
      <div className="text-xs font-normal text-white">{label}</div>
      <AddressItem
        showDigitCount={5}
        addressType={type}
        canCopy
        canExternalLink
        textClassName="flex text-xs font-normal text-white bg-[#141041] rounded justify-center"
      >
        {address}
      </AddressItem>
    </Row>
  )
}

function UserLiquidityExhibition() {
  const hydratedInfos = useLiquidity((s) => s.hydratedInfos)
  const userExhibitionLiquidityIds = useLiquidity((s) => s.userExhibitionLiquidityIds)
  const isRemoveDialogOpen = useLiquidity((s) => s.isRemoveDialogOpen)
  const scrollToInputBox = useLiquidity((s) => s.scrollToInputBox)
  const farmPoolsList = useFarms((s) => s.hydratedInfos)
  const getToken = useToken((s) => s.getToken)
  const balances = useWallet((s) => s.balances)
  const rawBalances = useWallet((s) => s.rawBalances)
  const isMobile = useAppSettings((s) => s.isMobile)
  const migrationJsonInfo = useCLMMMigration((s) => s.jsonInfos)

  const computeSharePercentValue = (percent: Percent | undefined) => {
    if (!percent) return '--%'
    if (percent.numerator.mul(new BN(10000)).div(percent.denominator).lt(new BN(1))) return '<0.01%'
    return percent.mul(new BN(100)).toFixed(2) + '%'
  }

  const exhibitionInfos = useMemo(
    () => hydratedInfos.filter(({ id }) => userExhibitionLiquidityIds?.includes(toPubString(id))),
    [hydratedInfos, userExhibitionLiquidityIds]
  )

  const isMigrateToClmmDialogOpen = useConcentrated((s) => s.isMigrateToClmmDialogOpen)
  // just for clmm migrate dialog prop, the dialog prop style is not the same as lp unstake dialog, so unstake dialog's design is wrong. But can't change this component now.
  const currentHydratedInfo = useLiquidity((s) => s.currentHydratedInfo)

  return (
    <div className="mt-12 max-w-[456px] self-center">
      <div className="mb-6 text-xl font-medium text-white">Your Liquidity</div>
      <Card className="p-6 mt-6 mobile:py-5 mobile:px-3 bg-cyberpunk-card-bg" size="lg">
        <List className={`flex flex-col gap-6 mobile:gap-5 ${exhibitionInfos.length ? 'mb-5' : ''}`}>
          {exhibitionInfos.map((info, idx) => {
            const canMigrate = migrationJsonInfo?.some((m) => m.ammId === toPubString(info.id))
            return (
              <List.Item key={idx}>
                <FadeIn>
                  <Collapse className="ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-3xl mobile:rounded-xl">
                    <Collapse.Face>
                      {({ isOpen }) => (
                        <Row className="items-center justify-between py-4 px-6 mobile:px-4">
                          <Row className="gap-2 items-center">
                            <CoinAvatarPair
                              className="justify-self-center"
                              token1={info.baseToken}
                              token2={info.quoteToken}
                              size={isMobile ? 'sm' : 'md'}
                            />
                            <div className="text-base font-normal text-[#abc4ff]">
                              {info.baseToken?.symbol ?? ''}/{info.quoteToken?.symbol ?? ''}
                            </div>
                          </Row>
                          <Icon
                            size="sm"
                            className="text-[#abc4ff]"
                            heroIconName={`${isOpen ? 'chevron-up' : 'chevron-down'}`}
                          />
                        </Row>
                      )}
                    </Collapse.Face>
                    <Collapse.Body>
                      <div className="pb-4 px-6 mobile:px-4">
                        <Col className="border-t-1.5 border-[rgba(171,196,255,.5)] py-5 gap-3 ">
                          <Row className="justify-between">
                            <div className="text-xs mobile:text-2xs font-medium text-[#abc4ff]">Pooled (Base)</div>
                            <div
                              className="text-xs mobile:text-2xs font-medium text-white"
                              title={toPubString(info.baseToken?.mint)}
                            >
                              {toString(info.userBasePooled) || '--'} {info.baseToken?.symbol}
                            </div>
                          </Row>
                          <Row className="justify-between">
                            <div className="text-xs mobile:text-2xs font-medium text-[#abc4ff]">Pooled (Quote)</div>
                            <div className="text-xs mobile:text-2xs font-medium text-white">
                              {toString(info.userQuotePooled) || '--'} {info.quoteToken?.symbol}
                            </div>
                          </Row>
                          <Row className="justify-between">
                            <div className="text-xs mobile:text-2xs font-medium text-[#abc4ff]">Your Liquidity</div>
                            <div className="text-xs mobile:text-2xs font-medium text-white">
                              {info.lpMint
                                ? toString(div(rawBalances[String(info.lpMint)], 10 ** info.lpDecimals), {
                                    decimalLength: `auto ${info.lpDecimals}`
                                  })
                                : '--'}{' '}
                              LP
                            </div>
                          </Row>
                          <Row className="justify-between">
                            <div className="text-xs mobile:text-2xs font-medium text-[#abc4ff]">Your share</div>
                            <div className="text-xs mobile:text-2xs font-medium text-white">
                              {computeSharePercentValue(info.sharePercent)}
                            </div>
                          </Row>
                        </Col>
                        <Row className="gap-4 mb-1">
                          <Button
                            className="text-base mobile:text-sm font-medium frosted-glass frosted-glass-teal rounded-xl flex-grow"
                            onClick={() => {
                              useLiquidity.setState({
                                currentJsonInfo: info.jsonInfo
                              })
                              scrollToInputBox()
                            }}
                          >
                            {canMigrate ? 'Add' : 'Add Liquidity'}
                          </Button>
                          {canMigrate && (
                            <Button
                              className="text-base mobile:text-sm font-medium frosted-glass frosted-glass-teal rounded-xl flex-grow"
                              onClick={() => {
                                useLiquidity.setState({
                                  currentJsonInfo: info.jsonInfo
                                })
                                useConcentrated.setState({
                                  isMigrateToClmmDialogOpen: true
                                })
                              }}
                            >
                              Migrate
                            </Button>
                          )}
                          <Tooltip>
                            <Icon
                              size="smi"
                              iconSrc="/icons/pools-pool-entry.svg"
                              className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable-filter-effect clickable`}
                              onClick={() => {
                                routeTo('/pools', {
                                  queryProps: objectShakeFalsy({
                                    expandedPoolId: toPubString(info.id),
                                    searchText: toPubString(info.id)
                                  })
                                })
                              }}
                            />
                            <Tooltip.Panel>Pool</Tooltip.Panel>
                          </Tooltip>
                          <Tooltip>
                            <Icon
                              iconSrc="/icons/msic-swap-h.svg"
                              size="smi"
                              className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                              onClick={() => {
                                routeTo('/swap', {
                                  queryProps: {
                                    coin1: info.baseToken,
                                    coin2: info.quoteToken
                                  }
                                })
                              }}
                            />
                            <Tooltip.Panel>Swap</Tooltip.Panel>
                          </Tooltip>
                          <Tooltip>
                            <Icon
                              size="smi"
                              iconSrc="/icons/pools-remove-liquidity-entry.svg"
                              className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect`}
                              onClick={() => {
                                useLiquidity.setState({ currentJsonInfo: info.jsonInfo, isRemoveDialogOpen: true })
                              }}
                            />
                            <Tooltip.Panel>Remove Liquidity</Tooltip.Panel>
                          </Tooltip>
                        </Row>
                      </div>
                    </Collapse.Body>
                  </Collapse>
                </FadeIn>
              </List.Item>
            )
          })}
        </List>

        <RemoveLiquidityDialog
          open={isRemoveDialogOpen}
          onClose={() => {
            useLiquidity.setState({ isRemoveDialogOpen: false })
          }}
        />

        {currentHydratedInfo && (
          <ConcentratedMigrateDialog
            info={currentHydratedInfo}
            open={isMigrateToClmmDialogOpen}
            onClose={() => {
              useConcentrated.setState({ isMigrateToClmmDialogOpen: false })
            }}
          />
        )}

        <div className="text-xs mobile:text-2xs font-medium text-[rgba(171,196,255,0.5)]">
          If you staked your LP tokens in a farm, unstake them to see them here
        </div>
      </Card>
    </div>
  )
}

function CreatePoolCardEntry() {
  return (
    <div className="mt-12 max-w-[456px] self-center">
      <div className="mb-6 text-xl font-medium text-white">Create Pool</div>
      <Card className="p-6 mt-6 mobile:py-5 mobile:px-3 bg-cyberpunk-card-bg" size="lg">
        <Row className="gap-4">
          <div className="text-xs mobile:text-2xs font-medium text-[rgba(171,196,255,0.5)]">
            Create a liquidity pool on Raydium that can be traded on the swap interface.{' '}
            <Link
              noTextStyle
              className="text-[rgba(171,196,255)] hover:underline"
              href="https://raydium.gitbook.io/raydium/permissionless/creating-a-pool"
            >
              Read the guide
            </Link>{' '}
            before attempting.
          </div>

          <Button
            className="flex items-center frosted-glass-teal opacity-80"
            onClick={() => {
              routeTo('/liquidity/create')
            }}
          >
            <Icon className="mr-2" heroIconName="plus" />
            <div>Create Pool</div>
          </Button>
        </Row>
      </Card>
    </div>
  )
}
