import { UserPositionAccount } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConcentratedAmmSelector from '@/application/concentrated/useConcentratedAmmSelector'
import useConcentratedAmountCalculator from '@/application/concentrated/useConcentratedAmountCalculator'
import { routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import { AddressItem } from '@/components/AddressItem'
import { Badge } from '@/components/Badge'
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
import { mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { twMerge } from 'tailwind-merge'

export default function MyPosition() {
  return (
    <>
      <MyPositionEffect />
      <PageLayout mobileBarTitle="Concentrated" metaTitle="Concentrated - Raydium">
        <MyPositionPageHead />
        <MyPositionCard />
      </PageLayout>
    </>
  )
}

function MyPositionEffect() {
  useConcentratedAmmSelector()
  useConcentratedAmountCalculator()
  return null
}

// const availableTabValues = ['Swap', 'Liquidity'] as const
function MyPositionPageHead() {
  return <Row className="w-[min(912px,100%)] self-center mb-10 mobile:mb-2 font-medium text-2xl">My Position</Row>
}

function MyPositionCardTopInfo({ className }: { className?: string }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  return (
    <Row className={twMerge('bg-[#141041] grid-cols-4 py-3 px-4 rounded-xl gap-8', className)}>
      <Grid className="grid-rows-[2em,1fr] items-center grow">
        <div className="font-medium text-[#abc4ff] h-8">Liquidity</div>
        <div className="font-medium text-2xl text-white">
          {toUsdVolume(targetUserPositionAccount?.amountLiquidityValue)}
        </div>
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
            text={
              <div className="text-white justify-end">
                {toUsdVolume(
                  mul(targetUserPositionAccount?.amountLiquidityValue, targetUserPositionAccount?.positionPercentA)
                )}
              </div>
            }
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
            text={
              <div className="text-white">
                {toUsdVolume(
                  mul(targetUserPositionAccount?.amountLiquidityValue, targetUserPositionAccount?.positionPercentB)
                )}
              </div>
            }
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
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  return (
    <Col className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
      <Row className="items-center gap-2">
        <div className="font-medium text-[#abc4ff]">My position</div>
        <RangeTag positionAccount={targetUserPositionAccount} />
      </Row>
      <Grid className="items-center text-2xl text-white">0.01 - 0.02</Grid>
      <div className="font-medium text-[#abc4ff]">
        {currentAmmPool?.base?.symbol ?? '--'} per {currentAmmPool?.quote?.symbol ?? '--'}
      </div>
      <div className="items-center grow">
        <div className="h-full bg-[#abc4ff] rounded"></div>
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
  const tokenPrices = useToken((s) => s.tokenPrices)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  return (
    <Col className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
      <Row className="items-center gap-2">
        <div className="font-medium text-[#abc4ff]">Pending Yield</div>
      </Row>
      <Row className="items-center gap-4">
        <div className="font-medium text-2xl text-white">
          {/* Temp Dev */}
          {toUsdVolume(targetUserPositionAccount?.amountLiquidityValue)}
        </div>
        <Button
          className="frosted-glass-teal"
          onClick={() => {
            routeTo('/liquidity/my-position') // TEMP
          }}
        >
          Harvest
        </Button>
      </Row>

      <Grid className="grid-cols-2 border-1.5 border-[#abc4ff40] py-3 px-4 gap-2 rounded-xl">
        <div>
          <div className="font-medium text-[#abc4ff] mt-2 mb-4">Rewards</div>
          <Grid className="grow grid-cols-1 gap-2">
            <RowItem
              prefix={
                <Row className="items-center gap-2">
                  <CoinAvatar token={currentAmmPool?.base} size="smi" />
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.base?.symbol ?? '--'}</div>
                </Row>
              }
              text={
                <div className="text-white justify-end">
                  {toUsdVolume(
                    mul(
                      targetUserPositionAccount?.tokenFeeAmountA,
                      tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountA?.token.mint)]
                    )
                  )}
                </div>
              }
            />
            <RowItem
              prefix={
                <Row className="items-center gap-2">
                  <CoinAvatar token={currentAmmPool?.quote} size="smi" />
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.quote?.symbol ?? '--'}</div>
                </Row>
              }
              text={
                <div className="text-white justify-end">
                  {toUsdVolume(
                    mul(
                      targetUserPositionAccount?.tokenFeeAmountB,
                      tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountB?.token.mint)]
                    )
                  )}
                </div>
              }
            />
          </Grid>
        </div>
        <div>
          <div className="font-medium text-[#abc4ff] mt-2 mb-4">Fees</div>
          <Grid className="grow grid-cols-1 gap-2">
            <RowItem
              prefix={
                <Row className="items-center gap-2">
                  <CoinAvatar token={currentAmmPool?.base} size="smi" />
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.base?.symbol ?? '--'}</div>
                </Row>
              }
              text={
                <div className="text-white justify-end">
                  {toUsdVolume(
                    mul(
                      targetUserPositionAccount?.tokenFeeAmountA,
                      tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountA?.token.mint)]
                    )
                  )}
                </div>
              }
            />
            <RowItem
              prefix={
                <Row className="items-center gap-2">
                  <CoinAvatar token={currentAmmPool?.quote} size="smi" />
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.quote?.symbol ?? '--'}</div>
                </Row>
              }
              text={
                <div className="text-white justify-end">
                  {toUsdVolume(
                    mul(
                      targetUserPositionAccount?.tokenFeeAmountB,
                      tokenPrices[toPubString(targetUserPositionAccount?.tokenFeeAmountB?.token.mint)]
                    )
                  )}
                </div>
              }
            />
          </Grid>
        </div>
      </Grid>
    </Col>
  )
}

function MyPositionCardAPRInfo({ className }: { className?: string }) {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  return (
    <Col className={twMerge('bg-[#141041] py-3 px-4 rounded-xl gap-4', className)}>
      <Row className="items-center gap-2">
        <div className="font-medium text-[#abc4ff]">Estimated APR</div>
      </Row>
      <Row className="items-center gap-4">
        <div className="font-medium text-2xl text-white">{toPercentString(currentAmmPool?.apr30d)}</div>
      </Row>
      <Grid className="grid-cols-1 border-1.5 border-[#abc4ff40] py-3 px-4 gap-2 rounded-xl">
        <div className="font-medium text-[#abc4ff] mt-2 mb-4">Yield</div>
        <Grid className="grow grid-cols-2 gap-2">
          <RowItem
            prefix={
              <Row className="items-center gap-2">
                <Icon iconSrc="/icons/entry-icon-trade.svg" size="md" className="scale-75 " />
                <div className="text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.base?.symbol ?? '--'}</div>
              </Row>
            }
            text={<div className="text-white justify-end">{toPercentString(currentAmmPool?.feeApr30d)}</div>}
          />
          <RowItem
            prefix={
              <Row className="items-center gap-2">
                <CoinAvatar token={currentAmmPool?.base} size="smi" />
                <div className="text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.base?.symbol ?? '--'}</div>
              </Row>
            }
            text={<div className="text-white justify-end">{toPercentString(currentAmmPool?.apr30d)}</div>} // TEMP
          />
          <RowItem
            prefix={
              <Row className="items-center gap-2">
                <CoinAvatar token={currentAmmPool?.quote} size="smi" />
                <div className="text-[#abc4ff80] min-w-[4em] mr-1">{currentAmmPool?.quote?.symbol ?? '--'}</div>
              </Row>
            }
            text={<div className="text-white justify-end">{toPercentString(currentAmmPool?.apr30d)}</div>} // TEMP
          />
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
        <Button className="frosted-glass-teal">Add Liquidity</Button>
        <Button className="frosted-glass-teal ghost">Remove Liquidity</Button>
      </Row>
    </Row>
  )
}

function MyPositionCard() {
  return (
    <CyberpunkStyleCard
      wrapperClassName="w-[min(912px,100%)] self-center cyberpunk-bg-light"
      className="py-5 px-6 mobile:py-5 mobile:px-3"
    >
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
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
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
                text={<div className="text-white">{toPercentString(currentAmmPool?.fee30d)}</div>}
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
                className="gap-1 font-medium"
                prefix={
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">
                    Weekly Rewards {currentAmmPool?.base?.symbol ?? 'base'}
                  </div>
                }
                text={
                  <Row className="items-center gap-2">
                    <CoinAvatar token={currentAmmPool?.base} size="smi" />
                    <div className="text-white">🚧amount</div>
                    <div className="text-[#abc4ff80]">🚧usd</div>
                  </Row>
                }
              />
              <ColItem
                className="gap-1 font-medium"
                prefix={
                  <div className="text-[#abc4ff80] min-w-[4em] mr-1">
                    Weekly Rewards {currentAmmPool?.quote?.symbol ?? 'quote'}
                  </div>
                }
                text={
                  <Row className="items-center gap-2">
                    <CoinAvatar token={currentAmmPool?.quote} size="smi" />
                    <div className="text-white">🚧amount</div>
                    <div className="text-[#abc4ff80]">🚧usd</div>
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
