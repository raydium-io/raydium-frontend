import { useCLMMMigration } from '@/application/clmmMigration/useCLMMMigration'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import { HydratedFarmInfo } from '@/application/farms/type'
import { HydratedLiquidityInfo } from '@/application/liquidity/type'
import useToken from '@/application/token/useToken'
import { RAYMint, SOLMint, USDCMint } from '@/application/token/wellknownToken.config'
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
import toPercentString from '@/functions/format/toPercentString'
import { toString } from '@/functions/numberish/toString'
import useToggle from '@/hooks/useToggle'
import { Numberish } from '@/types/constants'
import { useEffect, useMemo, useState } from 'react'

export default function ConcentratedMigrateDialog({
  info,
  open,
  onClose
}: {
  info: HydratedLiquidityInfo | HydratedFarmInfo
  open: boolean
  onClose: () => void
}) {
  const [canShowMigrateDetail, { on, off, delayOff }] = useToggle()

  useEffect(() => {
    useCLMMMigration.setState({
      shouldLoadedClmmIds: new Set(['2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv']) // temp for DEV
    })
  }, [])
  const alertTitle = 'Migrate Position'
  const alertDescription =
    'We are no longer providing rewards to this pair any more. Would you like to migrate your position to CLMM pool?'
  const alertLinkText = 'What is CLMM pool?'

  const clmmMigrationInfos = useCLMMMigration((s) => s.loadedHydratedClmmInfos)
  const targetClmmInfo = [...clmmMigrationInfos.values()][0] // TEMP for DEV
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
      <DetailPanel info={targetClmmInfo} />
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

function DetailPanel({ info }: { info: HydratedConcentratedInfo | undefined }) {
  // NOTE: how to simplify this tedious issue in solidjs? 🤔 Just do nothing is ok!!
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)

  const base = info?.base
  const quote = info?.quote
  const fee = 0.00005
  const price = 3.10809
  const [priceRangeMin, setPriceRangeMin] = useState<Numberish>(83872.52)
  const [priceRangeMax, setPriceRangeMax] = useState<Numberish>(812342)
  const [isPriceRangeInRange, setIsPriceRangeInRange] = useState<boolean>(false)
  const resultAmountBaseCurrentPosition = 9340309
  const resultAmountQuoteCurrentPosition = 234.02
  const resultAmountBaseCLMMPool = 630309
  const resultAmountQuoteCLMMPool = 144.02
  const resultAmountBaseWallet = 8709000
  const resultAmountQuoteWallet = 90.02
  const havestPendingAmount = 2490434
  const aprTradeFees = 0.1
  const aprBase = 0.037
  const aprQuote = 0.037
  const totalApr = aprTradeFees + aprBase + aprQuote

  const [mode, setMode] = useState<'quick' | 'custom'>('quick')
  const [priceRangeMode, setPriceRangeMode] = useState<'base price' | 'quote price'>('base price')
  const [aprTimeBase, setAprTimeBase] = useState<'24H' | '7D' | '30D'>('24H')

  return (
    <Grid className="gap-4">
      {/* <div>
        <div className="text-[#abc4ff] font-medium">My Position</div>
        <div className="border-1.5 border-[#abc4ff40] rounded-xl p-3">
          <Row className="justify-between">
            <Row>
              <CoinAvatar token={quote} size="md" />
              <div className="text-[#abc4ff] font-medium">{quote?.symbol ?? '--'}</div>
            </Row>
            <Row>
              <div className="text-[#fff] font-medium">23.33</div>
              <div className="text-[#fff] font-medium">{quote?.symbol ?? '--'}</div>
            </Row>
          </Row>
          <Row className="justify-between">
            <Row>
              <CoinAvatar token={base} size="md" />
              <div className="text-[#abc4ff] font-medium">{base?.symbol ?? '--'}</div>
            </Row>
            <Row>
              <div className="text-[#fff] font-medium">23.33</div>
              <div className="text-[#fff] font-medium">{base?.symbol ?? '--'}</div>
            </Row>
          </Row>
        </div>
      </div> */}

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
            <div className="text-[#abc4ff] text-base font-medium">{price}</div>
            <div className="text-[#abc4ff80] text-xs font-medium">
              {base?.symbol ?? '--'} per {quote?.symbol ?? '--'}
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
              { label: `${base?.symbol ?? '--'} price`, value: 'base price' },
              { label: `${quote?.symbol ?? '--'} price`, value: 'quote price' }
            ]}
            selectedValue={priceRangeMode}
            onChange={({ value }) => {
              setPriceRangeMode(value as 'base price' | 'quote price')
            }}
          ></RectTabs>
        </Row>
        {mode === 'quick' && (
          <Row className="border-1.5 border-[#abc4ff40] rounded-xl py-2 px-4 justify-between">
            <div className="text-[#abc4ff] font-medium">0 - 1000</div>
            <Row className="items-center gap-2">
              <div className="text-[#abc4ff80] text-sm font-medium">
                {base?.symbol ?? '--'} per {quote?.symbol ?? '--'}
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
                  value={priceRangeMin}
                  onUserInput={(range) => {
                    range != null && setPriceRangeMin(range)
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
                  value={priceRangeMax}
                  onUserInput={(range) => {
                    range != null && setPriceRangeMax(range)
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
              <div className="text-[#abc4ff] text-xs">{toString(resultAmountBaseCurrentPosition)}</div>
            </Row>
            <Row className="justify-between items-center gap-4">
              <Row className="gap-1.5 items-center">
                <CoinAvatar token={quote} size="xs" />
                <div className="text-[#abc4ff] text-xs">{quote?.symbol ?? '--'}</div>
              </Row>
              <div className="text-[#abc4ff] text-xs">{toString(resultAmountQuoteCurrentPosition)}</div>
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
        <div className="text-[#abc4ff] text-sm mt-2">
          *Migrating will also harvest <span className="font-bold">{toString(havestPendingAmount)} RAY</span> in pending
          rewards.
        </div>
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
          <AprChartLine
            timeBase={aprTimeBase}
            totalApr={totalApr}
            tradeFee={aprTradeFees}
            base={aprBase}
            quote={aprQuote}
          ></AprChartLine>
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

function AprChartLine(props: {
  timeBase: '24H' | '7D' | '30D'
  totalApr: Numberish
  tradeFee: Numberish
  base: Numberish
  quote: Numberish
}) {
  return (
    <Row className="gap-2 text-[#abc4ff]">
      <div>totalApr: {toPercentString(props.totalApr)}</div>
      <div>tradeFee: {toPercentString(props.tradeFee)}</div>
      <div>base: {toPercentString(props.base)}</div>
      <div>quote: {toPercentString(props.quote)}</div>
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
