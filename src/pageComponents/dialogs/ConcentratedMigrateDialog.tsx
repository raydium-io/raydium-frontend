import {
  CLMMMigrationJSON,
  getExactPriceAndTick,
  getResultAmountByTick,
  useCLMMMigration
} from '@/application/clmmMigration/useCLMMMigration'
import useAppSettings from '@/application/common/useAppSettings'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import { isFarmInfo, isHydratedFarmInfo } from '@/application/farms/judgeFarmInfo'
import { HydratedFarmInfo } from '@/application/farms/type'
import { HydratedLiquidityInfo } from '@/application/liquidity/type'
import useLiquidity from '@/application/liquidity/useLiquidity'
import useToken from '@/application/token/useToken'
import { decimalToFraction, recursivelyDecimalToFraction } from '@/application/txTools/decimal2Fraction'
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
import { add, div, minus, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { useSignalState } from '@/hooks/useSignalState'
import useToggle from '@/hooks/useToggle'
import { Numberish } from '@/types/constants'
import { useEffect, useMemo, useRef, useState } from 'react'

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
  // console.log('loadedHydratedClmmInfos: ', loadedHydratedClmmInfos)
  // console.log('clmmMigrationInfos: ', clmmMigrationInfos)
  const targetClmmInfo: HydratedConcentratedInfo | undefined = [...loadedHydratedClmmInfos.values()][0] // TEMP for DEV
  const migrationJsonInfos = useCLMMMigration((s) => s.jsonInfos)
  // console.log('targetClmmInfo: ', targetClmmInfo)
  const targetMigrationJsonInfo = targetClmmInfo && migrationJsonInfos.find((i) => i.clmmId === targetClmmInfo.idString)
  // console.log('migrationJsonInfos: ', migrationJsonInfos)
  if (targetClmmInfo) {
    assert(targetMigrationJsonInfo, 'not found migration json')
  }
  // console.log('targetMigrationJsonInfo: ', targetMigrationJsonInfo)

  // console.log('targetMigrationJsonInfo: ', targetMigrationJsonInfo?.lpMint)
  const [canShowMigrateDetail, { on, off, delayOff }] = useToggle()
  const hydratedLiquidityInfos = useLiquidity((s) => s.hydratedInfos)
  const isFarm = isFarmInfo(info) && isHydratedFarmInfo(info)
  const targetHydratedLiquidityInfo = useMemo(() => {
    if (!isFarm) return info
    if (!targetMigrationJsonInfo) return
    return hydratedLiquidityInfos.find((i) => toPubString(i.lpMint) === toPubString(targetMigrationJsonInfo.lpMint))
  }, [isFarm, info, targetMigrationJsonInfo, hydratedLiquidityInfos])
  useEffect(() => {
    useCLMMMigration.setState({
      shouldLoadedClmmIds: new Set(['2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv']) // temp for DEV
    })
  }, [])
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
          <Button className="text-[#ABC4FF] frosted-glass-teal" onClick={on}>
            Migrate
          </Button>
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
        <div className="text-[#abc4ff] text-sm">Migrate below or learn more about CLMM pools and risks here.</div>
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
      />
    </div>
  )

  return (
    <ResponsiveDialogDrawer
      placement="from-bottom"
      open={open}
      onClose={() => {
        delayOff()
        onClose()
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className={`p-6 mobile:p-4 rounded-3xl mobile:rounded-lg ${
            canShowMigrateDetail ? 'w-[min(650px,90vw)]' : 'w-[min(450px,90vw)]'
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
  clmmInfo
}: {
  liquidityInfo?: HydratedLiquidityInfo
  farmInfo?: HydratedFarmInfo
  migrationJsonInfo?: CLMMMigrationJSON
  clmmInfo: HydratedConcentratedInfo | undefined
}) {
  // console.log('clmmInfo: ', clmmInfo)
  const pureRawBalances = useWallet((s) => s.pureRawBalances)
  const slippage = useAppSettings((s) => s.slippageTolerance)
  const slippageNumber = Number(toString(slippage))

  const fee = useMemo(() => {
    const tradeFeeRate =
      clmmInfo &&
      toPercent(div(clmmInfo.ammConfig.tradeFeeRate, 10 ** 4), {
        alreadyDecimaled: true
      })
    return toPercentString(tradeFeeRate, { fixed: 4, alreadyPercented: true })
  }, [clmmInfo])

  const base = liquidityInfo?.baseToken
  const quote = liquidityInfo?.quoteToken
  const lp = liquidityInfo?.lpToken
  const stakedLpAmount = farmInfo
    ? farmInfo.userStakedLpAmount
    : liquidityInfo && div(pureRawBalances[toPubString(liquidityInfo.lpMint)], 10 ** liquidityInfo.lpDecimals)
  const baseRatio =
    liquidityInfo &&
    lp &&
    base &&
    div(toTokenAmount(base, liquidityInfo.baseReserve), toTokenAmount(lp, liquidityInfo.lpSupply))
  const quoteRatio =
    liquidityInfo &&
    lp &&
    quote &&
    div(toTokenAmount(quote, liquidityInfo.quoteReserve), toTokenAmount(lp, liquidityInfo.lpSupply))
  const stakedBaseAmount =
    stakedLpAmount && baseRatio
      ? toTokenAmount(base, mul(stakedLpAmount, baseRatio), { alreadyDecimaled: true })
      : undefined
  const stakedQuoteAmount =
    stakedLpAmount && quoteRatio
      ? toTokenAmount(quote, mul(stakedLpAmount, quoteRatio), { alreadyDecimaled: true })
      : undefined
  const price = clmmInfo?.currentPrice
  const priceRangeAutoMin = migrationJsonInfo?.defaultPriceMin
  // console.log('migrationJsonInfo: ', migrationJsonInfo)
  // console.log('priceRangeAutoMin: ', priceRangeAutoMin)
  const priceRangeAutoMax = migrationJsonInfo?.defaultPriceMax
  // console.log('priceRangeAutoMax: ', priceRangeAutoMax)

  // min price range
  const [userInputPriceRangeMin, setUserInputPriceRangeMin, userInputPriceRangeMinSignal] = useSignalState<
    Numberish | undefined
  >(priceRangeAutoMin)
  useEffect(() => {
    setUserInputPriceRangeMin(priceRangeAutoMin)
  }, [priceRangeAutoMin])
  const [isInputPriceRangeMinFoused, setIsInputPriceRangeMinFoused] = useState<boolean>(false)
  const calculatedPriceRangeMin = useRef<Numberish>()
  const calculatedPriceRangeMinTick = useRef<number>()

  // useEffect(() => {
  //   console.log('calculatedPriceRangeMinTick: ', calculatedPriceRangeMinTick)
  // }, [calculatedPriceRangeMinTick])

  // max price range
  const [userInputPriceRangeMax, setUserInputPriceRangeMax] = useState<Numberish | undefined>(priceRangeAutoMax)
  useEffect(() => {
    setUserInputPriceRangeMax(priceRangeAutoMax)
  }, [priceRangeAutoMax])
  const [isInputPriceRangeMaxFoused, setIsInputPriceRangeMaxFoused] = useState<boolean>(false)
  const calculatedPriceRangeMax = useRef<Numberish>()
  const calculatedPriceRangeMaxTick = useRef<number>()

  // price range valid flagy
  const [isPriceRangeInRange, setIsPriceRangeInRange] = useState<boolean>(false)

  // result amount panels
  const resultAmountBaseCurrentPosition = stakedBaseAmount
  const resultAmountQuoteCurrentPosition = stakedQuoteAmount
  const [resultAmountBaseCLMMPool, setResultAmountBaseCLMMPool] = useState<Numberish>(0)
  const [resultAmountQuoteCLMMPool, setResultAmountQuoteCLMMPool] = useState<Numberish>(0)
  const resultAmountBaseWallet = useMemo(
    () => minus(resultAmountBaseCurrentPosition, resultAmountBaseCLMMPool),
    [resultAmountBaseCurrentPosition, resultAmountBaseCLMMPool]
  )
  const resultAmountQuoteWallet = useMemo(
    () => minus(resultAmountQuoteCurrentPosition, resultAmountQuoteCLMMPool),
    [resultAmountQuoteCurrentPosition, resultAmountQuoteCLMMPool]
  )
  const aprTradeFees = 0.1
  const aprRay = 0.074

  const [mode, setMode] = useState<'quick' | 'custom'>('quick')
  const [priceRangeMode, setPriceRangeMode] = useState<'base' | 'quote'>('base')
  const [aprTimeBase, setAprTimeBase] = useState<'24H' | '7D' | '30D'>('24H')

  useEffect(() => {
    // console.log('clmmInfo: ', clmmInfo)
    // console.log('price: ', price)
    // console.log(
    //   'isInputPriceRangeMinFoused, userInputPriceRangeMin: ',
    //   isInputPriceRangeMinFoused,
    //   userInputPriceRangeMinSignal()
    // )
    if (!clmmInfo || !price) return

    // calc min
    if (!isInputPriceRangeMinFoused && userInputPriceRangeMinSignal()) {
      const { price: exactPrice, tick: exactTick } = getExactPriceAndTick({
        baseSide: priceRangeMode,
        price: userInputPriceRangeMinSignal()!,
        info: clmmInfo.state
      })
      calculatedPriceRangeMin.current = exactPrice
      calculatedPriceRangeMinTick.current = exactTick
      // console.log('exactTick min: ', exactTick)
      setUserInputPriceRangeMin(exactPrice)
    }

    // calc max
    if (!isInputPriceRangeMaxFoused && userInputPriceRangeMax) {
      const { price: exactPrice, tick: exactTick } = getExactPriceAndTick({
        baseSide: priceRangeMode,
        price: userInputPriceRangeMax,
        info: clmmInfo.state
      })
      calculatedPriceRangeMax.current = exactPrice
      calculatedPriceRangeMaxTick.current = exactTick
      // console.log('exactTick max: ', exactTick)
      setUserInputPriceRangeMax(exactPrice)
    }

    // calc result amount
    if (
      stakedBaseAmount &&
      stakedQuoteAmount &&
      calculatedPriceRangeMinTick.current != null &&
      calculatedPriceRangeMaxTick.current != null
    ) {
      const { resultBaseAmount, resultQuoteAmount } = getResultAmountByTick({
        baseSide: priceRangeMode,
        info: clmmInfo.state,
        baseAmount: stakedBaseAmount,
        quoteAmount: stakedQuoteAmount,
        tickLower: calculatedPriceRangeMinTick.current,
        tickUpper: calculatedPriceRangeMaxTick.current,
        slippage: slippageNumber
      })
      setResultAmountBaseCLMMPool(resultBaseAmount)
      setResultAmountQuoteCLMMPool(resultQuoteAmount)
    }

    // get clmm amount
  }, [
    slippageNumber,
    isInputPriceRangeMinFoused,
    isInputPriceRangeMaxFoused,
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
            <div className="text-[#abc4ff] text-base font-medium">{toString(price)}</div>
            <div className="text-[#abc4ff80] text-xs font-medium">
              {quote?.symbol ?? '--'} per {base?.symbol ?? '--'}
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
            onChange={({ value }) => {
              setPriceRangeMode(value as 'base' | 'quote')
            }}
          ></RectTabs>
        </Row>
        {mode === 'quick' && (
          <Row className="border-1.5 border-[#abc4ff40] rounded-xl py-2 px-4 justify-between">
            <div className="text-[#abc4ff] font-medium">
              {priceRangeMode === 'base'
                ? `${priceRangeAutoMin && Math.round(priceRangeAutoMin)} - ${
                    priceRangeAutoMax && Math.round(priceRangeAutoMax)
                  }`
                : `${priceRangeAutoMax && Math.round(1 / priceRangeAutoMax)} - ${
                    priceRangeAutoMin && Math.round(1 / priceRangeAutoMin)
                  }`}
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
                  isPriceRangeInRange ? 'border-[#abc4ff40]' : 'border-[#DA2EEF]'
                } rounded-xl py-3 px-4 justify-between items-center`}
              >
                <div className="text-[#abc4ff80] text-xs">Min</div>
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
                  isPriceRangeInRange ? 'border-[#abc4ff40]' : 'border-[#DA2EEF]'
                } rounded-xl py-3 px-4 justify-between items-center`}
              >
                <div className="text-[#abc4ff80] text-xs">Max</div>
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
            {!isPriceRangeInRange && (
              <div className="text-[#da2eef] text-sm mt-1">The current price is out of this range.</div>
            )}
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
                {toString(resultAmountBaseCurrentPosition, { decimalLength: base?.decimals })}
              </div>
            </Row>
            <Row className="justify-between items-center gap-4">
              <Row className="gap-1.5 items-center">
                <CoinAvatar token={quote} size="xs" />
                <div className="text-[#abc4ff] text-xs">{quote?.symbol ?? '--'}</div>
              </Row>
              <div className="text-[#abc4ff] text-xs">
                {toString(resultAmountQuoteCurrentPosition, { decimalLength: quote?.decimals })}
              </div>
            </Row>
          </Col>

          <Icon iconSrc="/icons/migrate-clmm-right-arrow.svg" className="w-6 h-6" iconClassName="w-6 h-6" />

          <Col className="relative grow border-1.5 border-[#abc4ff40] border-dashed rounded-xl p-2 gap-1">
            <div className="absolute -top-7 text-center left-0 right-0 text-sm text-[#abc4ff]">CLMM Pool</div>
            <Row className="justify-end items-center gap-4">
              <div className="text-[#abc4ff] text-xs">{toString(resultAmountBaseCLMMPool)}</div>
            </Row>
            <Row className="justify-end items-center gap-4">
              <div className="text-[#abc4ff] text-xs">{toString(resultAmountQuoteCLMMPool)}</div>
            </Row>
          </Col>

          <Icon iconSrc="/icons/migrate-clmm-add-icon.svg" className="w-4 h-4" iconClassName="w-4 h-4" />

          <Col className="relative grow border-1.5 border-[#abc4ff40] border-dashed rounded-xl p-2 gap-1">
            <div className="absolute -top-7 text-center left-0 right-0 text-sm text-[#abc4ff]">Wallet</div>
            <Row className="justify-end items-center gap-4">
              <div className="text-[#abc4ff] text-xs">{toString(resultAmountBaseWallet)}</div>
            </Row>
            <Row className="justify-end items-center gap-4">
              <div className="text-[#abc4ff] text-xs">{toString(resultAmountQuoteWallet)}</div>
            </Row>
          </Col>
        </Row>
        {farmInfo && (
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
          <div className="text-[#abc4ff] font-medium">Estimated APR</div>
          <RectTabs
            tabs={[
              { label: `24H`, value: '24H' },
              { label: `7D`, value: '7D' },
              { label: `30D`, value: '30D' }
            ]}
            selectedValue={aprTimeBase}
            onChange={({ value }) => {
              setAprTimeBase(value as '24H' | '7D' | '30D')
            }}
          ></RectTabs>
        </Row>
        <Row className="border-1.5 border-[#abc4ff40] rounded-xl py-2 px-4 justify-between">
          <AprChartLine timeBase={aprTimeBase} tradeFee={aprTradeFees} ray={aprRay}></AprChartLine>
        </Row>
      </div>

      {/* button */}
      <div className="mt-6">
        <Button
          className="w-full frosted-glass-teal"
          onClick={() => {
            /* TODO */
          }}
        >
          Migrate
        </Button>
      </div>
    </Grid>
  )
}

function AprChartLine(props: { timeBase: '24H' | '7D' | '30D'; tradeFee: Numberish; ray: Numberish }) {
  return (
    <Row className="gap-2 text-[#abc4ff]">
      <div>totalApr: {toPercentString(add(props.tradeFee, props.ray))}</div>
      <div>tradeFee: {toPercentString(props.tradeFee)}</div>
      <div>ray: {toPercentString(props.ray)}</div>
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
      className={`border-1.5 ${
        selected ? 'border-[#39d0d8]' : 'border-[#abc4ff40]'
      } rounded-xl py-3 px-4 bg-[#141041] cursor-pointer`}
    >
      <div className="font-medium text-base text-white mb-1">{title}</div>
      <div className={`font-normal text-sm  ${selected ? 'text-[#ABC4FF]' : 'text-[#ABC4FF80]'}`}>{description}</div>
    </div>
  )
}
