import useAppSettings from '@/application/appSettings/useAppSettings'
import txHavestConcentrated from '@/application/concentrated/txHavestConcentrated'
import { UserPositionAccount } from '@/application/concentrated/type'
import useConcentrated, { TimeBasis } from '@/application/concentrated/useConcentrated'
import { routeBack, routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import { decimalToFraction } from '@/application/txTools/decimal2Fraction'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import Col from '@/components/Col'
import { ColItem } from '@/components/ColItem'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { RowItem } from '@/components/RowItem'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { inClient } from '@/functions/judgers/isSSR'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { add, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { toXYChartFormat } from '@/pageComponents/Concentrated'
import Chart from '@/pageComponents/ConcentratedRangeChart/Chart'
import { AddConcentratedLiquidityDialog } from '@/pageComponents/dialogs/AddConcentratedLiquidityDialog'
import { RemoveConcentratedLiquidityDialog } from '@/pageComponents/dialogs/RemoveConcentratedLiquidityDialog'
import { Numberish } from '@/types/constants'
import { useImperativeHandle } from 'react'
import { twMerge } from 'tailwind-merge'
import { Fraction, Price, Token } from 'test-r-sdk'

export default function MyPosition() {
  return (
    <>
      <PageLayout mobileBarTitle="Concentrated" metaTitle="Concentrated - Raydium">
        <NavButtons />
        <MyPositionPageHead />
        <MyPositionCard />
        <AddConcentratedLiquidityDialog />
        <RemoveConcentratedLiquidityDialog />
      </PageLayout>
    </>
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

// const availableTabValues = ['Swap', 'Liquidity'] as const
function MyPositionPageHead() {
  return <Row className="w-[min(912px,100%)] self-center mb-10 mobile:mb-2 font-medium text-2xl">My Position</Row>
}

function MyPositionCardTopInfo({ className }: { className?: string }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const { wholeLiquidity, baseLiquidity, quoteLiquidity } =
    targetUserPositionAccount?.getLiquidityVolume?.(tokenPrices) ?? {}
  return (
    <Row className={twMerge('bg-[#141041] grid-cols-4 py-3 px-4 rounded-xl gap-12', className)}>
      <Grid className="grid-rows-[2em,1fr] items-center grow">
        <div className="font-medium text-[#abc4ff] h-8">Liquidity</div>
        <div className="font-medium text-2xl text-white">{toUsdVolume(wholeLiquidity)}</div>
      </Grid>
      <Grid className="grid-rows-[2em,1fr] items-center grow">
        <div className="font-medium text-[#abc4ff] h-8">Leverage</div>
        <div className="font-medium text-2xl text-white">{targetUserPositionAccount?.leverage.toFixed(2)}x</div>
      </Grid>
      <Grid className="grid-rows-[2em,1fr] items-center grow">
        <div className="font-medium text-[#abc4ff] h-8">Deposit Ratio</div>
        <Col className="font-medium text-2xl text-white">
          <RowItem
            prefix={
              <Row className="items-center gap-2">
                <CoinAvatar token={currentAmmPool?.base} size="smi" />
                <div className="text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.base?.symbol ?? '--'}</div>
              </Row>
            }
            suffix={
              <div className="text-[#abc4ff80]">{toPercentString(targetUserPositionAccount?.positionPercentA)}</div>
            }
            text={<div className="text-white justify-end">{toUsdVolume(baseLiquidity)}</div>}
          />
          <RowItem
            prefix={
              <Row className="items-center gap-2">
                <CoinAvatar token={currentAmmPool?.quote} size="smi" />
                <div className="text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.quote?.symbol ?? '--'}</div>
              </Row>
            }
            suffix={
              <div className="text-[#abc4ff80]">{toPercentString(targetUserPositionAccount?.positionPercentB)}</div>
            }
            text={<div className="text-white">{toUsdVolume(quoteLiquidity)}</div>}
          />
        </Col>
      </Grid>
      <Grid className="grid-rows-[2em,1fr] items-center grow">
        <div className="font-medium text-[#abc4ff] h-8">NFT</div>
        <div className="font-medium text-2xl text-[#abc4ff80]">
          <AddressItem showDigitCount={6} canCopy canExternalLink>
            {targetUserPositionAccount?.nftMint}
          </AddressItem>
        </div>
      </Grid>
    </Row>
  )
}

function MyPositionCardChartInfo({ className }: { className?: string }) {
  const [currentAmmPool, chartPoints, coin1, coin2] = useConcentrated((s) => [
    s.currentAmmPool,
    s.chartPoints,
    s.coin1,
    s.coin2
  ])
  const isMobile = useAppSettings((s) => s.isMobile)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const decimals = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const [initMinBoundaryX, initMaxBoundaryX] = [
    targetUserPositionAccount && toFraction(targetUserPositionAccount!.priceLower),
    targetUserPositionAccount && toFraction(targetUserPositionAccount!.priceUpper)
  ]
  return (
    <Col className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
      <Row className="items-center gap-2">
        <div className="font-medium text-[#abc4ff]">My Position</div>
        <RangeTag positionAccount={targetUserPositionAccount} />
      </Row>
      <Grid className="items-center text-2xl text-white">
        {toString(targetUserPositionAccount?.priceLower)} - {toString(targetUserPositionAccount?.priceUpper)}
      </Grid>
      <div className="font-medium text-[#abc4ff]">
        {currentAmmPool?.quote?.symbol ?? '--'} per {currentAmmPool?.base?.symbol ?? '--'}
      </div>
      <div className="items-center grow ">
        <Chart
          chartOptions={{
            points: chartPoints ? toXYChartFormat(chartPoints) : [],
            initMinBoundaryX,
            initMaxBoundaryX
          }}
          currentPrice={currentAmmPool ? currentAmmPool.currentPrice : undefined}
          decimals={decimals}
          hideRangeLine
          hideRangeInput
          showCurrentPriceOnly
          height={isMobile ? 200 : 300}
        />
      </div>
      <Row className="items-center flex-wrap gap-2">
        <RowItem
          className="border-1.5 border-[#abc4ff40] text-[#abc4ff] text-xs font-normal py-1.5 px-3 rounded-lg"
          prefix={<div className="w-3 h-3 bg-[#abc4ff] rounded-full mr-2"></div>}
        >
          Pool Liquidity
        </RowItem>
        <RowItem
          className="border-1.5 border-[#abc4ff40] text-[#abc4ff] text-xs font-normal py-1.5 px-3 rounded-lg"
          prefix={<div className="w-3 h-3 bg-[#161b4a] rounded-full mr-2"></div>}
        >
          My Range
        </RowItem>
        <RowItem
          className="border-1.5 border-[#abc4ff40] text-[#abc4ff] text-xs font-normal py-1.5 px-3 rounded-lg"
          prefix={<div className="w-3 h-3 bg-white rounded-full mr-2"></div>}
        >
          Current Price
        </RowItem>
      </Row>
    </Col>
  )
}

function MyPositionCardPendingRewardInfo({ className }: { className?: string }) {
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const refreshConcentrated = useConcentrated((s) => s.refreshConcentrated)

  const connected = useWallet((s) => s.connected)

  const tokenPrices = useToken((s) => s.tokenPrices)
  const rewardsVolume: { token?: Token; volume?: Numberish }[] =
    targetUserPositionAccount?.rewardInfos.map((info) => ({
      token: info.penddingReward?.token,
      volume: mul(info.penddingReward, tokenPrices[toPubString(info.penddingReward?.token.mint)])
    })) ?? []
  const feesVolume: { token?: Token; volume?: Numberish }[] = targetUserPositionAccount
    ? [
        {
          token: targetUserPositionAccount?.tokenFeeAmountA?.token,
          volume: mul(
            targetUserPositionAccount?.tokenFeeAmountA,
            tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountA?.token.mint)]
          )
        },
        {
          token: targetUserPositionAccount?.tokenFeeAmountB?.token,
          volume: mul(
            targetUserPositionAccount?.tokenFeeAmountB,
            tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountB?.token.mint)]
          )
        }
      ]
    : []
  const totalVolume = rewardsVolume
    .concat(feesVolume)
    .reduce((acc, { volume }) => (volume ? add(acc ?? toFraction(0), volume) : acc), undefined as Fraction | undefined)

  useImperativeHandle
  const hasPendingReward = isMeaningfulNumber(totalVolume)
  return (
    <Col className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
      <Row className="items-center gap-2">
        <div className="font-medium text-[#abc4ff]">Pending Yield</div>
      </Row>
      <Row className="items-center gap-8">
        <div className="font-medium text-2xl text-white">≈{toUsdVolume(totalVolume)}</div>
        <Button
          className="frosted-glass-teal"
          onClick={() =>
            txHavestConcentrated().then(({ allSuccess }) => {
              if (allSuccess) {
                refreshConcentrated()
              }
            })
          }
          validators={[
            {
              should: connected,
              forceActive: true,
              fallbackProps: {
                onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                children: 'Connect Wallet'
              }
            },
            { should: hasPendingReward }
          ]}
        >
          Harvest
        </Button>
      </Row>

      <Grid className="grid-cols-2 border-1.5 border-[#abc4ff40] py-3 px-4 gap-2 rounded-xl">
        <div>
          <div className="font-medium text-[#abc4ff] mt-2 mb-4">Rewards</div>
          <Grid className="grow grid-cols-1 gap-2">
            {rewardsVolume.map(({ token, volume }) => (
              <RowItem
                key={toPubString(token?.mint)}
                prefix={
                  <Row className="items-center gap-2">
                    <CoinAvatar token={token} size="smi" />
                    <div className="text-[#abc4ff80] min-w-[4em] mr-1">{token?.symbol ?? '--'}</div>
                  </Row>
                }
                text={<div className="text-white justify-end">{toUsdVolume(volume)}</div>}
              />
            ))}
          </Grid>
        </div>
        <div>
          <div className="font-medium text-[#abc4ff] mt-2 mb-4">Fees</div>
          <Grid className="grow grid-cols-1 gap-2">
            {feesVolume.map(({ token, volume }) => (
              <RowItem
                key={toPubString(token?.mint)}
                prefix={
                  <Row className="items-center gap-2">
                    <CoinAvatar token={token} size="smi" />
                    <div className="text-[#abc4ff80] min-w-[4em] mr-1">{token?.symbol ?? '--'}</div>
                  </Row>
                }
                text={<div className="text-white justify-end">{toUsdVolume(volume)}</div>}
              />
            ))}
          </Grid>
        </div>
      </Grid>
    </Col>
  )
}

function MyPositionCardAPRInfo({ className }: { className?: string }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const timeBasis = useConcentrated((s) => s.timeBasis)
  return (
    <Col className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
      <Row className="items-center gap-2">
        <div className="font-medium text-[#abc4ff]">Estimated APR</div>
      </Row>
      <Row className="items-center gap-4">
        <div className="font-medium text-2xl text-white">
          {toPercentString(
            currentAmmPool?.[
              timeBasis === TimeBasis.DAY ? 'totalApr24h' : timeBasis === TimeBasis.WEEK ? 'totalApr7d' : 'totalApr30d'
            ]
          )}
        </div>
      </Row>
      <Grid className="grid-cols-1 border-1.5 border-[#abc4ff40] py-3 px-4 gap-2 rounded-xl">
        <div className="font-medium text-[#abc4ff] mt-2 mb-4">Yield</div>
        <Grid className="grow grid-cols-2 gap-2">
          <RowItem
            prefix={
              <Row className="items-center gap-2">
                <Icon iconSrc="/icons/entry-icon-trade.svg" size="md" className="scale-75 " />
                <div className="text-[#abc4ff80] min-w-[4em] mr-1">Trade Fee</div>
              </Row>
            }
            text={
              <div className="text-white justify-end">
                {toPercentString(
                  currentAmmPool?.[
                    timeBasis === TimeBasis.DAY ? 'feeApr24h' : timeBasis === TimeBasis.WEEK ? 'fee7d' : 'feeApr30d'
                  ]
                )}
              </div>
            }
          />
          {targetUserPositionAccount?.rewardInfos.map(({ penddingReward, apr30d, apr24h, apr7d }) => (
            <RowItem
              key={toPubString(penddingReward?.token.mint)}
              prefix={
                <Row className="items-center gap-2">
                  <CoinAvatar token={penddingReward?.token} size="smi" />
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">{penddingReward?.token?.symbol ?? '--'}</div>
                </Row>
              }
              text={
                <div className="text-white justify-end">
                  {toPercentString(
                    timeBasis === TimeBasis.DAY ? apr24h : timeBasis === TimeBasis.WEEK ? apr7d : apr30d
                  )}
                </div>
              } // TEMP
            />
          ))}
        </Grid>
      </Grid>
    </Col>
  )
}

function MyPositionCardHeader({ className }: { className?: string }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  return (
    <Row className={twMerge('justify-between py-2 pb-5', className)}>
      <Row className="items-center gap-2">
        <CoinAvatarPair token1={currentAmmPool?.base} token2={currentAmmPool?.quote} size="lg" />
        <div className="font-medium text-xl text-white">
          {currentAmmPool?.base?.symbol ?? '--'} - {currentAmmPool?.quote?.symbol ?? '--'}
        </div>
        <RangeTag positionAccount={targetUserPositionAccount} />
      </Row>
      <Row className="items-center gap-2">
        <Button
          className="frosted-glass-teal"
          onClick={() => {
            useConcentrated.setState({
              isAddDialogOpen: true,
              currentAmmPool,
              targetUserPositionAccount,
              coin1: currentAmmPool?.base,
              coin2: currentAmmPool?.quote
            })
          }}
        >
          Add Liquidity
        </Button>
        <Button
          className="frosted-glass-teal ghost"
          onClick={() => {
            useConcentrated.setState({
              isRemoveDialogOpen: true,
              currentAmmPool,
              targetUserPositionAccount,
              coin1: currentAmmPool?.base,
              coin2: currentAmmPool?.quote
            })
          }}
        >
          Remove Liquidity
        </Button>
      </Row>
    </Row>
  )
}

function MyPositionCard() {
  return (
    <CyberpunkStyleCard
      wrapperClassName="relative w-[min(912px,100%)] self-center cyberpunk-bg-light"
      className="py-5 px-6 mobile:py-5 mobile:px-3"
    >
      <div className="absolute -left-8 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <AsideNavButtons />
      </div>
      <MyPositionCardHeader />

      <Grid className="gap-3 grid-cols-2 w-[min(912px,100%)]">
        <MyPositionCardTopInfo className="col-span-full" />
        <MyPositionCardChartInfo className="col-span-1 row-span-2" />
        <MyPositionCardPendingRewardInfo />
        <MyPositionCardAPRInfo />
      </Grid>

      <MyPositionCardPoolOverview />
    </CyberpunkStyleCard>
  )
}

function MyPositionCardPoolOverview({ className }: { className?: string }) {
  const tokenPrices = useToken((s) => s.tokenPrices)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const basePrice: Price | undefined = tokenPrices[toPubString(currentAmmPool?.base?.mint)]
  const quotePrice: Price | undefined = tokenPrices[toPubString(currentAmmPool?.quote?.mint)]
  return (
    <Collapse openDirection="upwards" className="w-full mt-4">
      <Collapse.Body>
        <div className="pb-4">
          <div className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
            <div className="font-medium text-[#abc4ff] mb-4">Pool Overview</div>
            <Grid className="grid-cols-4 gap-8">
              <ColItem
                className="gap-1 font-medium"
                prefix={<div className="text-[#abc4ff80] min-w-[4em] mr-1">Fee Rate</div>}
                // TEMP: force 30d
                text={<div className="text-white">{toPercentString(currentAmmPool?.feeApr30d)}</div>}
              />
              <ColItem
                className="gap-1 font-medium"
                prefix={<div className="text-[#abc4ff80] min-w-[4em] mr-1">Liquidity</div>}
                text={<div className="text-white">{toUsdVolume(currentAmmPool?.tvl)}</div>}
              />
              <ColItem
                className="gap-1 font-medium"
                prefix={<div className="text-[#abc4ff80] min-w-[4em] mr-1">24h Volume</div>}
                text={<div className="text-white">{toUsdVolume(currentAmmPool?.volume24h)}</div>}
              />
              <ColItem
                className="gap-1 font-medium"
                prefix={<div className="text-[#abc4ff80] min-w-[4em] mr-1">Tick Spacing</div>}
                text={<div className="text-white">{currentAmmPool?.ammConfig.tickSpacing}</div>}
              />
              <ColItem
                className="gap-1 font-medium col-span-2"
                prefix={
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">
                    Weekly Rewards {currentAmmPool?.base?.symbol ?? 'base'}
                  </div>
                }
                // TEMP: force 30d
                text={
                  <Row className="items-center gap-2">
                    <CoinAvatar token={currentAmmPool?.base} size="smi" />
                    <div className="text-white">
                      {toString(currentAmmPool?.fee7dA, { decimalLength: currentAmmPool?.base?.decimals })}
                    </div>
                    <div className="text-[#abc4ff80]">{toUsdVolume(mul(currentAmmPool?.fee7dA, basePrice))}</div>
                  </Row>
                }
              />
              <ColItem
                className="gap-1 font-medium col-span-2"
                prefix={
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">
                    Weekly Rewards {currentAmmPool?.quote?.symbol ?? 'quote'}
                  </div>
                }
                // TEMP: force 30d
                text={
                  <Row className="items-center gap-2">
                    <CoinAvatar token={currentAmmPool?.quote} size="smi" />
                    <div className="text-white">
                      {toString(currentAmmPool?.fee7dB, { decimalLength: currentAmmPool?.quote?.decimals })}
                    </div>
                    <div className="text-[#abc4ff80]">{toUsdVolume(mul(currentAmmPool?.fee7dB, quotePrice))}</div>
                  </Row>
                }
              />
            </Grid>
          </div>
        </div>
      </Collapse.Body>
      <Collapse.Face>
        {(open) => (
          <Row className="border-t-1.5 pt-5 border-[#abc4ff40] w-full items-center justify-center text-sm font-medium text-[#abc4ff] cursor-pointer select-none">
            <div>Pool Overview</div>
            <Icon size="sm" heroIconName={open ? 'chevron-up' : 'chevron-down'} className="ml-1" />
          </Row>
        )}
      </Collapse.Face>
    </Collapse>
  )
}

function RangeTag({ positionAccount }: { positionAccount?: UserPositionAccount }) {
  if (!positionAccount) return null
  return positionAccount.inRange ? (
    <Row className="items-center bg-[#142B45] rounded text-xs text-[#39D0D8] py-0.5 px-1 ml-2">
      <Icon size="xs" iconSrc={'/icons/check-circle.svg'} />
      <div className="font-normal" style={{ marginLeft: 4 }}>
        In Range
      </div>
    </Row>
  ) : (
    <Row className="items-center bg-[#DA2EEF]/10 rounded text-xs text-[#DA2EEF] py-0.5 px-1 ml-2">
      <Icon size="xs" iconSrc={'/icons/warn-stick.svg'} />
      <div className="font-normal" style={{ marginLeft: 4 }}>
        Out of Range
      </div>
    </Row>
  )
}
