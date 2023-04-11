import { useEffect, useMemo, useRef, useState } from 'react'

import BN from 'bn.js'

import { getExactPriceAndTick } from '@/application/clmmMigration/getExactPriceAndTick'
import { getResultAmountByTick } from '@/application/clmmMigration/getResultAmountByTick'
import txMigrateToClmm from '@/application/clmmMigration/txMigrateToClmm'
import { CLMMMigrationJSON, useCLMMMigration } from '@/application/clmmMigration/useCLMMMigration'
import useAppSettings from '@/application/common/useAppSettings'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import useConcentrated, { TimeBasis } from '@/application/concentrated/useConcentrated'
import { isFarmInfo, isHydratedFarmInfo } from '@/application/farms/judgeFarmInfo'
import { HydratedFarmInfo } from '@/application/farms/type'
import { smashSYNLiquidity } from '@/application/liquidity/smashSYNLiquidity'
import { HydratedLiquidityInfo } from '@/application/liquidity/type'
import useToken from '@/application/token/useToken'
import { decimalToFraction } from '@/application/txTools/decimal2Fraction'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import DecimalInput from '@/components/DecimalInput'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Link from '@/components/Link'
import RectTabs from '@/components/RectTabs'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import { shakeFalsyItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt, gte, lte } from '@/functions/numberish/compare'
import { add, div, minus, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import { useEvent } from '@/hooks/useEvent'
import { useSignalState } from '@/hooks/useSignalState'
import useToggle from '@/hooks/useToggle'
import { Numberish } from '@/types/constants'

export default function ConcentratedMigrateDialog({
  info,
  open,
  onClose
}: {
  info: HydratedLiquidityInfo | HydratedFarmInfo
  open: boolean
  onClose: () => void
}) {
  const loadedHydratedClmmInfos = useCLMMMigration((s) => s.loadedHydratedClmmInfos)
  const migrationJsonInfos = useCLMMMigration((s) => s.jsonInfos)
  const targetMigrationJsonInfo = useMemo(
    () =>
      migrationJsonInfos.find((i) =>
        isFarmInfo(info) ? i.farmIds.includes(toPubString(info.id)) : i.ammId === toPubString(info.id)
      ),
    [migrationJsonInfos, info]
  )
  // if (migrationJsonInfos.length > 0 && info) {
  //   assert(targetMigrationJsonInfo, 'not found migration json')
  // }
  const targetClmmInfo = useMemo(() => {
    if (!targetMigrationJsonInfo) return
    const allClmmInfos = [...loadedHydratedClmmInfos.values()]
    return allClmmInfos.find((i) => toPubString(i.id) === targetMigrationJsonInfo?.clmmId)
  }, [targetMigrationJsonInfo, loadedHydratedClmmInfos])
  // if (targetClmmInfo) {
  //   assert(targetMigrationJsonInfo, 'not found migration json')
  // }

  // const [canShowMigrateDetail, { on, off, delayOff }] = useToggle()
  const canShowMigrateDetail = true // 💬 force
  const isFarm = isFarmInfo(info) && isHydratedFarmInfo(info)
  const targetHydratedLiquidityInfo = useAsyncMemo(() => {
    if (!isFarm) return info
    if (!targetMigrationJsonInfo) return
    const id = toPubString(targetMigrationJsonInfo.ammId)
    const { hydrated } = smashSYNLiquidity([id])
    return hydrated.then((hydrateds) => hydrateds?.[id])
  }, [isFarm, info, targetMigrationJsonInfo])

  useEffect(() => {
    useCLMMMigration.setState({
      shouldLoadedClmmIds: new Set(migrationJsonInfos.map((i) => i.clmmId))
    })
  }, [migrationJsonInfos])

  const alertTitle = 'Migrate Position'
  const alertDescription =
    'We are no longer providing rewards to this pair any more. Would you like to migrate your position to CLMM pool?'
  const alertLinkText = 'What is CLMM pool?'

  const step1 = (closeDialog: () => void) => (
    <Col className="items-center">
      <Icon size="lg" heroIconName="information-circle" className={`text-[#abc4ff] mb-3`} />

      <div className="mb-6 text-center">
        <div className="font-semibold text-xl text-white mb-3">{alertTitle}</div>
        <div className="font-normal text-base text-[#ABC4FF]">{alertDescription}</div>
        <Link href="https://docs.raydium.io/raydium/concentrated-liquidity/what-is-concentrated-liquidity">
          {alertLinkText}
        </Link>
      </div>

      <div className="self-stretch">
        <Col>
          <Button className="text-[#ABC4FF] frosted-glass-teal">Migrate</Button>
          <Button className="text-[#ABC4FF] text-sm -mb-4" type="text" onClick={closeDialog}>
            Not now
          </Button>
        </Col>
      </div>
    </Col>
  )

  const step2 = (closeDialog: () => void) => (
    <div>
      <div className="relative mb-5">
        <div className="text-white text-lg font-medium mb-3">Migrate to Concentrated Liquidity pool</div>
        <div className="text-[#abc4ff] text-sm">
          Migrate below or learn more about CLMM pools and risks{' '}
          <Link
            className="inline-block font-bold"
            href="https://docs.raydium.io/raydium/liquidity-providers/providing-concentrated-liquidity-clmm"
          >
            here
          </Link>
          .
        </div>
        <Icon
          heroIconName="x"
          size="lg"
          className="absolute top-0 right-0 text-[#abc4ff] text-sm cursor-pointer"
          onClick={closeDialog}
        />
      </div>
      <DetailPanel
        clmmInfo={targetClmmInfo}
        migrationJsonInfo={targetMigrationJsonInfo}
        farmInfo={isFarm ? info : undefined}
        liquidityInfo={targetHydratedLiquidityInfo}
        onMigrateSuccess={closeDialog}
      />
    </div>
  )

  return (
    <ResponsiveDialogDrawer
      placement="from-bottom"
      open={open}
      onClose={() => {
        // delayOff()
        onClose()
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className={`p-6 mobile:p-4 rounded-3xl mobile:rounded-lg ${
            canShowMigrateDetail ? 'w-[min(600px,90vw)]' : 'w-[min(450px,90vw)]'
          } mobile:w-full max-h-[80vh] overflow-auto border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card transition`}
          size="lg"
        >
          {canShowMigrateDetail ? step2(closeDialog) : step1(closeDialog)}
        </Card>
      )}
    </ResponsiveDialogDrawer>
  )
}

function DetailPanel({
  liquidityInfo,
  farmInfo,
  migrationJsonInfo,
  clmmInfo,
  onMigrateSuccess
}: {
  liquidityInfo?: HydratedLiquidityInfo
  farmInfo?: HydratedFarmInfo
  migrationJsonInfo?: CLMMMigrationJSON
  clmmInfo?: HydratedConcentratedInfo
  onMigrateSuccess?: () => void
}) {
  const pureRawBalances = useWallet((s) => s.pureRawBalances)
  const slippage = useAppSettings((s) => s.slippageTolerance)
  const slippageNumber = Number(toString(slippage))
  const [isTxProcessing, { on: turnOnTxProcessing, off: turnOffTxProcessing }] = useToggle()

  const [mode, setMode] = useState<'quick' | 'custom'>('quick')
  const [priceRangeMode, setPriceRangeMode] = useState<'base' | 'quote'>('base')

  const fee = useMemo(() => {
    const tradeFeeRate =
      clmmInfo &&
      toPercent(div(clmmInfo.ammConfig.tradeFeeRate, 10 ** 4), {
        alreadyDecimaled: true
      })
    return toPercentString(tradeFeeRate, { fixed: 4, alreadyPercented: true })
  }, [clmmInfo])

  const lp = liquidityInfo?.lpToken
  const stakedLpAmount = farmInfo
    ? farmInfo.userStakedLpAmount
    : liquidityInfo && lp && toTokenAmount(lp, pureRawBalances[toPubString(liquidityInfo.lpMint)])
  const timeBasis = useConcentrated((s) => s.timeBasis)

  const isBaseQuoteReversed = useMemo(
    () =>
      isMintEqual(liquidityInfo?.baseMint, clmmInfo?.quote?.mint) &&
      isMintEqual(liquidityInfo?.quoteMint, clmmInfo?.base?.mint),
    [clmmInfo, liquidityInfo]
  ) //! it may base-quote in lp/liquidity, but quote-base in clmm
  const base = useMemo(
    () => (isBaseQuoteReversed ? liquidityInfo?.quoteToken : liquidityInfo?.baseToken),
    [liquidityInfo, isBaseQuoteReversed]
  )
  const quote = useMemo(
    () => (isBaseQuoteReversed ? liquidityInfo?.baseToken : liquidityInfo?.quoteToken),
    [liquidityInfo, isBaseQuoteReversed]
  )
  const baseRatio =
    liquidityInfo &&
    lp &&
    base &&
    div(
      toTokenAmount(base, isBaseQuoteReversed ? liquidityInfo.quoteReserve : liquidityInfo.baseReserve),
      toTokenAmount(lp, liquidityInfo.lpSupply)
    )
  const quoteRatio =
    liquidityInfo &&
    lp &&
    quote &&
    div(
      toTokenAmount(quote, isBaseQuoteReversed ? liquidityInfo.baseReserve : liquidityInfo.quoteReserve),
      toTokenAmount(lp, liquidityInfo.lpSupply)
    )
  const stakedBaseAmount =
    stakedLpAmount && baseRatio
      ? toTokenAmount(base, mul(stakedLpAmount, baseRatio), { alreadyDecimaled: true })
      : undefined
  const stakedQuoteAmount =
    stakedLpAmount && quoteRatio
      ? toTokenAmount(quote, mul(stakedLpAmount, quoteRatio), { alreadyDecimaled: true })
      : undefined
  const price = clmmInfo?.currentPrice // always quote/base
  const priceRangeAutoMin =
    priceRangeMode === 'base' && migrationJsonInfo
      ? migrationJsonInfo.defaultPriceMin
      : 1 / migrationJsonInfo!.defaultPriceMax
  const priceRangeAutoMax =
    priceRangeMode === 'base' && migrationJsonInfo
      ? migrationJsonInfo.defaultPriceMax
      : 1 / migrationJsonInfo!.defaultPriceMin

  // min price range
  const [userInputPriceRangeMin, setUserInputPriceRangeMin, userInputPriceRangeMinSignal] = useSignalState<
    Numberish | undefined
  >(mul(price, 0.85))
  useEffect(() => {
    setUserInputPriceRangeMin(mul(price, 0.85))
  }, [price])
  const [isInputPriceRangeMinFoused, setIsInputPriceRangeMinFoused] = useState<boolean>(false)
  const calculatedPriceRangeMin = useRef<Numberish>()
  const calculatedPriceRangeMinTick = useRef<number>()

  // max price range
  const [userInputPriceRangeMax, setUserInputPriceRangeMax, userInputPriceRangeMaxSignal] = useSignalState<
    Numberish | undefined
  >(mul(price, 1.15))
  useEffect(() => {
    setUserInputPriceRangeMax(mul(price, 1.15))
  }, [price])
  const [isInputPriceRangeMaxFoused, setIsInputPriceRangeMaxFoused] = useState<boolean>(false)
  const calculatedPriceRangeMax = useRef<Numberish>()
  const calculatedPriceRangeMaxTick = useRef<number>()

  // result amount panels
  const resultAmountBaseCurrentPosition = stakedBaseAmount
  const resultAmountQuoteCurrentPosition = stakedQuoteAmount
  const [resultAmountBaseCLMMPool, setResultAmountBaseCLMMPool] = useState<Numberish>()
  const [resultAmountQuoteCLMMPool, setResultAmountQuoteCLMMPool] = useState<Numberish>()
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const resultAmountBaseWallet = useMemo(
    () =>
      resultAmountBaseCurrentPosition &&
      toTokenAmount(
        resultAmountBaseCurrentPosition.token,
        minus(resultAmountBaseCurrentPosition, resultAmountBaseCLMMPool),
        { alreadyDecimaled: true }
      ),
    [resultAmountBaseCurrentPosition, resultAmountBaseCLMMPool]
  )
  const resultAmountQuoteWallet = useMemo(
    () =>
      resultAmountQuoteCurrentPosition &&
      toTokenAmount(
        resultAmountQuoteCurrentPosition.token,
        minus(resultAmountQuoteCurrentPosition, resultAmountQuoteCLMMPool),
        { alreadyDecimaled: true }
      ),
    [resultAmountQuoteCurrentPosition, resultAmountQuoteCLMMPool]
  )
  /** will not been reflect by ui */
  const otherInfoForTx = useRef<{
    liquidity: BN
    amountSlippageBase: BN
    amountSlippageQuote: BN
  }>()

  const modedPriceRangeMin = () => (mode === 'quick' ? priceRangeAutoMin : userInputPriceRangeMinSignal())
  const modedPriceRangeMax = () => (mode === 'quick' ? priceRangeAutoMax : userInputPriceRangeMaxSignal())

  const switchPriceRangeMode = useEvent(() => {
    setPriceRangeMode(priceRangeMode === 'base' ? 'quote' : 'base')
    setUserInputPriceRangeMin(
      userInputPriceRangeMax && gt(userInputPriceRangeMax, 0) ? div(1, userInputPriceRangeMax) : userInputPriceRangeMax
    )
    setUserInputPriceRangeMax(
      userInputPriceRangeMin && gt(userInputPriceRangeMin, 0) ? div(1, userInputPriceRangeMin) : userInputPriceRangeMin
    )
  })
  const isPriceRangeInRange = useMemo(
    () =>
      price &&
      userInputPriceRangeMin &&
      userInputPriceRangeMax &&
      checkIsInRange(priceRangeMode === 'base' ? price : div(1, price), userInputPriceRangeMin, userInputPriceRangeMax),
    [price, priceRangeMode, userInputPriceRangeMin, userInputPriceRangeMax]
  )
  const isPriceRangeValid = useMemo(
    () =>
      gt(userInputPriceRangeMin, 0) &&
      gt(userInputPriceRangeMax, 0) &&
      gt(userInputPriceRangeMax, userInputPriceRangeMin),
    [userInputPriceRangeMin, userInputPriceRangeMax]
  )

  useEffect(() => {
    if (!clmmInfo || !price) return

    // calc min
    if (!isInputPriceRangeMinFoused && gt(modedPriceRangeMin(), 0)) {
      const { price: exactPrice, tick: exactTick } = getExactPriceAndTick({
        baseSide: priceRangeMode,
        price: modedPriceRangeMin()!,
        info: clmmInfo.state
      })
      calculatedPriceRangeMin.current = exactPrice
      calculatedPriceRangeMinTick.current = exactTick
      if (mode === 'custom') {
        setUserInputPriceRangeMin(exactPrice)
      }
    }

    // calc max
    if (!isInputPriceRangeMaxFoused && gt(modedPriceRangeMax(), 0)) {
      const { price: exactPrice, tick: exactTick } = getExactPriceAndTick({
        baseSide: priceRangeMode,
        price: modedPriceRangeMax()!,
        info: clmmInfo.state
      })
      calculatedPriceRangeMax.current = exactPrice
      calculatedPriceRangeMaxTick.current = exactTick
      if (mode === 'custom') {
        setUserInputPriceRangeMax(exactPrice)
      }
    }

    // fix tick zero division bug, so min tick can't be the same as max tick
    if (
      calculatedPriceRangeMinTick.current &&
      calculatedPriceRangeMaxTick.current &&
      calculatedPriceRangeMaxTick.current === calculatedPriceRangeMinTick.current
    ) {
      calculatedPriceRangeMinTick.current -= 1
      calculatedPriceRangeMaxTick.current += 1
    }

    // calc result amount
    if (
      resultAmountBaseCurrentPosition &&
      resultAmountQuoteCurrentPosition &&
      calculatedPriceRangeMinTick.current != null &&
      calculatedPriceRangeMaxTick.current != null
    ) {
      const params = {
        info: clmmInfo.state,
        baseAmount: resultAmountBaseCurrentPosition,
        quoteAmount: resultAmountQuoteCurrentPosition,
        tickLower: calculatedPriceRangeMinTick.current,
        tickUpper: calculatedPriceRangeMaxTick.current,
        slippage: slippageNumber
      }
      const { resultBaseAmount, resultQuoteAmount, liquidity, amountSlippageBase, amountSlippageQuote } =
        getResultAmountByTick(params)
      otherInfoForTx.current = {
        liquidity,
        amountSlippageBase,
        amountSlippageQuote
      }
      setResultAmountBaseCLMMPool(resultBaseAmount)
      setResultAmountQuoteCLMMPool(resultQuoteAmount)
    }

    // get clmm amount
  }, [
    slippageNumber,
    isInputPriceRangeMinFoused,
    isInputPriceRangeMaxFoused,
    toString(resultAmountBaseCurrentPosition),
    toString(resultAmountQuoteCurrentPosition),
    clmmInfo,
    migrationJsonInfo,
    price,
    priceRangeMode,
    mode
  ])

  return (
    <Grid className="gap-4">
      {/* mode switcher */}
      <Grid className="grid-cols-2 gap-3">
        <ModeItem
          selected={mode === 'quick'}
          title="Quick migration"
          description="Very wide price range for a more passive strategy."
          onClick={() => {
            setMode('quick')
          }}
        />
        <ModeItem
          selected={mode === 'custom'}
          title="Custom migration"
          description="Set a custom price range for higher capital efficiency."
          onClick={() => {
            setMode('custom')
          }}
        />
      </Grid>

      {/* CLMM Pool */}
      <div>
        <div className="text-[#abc4ff] font-medium mb-2">CLMM Pool</div>
        <Row className="border-1.5 border-[#abc4ff40] rounded-xl py-2 px-4 justify-between">
          <Row className="gap-2">
            <div className="text-[#abc4ff] font-medium">
              {base?.symbol ?? '--'}/{quote?.symbol ?? '--'}
            </div>
            <div className="text-[#abc4ff] bg-[#abc4ff1f] text-xs rounded-full py-0.5 px-2 font-medium self-center">
              Fee {toPercentString(fee)}
            </div>
          </Row>
          <Row className="items-center gap-2">
            <div className="text-[#abc4ff80] text-sm font-medium">Current price: </div>
            <div className="text-[#abc4ff] text-base font-medium">
              {toString(priceRangeMode === 'base' ? price : div(1, price))}
            </div>
            <div className="text-[#abc4ff80] text-xs font-medium">
              {priceRangeMode === 'base'
                ? `${quote?.symbol ?? '--'} per ${base?.symbol ?? '--'}`
                : `${base?.symbol ?? '--'} per ${quote?.symbol ?? '--'}`}
            </div>
          </Row>
        </Row>
      </div>

      {/* price range */}
      <div>
        <Row className="items-center justify-between mb-1">
          <div className="text-[#abc4ff] font-medium">Price Range</div>
          <RectTabs
            tabs={[
              { label: `${base?.symbol ?? '--'} price`, value: 'base' },
              { label: `${quote?.symbol ?? '--'} price`, value: 'quote' }
            ]}
            selectedValue={priceRangeMode}
            onChange={() => {
              switchPriceRangeMode()
            }}
          ></RectTabs>
        </Row>
        {mode === 'quick' && (
          <Row className="border-1.5 border-[#abc4ff40] rounded-xl py-2 px-4 justify-between">
            <div className="text-[#abc4ff] font-medium text-sm">
              {priceRangeAutoMin ? priceRangeAutoMin : '--'} - {priceRangeAutoMax ? priceRangeAutoMax : '--'}
              {/* {priceRangeAutoMin ? Math.round(priceRangeAutoMin) : '--'} -{' '}
              {priceRangeAutoMax ? Math.round(priceRangeAutoMax) : '--'} */}
            </div>
            <Row className="items-center gap-2">
              <div className="text-[#abc4ff80] text-sm font-medium">
                {priceRangeMode === 'base'
                  ? `${quote?.symbol ?? '--'} per ${base?.symbol ?? '--'}`
                  : `${base?.symbol ?? '--'} per ${quote?.symbol ?? '--'}`}
              </div>
            </Row>
          </Row>
        )}
        {mode === 'custom' && (
          <div>
            <Grid className="grid-cols-2-fr gap-3">
              <Row
                className={`border-1.5 ${
                  isPriceRangeInRange && isPriceRangeValid ? 'border-[#abc4ff40]' : 'border-[#DA2EEF]'
                } rounded-xl py-2 px-4 justify-between items-center`}
              >
                <div className="text-[#abc4ff80] text-sm">Min</div>
                <DecimalInput
                  className="font-medium text-sm text-white flex-grow"
                  inputClassName="text-right"
                  decimalCount={base && quote && Math.max(base?.decimals, quote?.decimals)}
                  value={userInputPriceRangeMin}
                  onUserInput={(range) => {
                    range != null && setUserInputPriceRangeMin(range)
                  }}
                  onFocus={() => {
                    setIsInputPriceRangeMinFoused(true)
                  }}
                  onBlur={() => {
                    setIsInputPriceRangeMinFoused(false)
                  }}
                />
              </Row>
              <Row
                className={`border-1.5 ${
                  isPriceRangeInRange && isPriceRangeValid ? 'border-[#abc4ff40]' : 'border-[#DA2EEF]'
                } rounded-xl py-2 px-4 justify-between items-center`}
              >
                <div className="text-[#abc4ff80] text-sm">Max</div>
                <DecimalInput
                  className="font-medium text-sm text-white flex-grow"
                  inputClassName="text-right"
                  decimalCount={base && quote && Math.max(base?.decimals, quote?.decimals)}
                  value={userInputPriceRangeMax}
                  onUserInput={(range) => {
                    range != null && setUserInputPriceRangeMax(range)
                  }}
                  onFocus={() => {
                    setIsInputPriceRangeMaxFoused(true)
                  }}
                  onBlur={() => {
                    setIsInputPriceRangeMaxFoused(false)
                  }}
                />
              </Row>
            </Grid>
            {!isPriceRangeValid ? (
              <div className="text-[#da2eef] text-sm mt-1">This range is invalid.</div>
            ) : !isPriceRangeInRange ? (
              <div className="text-[#da2eef] text-sm mt-1">The current price is out of this range.</div>
            ) : null}
          </div>
        )}
      </div>

      {/* result panels */}
      <div>
        <Row className="pt-6 items-center gap-4">
          <Col className="relative grow border-1.5 border-[#abc4ff40] rounded-xl p-2 gap-1">
            <div className="absolute -top-7 text-center left-0 right-0 text-sm text-[#abc4ff]">Current position</div>
            <Row className="justify-between items-center gap-4">
              <Row className="gap-1.5 items-center">
                <CoinAvatar token={base} size="xs" />
                <div className="text-[#abc4ff] text-xs">{base?.symbol ?? '--'}</div>
              </Row>
              <div className="text-[#abc4ff] text-xs">
                {resultAmountBaseCurrentPosition
                  ? toString(resultAmountBaseCurrentPosition, { decimalLength: base?.decimals })
                  : '--'}
              </div>
            </Row>
            <Row className="justify-between items-center gap-4">
              <Row className="gap-1.5 items-center">
                <CoinAvatar token={quote} size="xs" />
                <div className="text-[#abc4ff] text-xs">{quote?.symbol ?? '--'}</div>
              </Row>
              <div className="text-[#abc4ff] text-xs">
                {resultAmountQuoteCurrentPosition
                  ? toString(resultAmountQuoteCurrentPosition, { decimalLength: quote?.decimals })
                  : '--'}
              </div>
            </Row>
          </Col>

          <Icon iconSrc="/icons/migrate-clmm-right-arrow.svg" className="w-6 h-6" iconClassName="w-6 h-6" />

          <Col className="relative grow border-1.5 border-[#abc4ff40] border-dashed rounded-xl p-2 gap-1">
            <div className="absolute -top-7 text-center left-0 right-0 text-sm text-[#abc4ff]">CLMM Pool</div>
            <Row className="justify-between items-center gap-4">
              <CoinAvatar token={base} size="xs" />
              <div className="text-[#abc4ff] text-xs">
                {clmmInfo ? toString(resultAmountBaseCLMMPool) || '--' : '(loading clmm)'}
              </div>
            </Row>
            <Row className="justify-between items-center gap-4">
              <CoinAvatar token={quote} size="xs" />
              <div className="text-[#abc4ff] text-xs">
                {clmmInfo ? toString(resultAmountQuoteCLMMPool) || '--' : '(loading clmm)'}
              </div>
            </Row>
          </Col>

          <Icon iconSrc="/icons/migrate-clmm-add-icon.svg" className="w-4 h-4" iconClassName="w-4 h-4" />

          <Col className="relative grow border-1.5 border-[#abc4ff40] border-dashed rounded-xl p-2 gap-1">
            <div className="absolute -top-7 text-center left-0 right-0 text-sm text-[#abc4ff]">Wallet</div>
            <Row className="justify-between items-center gap-4">
              <CoinAvatar token={base} size="xs" />
              <div className="text-[#abc4ff] text-xs">
                {clmmInfo ? toString(resultAmountBaseWallet) : '(loading clmm)'}
              </div>
            </Row>
            <Row className="justify-between items-center gap-4">
              <CoinAvatar token={quote} size="xs" />
              <div className="text-[#abc4ff] text-xs">
                {clmmInfo ? toString(resultAmountQuoteWallet) : '(loading clmm)'}
              </div>
            </Row>
          </Col>
        </Row>
        {farmInfo && farmInfo.rewards.some((i) => gt(i.userPendingReward, 0)) && (
          <div className="text-[#abc4ff] text-sm mt-2">
            * Migrating will also harvest{' '}
            <span className="font-bold">
              {shakeFalsyItem(
                farmInfo.rewards.map(
                  ({ token, userPendingReward, userHavedReward }) =>
                    userHavedReward &&
                    token && (
                      <span key={toPubString(token?.mint)}>
                        <span>{toString(userPendingReward)}</span>{' '}
                        <span>{userPendingReward?.token.symbol ?? 'UNKNOWN'}</span>
                      </span>
                    )
                )
              )}
            </span>{' '}
            in pending rewards.
          </div>
        )}
      </div>

      {/* Esimated APR */}
      <div>
        <Row className="items-center justify-between mb-1">
          <Row className="items-center gap-2">
            <div className="text-[#abc4ff] font-medium">Estimated APR</div>
            {/* <ConcentratedModifyTooltipIcon /> */}
          </Row>
          <RectTabs
            tabs={[
              { label: `24H`, value: '24H' },
              { label: `7D`, value: '7D' },
              { label: `30D`, value: '30D' }
            ]}
            selectedValue={timeBasis}
            onChange={(tab) => useConcentrated.setState({ timeBasis: tab.value as TimeBasis })}
          ></RectTabs>
        </Row>
        <Row className="border-1.5 border-[#abc4ff40] rounded-xl py-2 px-4 justify-between">
          <AprChartLine clmmInfo={clmmInfo}></AprChartLine>
        </Row>
      </div>

      {/* button */}
      <div className="mt-6">
        <Button
          className="w-full frosted-glass-teal"
          isLoading={isTxProcessing || isApprovePanelShown}
          onClick={() => {
            assert(
              calculatedPriceRangeMinTick.current !== null && calculatedPriceRangeMaxTick.current !== null,
              'not calc price range successfully'
            )
            assert(otherInfoForTx.current, 'not calc amount slippage successfully')
            assert(liquidityInfo, 'liquidity info not load successfully')
            turnOnTxProcessing()
            txMigrateToClmm({
              liquidity: otherInfoForTx.current.liquidity,
              tickLower: calculatedPriceRangeMinTick.current!,
              tickUpper: calculatedPriceRangeMaxTick.current!,
              amountSlippageA: otherInfoForTx.current.amountSlippageBase,
              amountSlippageB: otherInfoForTx.current.amountSlippageQuote,
              currentClmmPool: clmmInfo,
              farmInfo: farmInfo,
              liquidityInfo: liquidityInfo,
              liquidityLpAmount: farmInfo ? undefined : stakedLpAmount?.raw
            })
              .then(({ allSuccess }) => {
                if (allSuccess) {
                  onMigrateSuccess?.()
                }
              })
              .finally(turnOffTxProcessing)
          }}
          validators={[
            {
              should: clmmInfo,
              fallbackProps: {
                children: 'loading...'
              }
            },
            { should: isPriceRangeValid }
          ]}
        >
          Migrate
        </Button>
      </div>
    </Grid>
  )
}

function checkIsInRange(currentPrice: Numberish, exactPriceLower: Numberish, exactPriceUpper: Numberish) {
  return gte(currentPrice, exactPriceLower) && lte(currentPrice, exactPriceUpper)
}

function AprChartLine({ clmmInfo }: { clmmInfo: HydratedConcentratedInfo | undefined }) {
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)
  const aprLineColors = ['#abc4ff', '#37bbe0', '#2b6aff', '#335095']
  const timeBasis = useConcentrated((s) => s.timeBasis)
  const apr = clmmInfo
    ? timeBasis === TimeBasis.DAY
      ? { total: clmmInfo.totalApr24h, itemList: [clmmInfo.feeApr24h, ...clmmInfo.rewardApr24h] }
      : timeBasis === TimeBasis.WEEK
      ? { total: clmmInfo.totalApr7d, itemList: [clmmInfo.feeApr7d, ...clmmInfo.rewardApr7d] }
      : { total: clmmInfo.totalApr30d, itemList: [clmmInfo.feeApr30d, ...clmmInfo.rewardApr30d] }
    : undefined

  const percentInTotal = useMemo(
    () =>
      apr?.itemList.map((percent, idx, percents) =>
        div(
          toPercent(percent),
          percents.reduce((a, b) => toPercent(add(a, b)), toPercent(0))
        )
      ),
    [apr]
  )
  return (
    <Row className={`gap-2 w-full justify-between text-[#fff] ${clmmInfo ? '' : 'opacity-0'}`}>
      <Row className="items-center gap-2">
        <div>{toPercentString(apr?.total)}</div>
        <div
          className="w-[18px] h-[18px] rounded-full flex-none"
          style={{
            background:
              percentInTotal &&
              `conic-gradient(${percentInTotal
                .map((percent, idx) => {
                  const startAt = percentInTotal.slice(0, idx).reduce((a, b) => toPercent(add(a, b)), toPercent(0))
                  const endAt = toPercent(add(startAt, percent))
                  return [
                    `${aprLineColors[idx]} ${toPercentString(startAt)}`,
                    `${aprLineColors[idx]} ${toPercentString(endAt)}`
                  ].join(', ')
                })
                .join(', ')})`,
            WebkitMaskImage: 'radial-gradient(transparent 43%, black 44%)',
            maskImage: 'radial-gradient(transparent 43%, black 44%)'
          }}
        ></div>
      </Row>
      <Row className={`content-around gap-4`}>
        <Row className="items-center gap-2">
          {/* dot */}
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: '#abc4ff'
            }}
          ></div>
          <div className="w-18 text-[#abc4ff] text-sm mobile:text-xs">Trade Fee</div>
          <div className="text-sm">{toPercentString(apr?.itemList[0])}</div>
        </Row>
        {clmmInfo?.rewardInfos.map(({ tokenMint }, idx) => {
          const token = getToken(tokenMint)
          const dotColor = aprLineColors[1 + idx]
          const rewardApr = apr?.itemList[1 + idx]
          return (
            <Row className="items-center gap-2" key={toPubString(token?.mint)}>
              {/* dot */}
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: dotColor
                }}
              ></div>
              <div className="w-18 text-[#abc4ff] text-sm mobile:text-xs">{token?.symbol}</div>
              <div className="text-sm">{toPercentString(rewardApr)}</div>
            </Row>
          )
        })}
      </Row>
      {/* <div>tradeFee: {toPercentString(props.tradeFee)}</div>
      <div>ray: {toPercentString(props.ray)}</div> */}
    </Row>
  )
}

function ModeItem({
  title,
  description,
  selected,
  onClick
}: {
  title: string
  description: string
  onClick?: () => void
  selected?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`relative border-1.5 ${
        selected ? 'border-[#39d0d8]' : 'border-[#abc4ff40]'
      } rounded-xl py-3 px-4 bg-[#141041] cursor-pointer`}
    >
      {selected && <Icon size="sm" className="absolute right-3 top-3" iconSrc="/icons/migrate-check-icon.svg"></Icon>}
      <div className="font-medium text-base text-white mb-1">{title}</div>
      <div className={`font-normal text-sm  ${selected ? 'text-[#ABC4FF]' : 'text-[#ABC4FF80]'}`}>{description}</div>
    </div>
  )
}
