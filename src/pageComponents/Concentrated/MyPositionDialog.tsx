import { twMerge } from 'tailwind-merge'
import { Fraction, Price, Token, TokenAmount } from '@raydium-io/raydium-sdk'

import useAppSettings from '@/application/common/useAppSettings'
import txHavestConcentrated from '@/application/concentrated/txHavestConcentrated'
import { UserPositionAccount } from '@/application/concentrated/type'
import useConcentrated, { timeMap } from '@/application/concentrated/useConcentrated'
import useConcentratedAmmSelector from '@/application/concentrated/useConcentratedAmmSelector'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import Col from '@/components/Col'
import { ColItem } from '@/components/ColItem'
import Collapse from '@/components/Collapse'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import { RowItem } from '@/components/RowItem'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { add, mul } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { toXYChartFormat } from '@/pageComponents/Concentrated'
import Chart from '@/pageComponents/ConcentratedRangeChart/Chart'
import { Numberish } from '@/types/constants'
import { AprChart } from './AprChart'
import { ConcentratedModifyTooltipIcon } from './ConcentratedModifyTooltipIcon'
import { ConcentratedTimeBasisSwitcher } from './ConcentratedTimeBasisSwitcher'
import { useConcentratedPositionAprCalc } from './useConcentratedAprCalc'

function MyPositionCardTopInfo({ className }: { className?: string }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const { wholeLiquidity, baseLiquidity, quoteLiquidity } =
    targetUserPositionAccount?.getLiquidityVolume?.(tokenPrices) ?? {}
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Row className={twMerge('flex-wrap bg-[#141041] grid-cols-4 py-3 px-4 rounded-xl gap-12 mobile:gap-4', className)}>
      <Grid className="grid-rows-[2em,1fr] items-center grow">
        <div className="mobile:text-sm font-medium text-[#abc4ff] h-8">Liquidity</div>
        <div className="mobile:text-md font-medium text-2xl text-white">{toUsdVolume(wholeLiquidity)}</div>
      </Grid>
      <Grid className="grid-rows-[2em,1fr] items-center grow">
        <div className="mobile:text-sm font-medium text-[#abc4ff] h-8">Leverage</div>
        <div className="mobile:text-md font-medium text-2xl text-white">
          {targetUserPositionAccount?.leverage.toFixed(2)}x
        </div>
      </Grid>
      <Grid className="grid-rows-[2em,1fr] items-center grow">
        <div className="mobile:text-sm font-medium text-[#abc4ff] h-8">Deposit Ratio</div>
        <Col className="mobile:text-md font-medium text-2xl text-white gap-2 mobile:gap-1">
          <RowItem
            prefix={
              <Row className="items-center gap-2">
                <CoinAvatar token={currentAmmPool?.base} size={isMobile ? 'sm' : 'smi'} />
                <div className=" text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.base?.symbol ?? '--'}</div>
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
                <CoinAvatar token={currentAmmPool?.quote} size={isMobile ? 'sm' : 'smi'} />
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
        <div className="mobile:text-sm font-medium text-[#abc4ff] h-8">NFT</div>
        <div className="font-medium text-[#abc4ff80]">
          <AddressItem textClassName="text-xs" showDigitCount={isMobile ? 8 : 6} canCopy canExternalLink>
            {targetUserPositionAccount?.nftMint}
          </AddressItem>
        </div>
      </Grid>
    </Row>
  )
}

function MyPositionCardChartInfo({ className }: { className?: string }) {
  useConcentratedAmmSelector()
  const [currentAmmPool, chartPoints, coin1, coin2, timeBasis] = useConcentrated((s) => [
    s.currentAmmPool,
    s.chartPoints,
    s.coin1,
    s.coin2,
    s.timeBasis
  ])
  const isMobile = useAppSettings((s) => s.isMobile)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const decimals = coin1 || coin2 ? Math.max(coin1?.decimals ?? 0, coin2?.decimals ?? 0) : 6
  const [initMinBoundaryX, initMaxBoundaryX] = [
    targetUserPositionAccount && toFraction(targetUserPositionAccount!.priceLower),
    targetUserPositionAccount && toFraction(targetUserPositionAccount!.priceUpper)
  ]

  const priceRange = currentAmmPool
    ? [currentAmmPool.state[timeMap[timeBasis]].priceMin, currentAmmPool.state[timeMap[timeBasis]].priceMax]
    : [undefined, undefined]

  return (
    <Col className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
      <Row className="items-center gap-2">
        <div className="mobile:text-sm font-medium text-[#abc4ff]">My Position</div>
        <RangeTag positionAccount={targetUserPositionAccount} />
      </Row>
      <Grid className="items-center text-2xl text-white mobile:text-base">
        {toString(targetUserPositionAccount?.priceLower)} - {toString(targetUserPositionAccount?.priceUpper)}
      </Grid>
      <div className="font-medium text-[#abc4ff] mobile:text-xs">
        {currentAmmPool?.quote?.symbol ?? '--'} per {currentAmmPool?.base?.symbol ?? '--'}
      </div>
      <div className="items-center grow ">
        <Chart
          chartOptions={{
            points: chartPoints ? toXYChartFormat(chartPoints) : [],
            initMinBoundaryX,
            initMaxBoundaryX
          }}
          priceMin={priceRange[0]}
          priceMax={priceRange[1]}
          currentPrice={currentAmmPool ? currentAmmPool.currentPrice : undefined}
          priceLabel={`${coin2?.symbol} per ${coin1?.symbol}`}
          decimals={decimals}
          hideRangeLine
          hideRangeInput
          showCurrentPriceOnly
          timeBasis={timeBasis}
          height={isMobile ? 100 : 150}
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
  const rewardsVolume: { token?: Token; volume?: Numberish; amount?: TokenAmount }[] =
    targetUserPositionAccount?.rewardInfos.map((info) => ({
      token: info.penddingReward?.token,
      volume: mul(info.penddingReward, tokenPrices[toPubString(info.penddingReward?.token.mint)]),
      amount: info.penddingReward
    })) ?? []
  const feesVolume: { token?: Token; volume?: Numberish; amount?: TokenAmount }[] = targetUserPositionAccount
    ? [
        {
          token: targetUserPositionAccount?.tokenFeeAmountA?.token,
          volume: mul(
            targetUserPositionAccount?.tokenFeeAmountA,
            tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountA?.token.mint)]
          ),
          amount: targetUserPositionAccount?.tokenFeeAmountA
        },
        {
          token: targetUserPositionAccount?.tokenFeeAmountB?.token,
          volume: mul(
            targetUserPositionAccount?.tokenFeeAmountB,
            tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountB?.token.mint)]
          ),
          amount: targetUserPositionAccount?.tokenFeeAmountB
        }
      ]
    : []
  const totalVolume = rewardsVolume
    .concat(feesVolume)
    .reduce((acc, { volume }) => (volume ? add(acc ?? toFraction(0), volume) : acc), undefined as Fraction | undefined)
  const isMobile = useAppSettings((s) => s.isMobile)
  const hasPendingReward = isMeaningfulNumber(totalVolume)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <Col className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
      <Row className="items-center gap-2">
        <div className="mobile:text-sm font-medium text-[#abc4ff]">Pending Yield</div>
      </Row>
      <Row className="items-center gap-8">
        <div className="font-medium text-2xl text-white">≈{toUsdVolume(totalVolume)}</div>
        <Button
          className="frosted-glass-teal"
          size={isMobile ? 'sm' : undefined}
          isLoading={isApprovePanelShown}
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

      <Grid className="grid-cols-2 gap-6 mobile:gap-2 border-1.5 border-[#abc4ff40] py-3 px-4 rounded-xl">
        <div>
          <div className="mobile:text-sm font-medium text-[#abc4ff] mt-2 mb-4">Fees</div>
          <Grid className="grow grid-cols-1 gap-2 mobile:gap-1">
            {feesVolume.map(({ token, amount }) => (
              <RowItem
                key={toPubString(token?.mint)}
                prefix={
                  <Row className="items-center gap-2">
                    <CoinAvatar token={token} size="smi" />
                    <div className="text-[#abc4ff80] min-w-[4em] mr-1">{token?.symbol ?? '--'}</div>
                  </Row>
                }
                text={<div className="text-white justify-end text-end">{toString(amount)}</div>}
              />
            ))}
          </Grid>
        </div>
        <div>
          <div className="mobile:text-sm font-medium text-[#abc4ff] mt-2 mb-4">Rewards</div>
          <Grid className="grow grid-cols-1 gap-2">
            {rewardsVolume.length ? (
              rewardsVolume.map(({ token, amount }) => (
                <RowItem
                  key={toPubString(token?.mint)}
                  prefix={
                    <Row className="items-center gap-2">
                      <CoinAvatar token={token} size="smi" />
                      <div className="text-[#abc4ff80] min-w-[4em] mr-1">{token?.symbol ?? '--'}</div>
                    </Row>
                  }
                  text={<div className="text-white justify-end text-end">{toString(amount)}</div>}
                />
              ))
            ) : (
              <div className="text-[#abc4ff80] mobile:text-sm ">(No Reward)</div>
            )}
          </Grid>
        </div>
      </Grid>
    </Col>
  )
}

function MyPositionCardAPRInfo({ className }: { className?: string }) {
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const aprCalc = useConcentratedPositionAprCalc({ positionAccount: targetUserPositionAccount })
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Col className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
      <Row className="items-center gap-2">
        <div className="mobile:text-sm font-medium text-[#abc4ff]">Estimated APR</div>
        <ConcentratedModifyTooltipIcon />
        <ConcentratedTimeBasisSwitcher className="ml-auto" />
      </Row>
      <div className="font-medium text-2xl mobile:text-lg text-white">{toPercentString(aprCalc?.apr)}</div>
      <Grid className="border-1.5 border-[#abc4ff40] py-3 px-4 rounded-xl">
        {targetUserPositionAccount && (
          <AprChart type="positionAccount" positionAccount={targetUserPositionAccount} colCount={isMobile ? 1 : 2} />
        )}
      </Grid>
    </Col>
  )
}

function MyPositionCardHeader({ className }: { className?: string }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Row className={twMerge('justify-between gap-2 flex-wrap', className)}>
      <Row className="items-center gap-2">
        <CoinAvatarPair token1={currentAmmPool?.base} token2={currentAmmPool?.quote} size={isMobile ? 'md' : 'lg'} />
        <div className="font-medium text-2xl mobile:text-xl text-white">
          {currentAmmPool?.base?.symbol ?? '--'} - {currentAmmPool?.quote?.symbol ?? '--'}
        </div>
        <RangeTag positionAccount={targetUserPositionAccount} />
      </Row>
      <Row className="items-center gap-2 mobile:grow">
        <Button
          className="frosted-glass-teal mobile:grow"
          onClick={() => {
            useConcentrated.setState({
              isAddDialogOpen: true,
              currentAmmPool,
              targetUserPositionAccount,
              coin1: currentAmmPool?.base,
              coin2: currentAmmPool?.quote
            })
          }}
          size={isMobile ? 'sm' : undefined}
        >
          Add Liquidity
        </Button>
        <Button
          className="frosted-glass-teal ghost mobile:grow"
          size={isMobile ? 'sm' : undefined}
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

export default function MyPositionDialog() {
  const open = useConcentrated((s) => s.isMyPositionDialogOpen)
  return (
    <ResponsiveDialogDrawer
      placement="from-bottom"
      open={open}
      onClose={() => {
        useConcentrated.setState({
          isMyPositionDialogOpen: false
        })
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className="p-8 mobile:p-4 pb-2 rounded-3xl mobile:rounded-lg w-[min(912px,90vw)] max-h-[80vh] overflow-auto mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
          size="lg"
        >
          <Row className="justify-between items-center gap-6 mobile:gap-3 mb-6 mobile:mb-3">
            <MyPositionCardHeader className="grow" />
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          <Grid className="gap-3 mobile:gap-2 grid-cols-2 mobile:grid-cols-1 w-[min(912px,100%)]">
            <MyPositionCardTopInfo className="col-span-full" />
            <MyPositionCardChartInfo className="col-span-1 row-span-2" />
            <MyPositionCardPendingRewardInfo />
            <MyPositionCardAPRInfo />
          </Grid>

          <MyPositionCardPoolOverview />
        </Card>
      )}
    </ResponsiveDialogDrawer>
  )
}

function MyPositionCardPoolOverview({ className }: { className?: string }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Collapse openDirection="upwards" className="w-full mt-4">
      <Collapse.Body>
        <div className="pb-4">
          <div className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4 ', className)}>
            <div className="font-medium text-[#abc4ff] mb-4">Pool Overview</div>
            <Grid className="grid-cols-5 mobile:grid-cols-2 gap-8 mobile:gap-4 mobile:text-sm">
              <ColItem
                className="gap-1 font-medium"
                prefix={<div className="text-[#abc4ff80] min-w-[4em] mr-1">Fee Rate</div>}
                text={<div className="text-white">{toPercentString(currentAmmPool?.tradeFeeRate)}</div>}
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
                prefix={<div className="text-[#abc4ff80] min-w-[4em] mr-1">24h Fee</div>}
                text={<div className="text-white">{toUsdVolume(currentAmmPool?.volumeFee24h)}</div>}
              />
              <ColItem
                className="gap-1 font-medium"
                prefix={<div className="text-[#abc4ff80] min-w-[4em] mr-1">Tick Spacing</div>}
                text={<div className="text-white">{currentAmmPool?.ammConfig.tickSpacing}</div>}
              />
              {/* <ColItem
                className="gap-1 font-medium col-span-2"
                prefix={
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">
                    Weekly Rewards {currentAmmPool?.base?.symbol ?? 'base'}
                  </div>
                }
                text={
                  <Row className="items-center gap-2">
                    <CoinAvatar token={currentAmmPool?.base} size="smi" />
                    <div className="text-white">
                      {toString(
                        currentAmmPool?.[
                          timeBasis === TimeBasis.DAY ? 'fee24hA' : timeBasis === TimeBasis.WEEK ? 'fee7dA' : 'fee30dA'
                        ],
                        { decimalLength: currentAmmPool?.base?.decimals }
                      )}
                    </div>
                    <div className="text-[#abc4ff80]">
                      {toUsdVolume(
                        mul(
                          currentAmmPool?.[
                            timeBasis === TimeBasis.DAY
                              ? 'fee24hA'
                              : timeBasis === TimeBasis.WEEK
                              ? 'fee7dA'
                              : 'fee30dA'
                          ],
                          basePrice
                        )
                      )}
                    </div>
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
                text={
                  <Row className="items-center gap-2">
                    <CoinAvatar token={currentAmmPool?.quote} size="smi" />
                    <div className="text-white">
                      {toString(
                        currentAmmPool?.[
                          timeBasis === TimeBasis.DAY ? 'fee24hB' : timeBasis === TimeBasis.WEEK ? 'fee7dB' : 'fee30dB'
                        ],
                        { decimalLength: currentAmmPool?.quote?.decimals }
                      )}
                    </div>
                    <div className="text-[#abc4ff80]">
                      {toUsdVolume(
                        mul(
                          currentAmmPool?.[
                            timeBasis === TimeBasis.DAY
                              ? 'fee24hB'
                              : timeBasis === TimeBasis.WEEK
                              ? 'fee7dB'
                              : 'fee30dB'
                          ],
                          quotePrice
                        )
                      )}
                    </div>
                  </Row>
                }
              />*/}
            </Grid>
          </div>
        </div>
      </Collapse.Body>
      <Collapse.Face>
        {(open) => (
          <Row className="border-t-1.5 pt-5 mobile:pt-3 border-[#abc4ff40] w-full items-center justify-center text-sm font-medium text-[#abc4ff] cursor-pointer select-none">
            <div>Pool Overview</div>
            <Icon size={isMobile ? 'xs' : 'sm'} heroIconName={open ? 'chevron-up' : 'chevron-down'} className="ml-1" />
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
      <div className="mobile:text-2xs font-normal" style={{ marginLeft: 4 }}>
        In Range
      </div>
    </Row>
  ) : (
    <Row className="items-center bg-[#DA2EEF]/10 rounded text-xs text-[#DA2EEF] py-0.5 px-1 ml-2">
      <Icon size="xs" iconSrc={'/icons/warn-stick.svg'} />
      <div className="mobile:text-2xs font-normal" style={{ marginLeft: 4 }}>
        Out of Range
      </div>
    </Row>
  )
}
