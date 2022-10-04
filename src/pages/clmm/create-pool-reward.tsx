import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import produce from 'immer'
import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import { createNewUIRewardInfo } from '@/application/createFarm/parseRewardInfo'
import useCreateFarms, { cleanStoreEmptyRewards } from '@/application/createFarm/useCreateFarm'
import { MAX_DURATION, MIN_DURATION } from '@/application/farms/handleFarmInfo'
import { routeBack, routeTo } from '@/application/routeTools'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Col from '@/components/Col'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import FadeInStable from '@/components/FadeIn'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Link from '@/components/Link'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { offsetDateTime, toUTC } from '@/functions/date/dateFormat'
import { isDateAfter } from '@/functions/date/judges'
import { getDuration, parseDurationAbsolute } from '@/functions/date/parseDuration'
import { gte, isMeaningfulNumber, lte } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import { useChainDate } from '../../hooks/useChainDate'
import { NewRewardIndicatorAndForm } from '../../pageComponents/createFarm/NewRewardIndicatorAndForm'
import { PoolIdInputBlock, PoolIdInputBlockHandle } from '../../pageComponents/createFarm/PoolIdInputBlock'
import { PoolSelectCard } from '@/pageComponents/createConcentratedPool/PoolSelectCard'
import { PoolRewardsInput } from '@/pageComponents/createConcentratedPool/PoolRewardsInput'

// unless ido have move this component, it can't be renamed or move to /components
function StepBadge(props: { n: number }) {
  return (
    <CyberpunkStyleCard
      wrapperClassName="w-8 h-8 mobile:w-6 mobile:h-6 flex-none"
      className="grid place-content-center bg-[#2f2c78]"
    >
      <div className="font-semibold text-white mobile:text-xs">{props.n}</div>
    </CyberpunkStyleCard>
  )
}

function NavButtons({ className }: { className?: string }) {
  return (
    <Row className={twMerge('items-center justify-between', className)}>
      <Button
        type="text"
        className="text-sm text-[#ABC4FF] opacity-50 px-0"
        prefix={<Icon heroIconName="chevron-left" size="sm" />}
        onClick={() => {
          if (window.history.length === 1) {
            // user jump directly into /farms/create page by clicking a link, we "goback" to /farms
            routeTo('/clmm/pools')
          } else {
            routeBack()
          }
        }}
      >
        Back to Concentrated pools
      </Button>
    </Row>
  )
}

function WarningBoard({ className }: { className: string }) {
  const [needWarning, setNeedWarning] = useState(true)
  const isMoblie = useAppSettings((s) => s.isMobile)
  const detailedGuideHref = 'https://raydium.gitbook.io/raydium/exchange-trade-and-swap/creating-an-ecosystem-farm'
  return (
    <FadeInStable show={needWarning}>
      <Row className={className}>
        {!isMoblie && (
          <Icon iconSrc="/icons/create-farm-exclamation-circle.svg" className="my-4" iconClassName="w-8 h-8" />
        )}
        <Card
          className={`p-6 mobile:p-4 grow mx-4 mobile:mx-0 my-2 rounded-3xl mobile:rounded-2xl ring-1 ring-inset ring-[#DA2EEF] bg-[#1B1659]`}
        >
          <div className="mobile:text-sm font-medium text-base text-white mb-3">This tool is for advanced users!</div>

          <div className="font-medium text-sm mobile:text-xs text-[#ABC4FF80] mb-4">
            Before attempting to create a new farm, we suggest going through the detailed guide.
          </div>

          <Row className="gap-4">
            <Link href={detailedGuideHref}>
              <Button className="frosted-glass-teal px-8" size={isMoblie ? 'sm' : 'md'}>
                Detailed Guide
              </Button>
            </Link>

            <Button
              className="text-[#ABC4FF80] mobile:px-4"
              type="outline"
              size={isMoblie ? 'sm' : 'md'}
              onClick={() => {
                setNeedWarning(false)
              }}
            >
              Dismiss
            </Button>
          </Row>
        </Card>
      </Row>
    </FadeInStable>
  )
}

function FormStep({
  stepNumber,
  title,
  haveNavline,
  children
}: {
  stepNumber: number
  title: ReactNode
  haveNavline?: boolean
  children: ReactNode
}) {
  const isMoblie = useAppSettings((s) => s.isMobile)
  return isMoblie ? (
    <Grid className="grid-cols-[1fr] gap-4">
      <Row className="items-center gap-3">
        <StepBadge n={stepNumber} />
        <div className="grow">{title}</div>
      </Row>
      <Col className="grow">
        <Grid className="mb-10">{children}</Grid>
      </Col>
    </Grid>
  ) : (
    <Grid className="grid-cols-[auto,1fr] gap-4">
      <Col className="items-center">
        <StepBadge n={stepNumber} />
        <div className={`grow my-4 border-r-1.5 ${haveNavline ? 'border-[#abc4ff1a]' : 'border-transparent'} `} />
      </Col>
      <Col className="grow">
        <div className="ml-3 mb-5">{title}</div>
        <Grid className="mb-16">{children}</Grid>
      </Col>
    </Grid>
  )
}

export function RewardFormCard({ children }: { children?: ReactNode }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Card
      className={`p-4 mobile:p-3 bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)] ${
        isMobile ? 'rounded-2xl' : 'rounded-3xl'
      }`}
      size="lg"
    >
      {children}
    </Card>
  )
}

export default function CreateFarmPage() {
  const rewards = useCreateFarms((s) => s.rewards)
  const meaningFullRewards = rewards.filter(
    (r) => r.amount != null || r.startTime != null || r.endTime != null || r.token != null
  )
  const poolId = useCreateFarms((s) => s.poolId)
  const getBalance = useWallet((s) => s.getBalance)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const walletConnected = useWallet((s) => s.connected)
  const isMoblie = useAppSettings((s) => s.isMobile)

  const PoolIdInputBlockRef = useRef<PoolIdInputBlockHandle>()

  useEffect(() => {
    if (rewards.length <= 0) {
      useCreateFarms.setState({
        rewards: produce(rewards, (draft) => {
          draft.push(createNewUIRewardInfo())
        })
      })
    }
  }, [])

  const chainDate = useChainDate()
  // avoid input re-render if chain Date change
  const cachedInputs = useMemo(() => <NewRewardIndicatorAndForm />, [])
  const [poolIdValid, setPoolIdValid] = useState(false)
  return (
    <PageLayout metaTitle="Farms - Raydium" mobileBarTitle="Create Farm">
      <NavButtons className="mb-8 mobile:mb-2 sticky z-10 top-0 mobile:-translate-y-2 mobile:bg-[#0f0b2f]" />

      <div className={`pb-10 self-center transition-all duration-500 w-[min(840px,70vw)] mobile:w-[90vw] z-20`}>
        {!isMoblie && (
          <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Pool</div>
        )}

        <WarningBoard className="pb-16 mobile:pb-10 w-full" />

        <div className="space-y-4">
          <FormStep
            stepNumber={1}
            title={
              <Row className="justify-between items-center">
                <div className="font-medium text-lg mobile:text-base text-white leading-8">
                  Create New Concentrated Pool
                </div>
                {/* <Row
                  className={`justify-self-end  mobile:justify-self-auto gap-1 flex-wrap items-center opacity-100 pointer-events-auto clickable transition`}
                  onClick={() => {
                    routeTo('/liquidity/create')
                  }}
                >
                  <Icon heroIconName="plus-circle" className="text-[#abc4ff]" size="sm" />
                  <span className="text-[#abc4ff] font-medium text-sm mobile:text-xs">Create Pool</span>
                </Row> */}
              </Row>
            }
            haveNavline
          >
            <PoolSelectCard />
          </FormStep>

          <FormStep
            stepNumber={2}
            title={<div className="font-medium text-lg mobile:text-base text-white leading-8 mb-1">Add Liquidity</div>}
            haveNavline
          >
            <div className="bg-[#abc4ff80] rounded-3xl h-32 p-4">😂🚧🚧</div>
          </FormStep>

          <FormStep
            stepNumber={3}
            title={
              <>
                <div className="font-medium text-lg mobile:text-base text-white leading-8 mb-1">Rewards</div>
                <div className="font-medium text-sm mobile:text-xs text-justify leading-snug text-[#abc4ff80] mb-8">
                  <span className="text-[#DA2EEF]">Please note: </span>Rewards allocated to farms are final and unused
                  rewards cannot be claimed. However, you can add additional rewards to the farm. 300 RAY is collected
                  as an Ecosystem farm creation fee, which will be deposited into the Raydium treasury. Token rewards
                  should have a minimum duration period of at least 7 days and last no more than 90 days.
                </div>
              </>
            }
          >
            <PoolRewardsInput />
          </FormStep>
        </div>

        <Col className="items-center ml-12 mobile:ml-0">
          <Button
            className="frosted-glass-teal mobile:w-full"
            size={isMoblie ? 'sm' : 'lg'}
            validators={[
              {
                should: meaningFullRewards.length > 0
              },
              {
                should: poolId,
                fallbackProps: {
                  onClick: () => {
                    PoolIdInputBlockRef.current?.validate?.()
                  },
                  children: 'Select a pool'
                }
              },
              { should: poolIdValid, fallbackProps: { children: 'Insufficient pool id' } },
              {
                should: walletConnected,
                forceActive: true,
                fallbackProps: {
                  onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                  children: 'Connect wallet'
                }
              },
              {
                should: meaningFullRewards.every((r) => r.token),
                fallbackProps: {
                  children: 'Confirm reward token'
                }
              },
              ...meaningFullRewards.map((reward) => ({
                should: reward.amount,
                fallbackProps: {
                  children: `Enter ${reward.token?.symbol ?? '--'} token amount`
                }
              })),
              ...meaningFullRewards.map((reward) => ({
                should: isMeaningfulNumber(reward.amount),
                fallbackProps: {
                  children: `Insufficient ${reward.token?.symbol ?? '--'} token amount`
                }
              })),
              ...meaningFullRewards.map((reward) => {
                const haveBalance = gte(getBalance(reward.token), reward.amount)
                return {
                  should: haveBalance,
                  fallbackProps: {
                    children: `Insufficient ${reward.token?.symbol} balance`
                  }
                }
              }),
              {
                should: meaningFullRewards.every((r) => r.startTime && r.endTime),
                fallbackProps: {
                  children: 'Confirm emission time setup'
                }
              },
              {
                should: meaningFullRewards.every((r) => r.startTime && isDateAfter(r.startTime, chainDate)),
                fallbackProps: {
                  children: 'Insufficient start time'
                }
              },
              {
                should: meaningFullRewards.every((r) => {
                  const duration = getDuration(r.endTime!, r.startTime!)
                  return gte(duration, MIN_DURATION) && lte(duration, MAX_DURATION)
                }),
                fallbackProps: {
                  children: 'Insufficient duration'
                }
              },
              ...meaningFullRewards.map((reward) => {
                const minBoundary =
                  reward.endTime && reward.startTime && reward.token
                    ? div(getDuration(reward.endTime, reward.startTime) / 1000, 10 ** reward.token.decimals)
                    : undefined
                return {
                  should: gte(reward.amount, minBoundary),
                  fallbackProps: {
                    children: `Emission rewards is lower than min required`
                  }
                }
              }),
              {
                should: meaningFullRewards.every((reward) => {
                  const durationTime =
                    reward?.endTime && reward.startTime
                      ? reward.endTime.getTime() - reward.startTime.getTime()
                      : undefined
                  const estimatedValue =
                    reward?.amount && durationTime
                      ? div(reward.amount, parseDurationAbsolute(durationTime).days)
                      : undefined
                  return isMeaningfulNumber(estimatedValue)
                }),
                fallbackProps: {
                  children: 'Insufficient estimated value'
                }
              }
            ]}
            onClick={() => {
              useCreateFarms.setState({
                isRoutedByCreateOrEdit: true
              })
              routeTo('/farms/create-review', {})?.then(() => {
                cleanStoreEmptyRewards()
              })
            }}
          >
            Review Farm
          </Button>
        </Col>
      </div>
    </PageLayout>
  )
}
