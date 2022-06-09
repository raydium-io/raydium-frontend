import useCreateFarms, { cleanStoreEmptyRewards } from '@/application/createFarm/useCreateFarm'
import { routeTo } from '@/application/routeTools'
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
import produce from 'immer'
import { ReactNode, useRef, useState } from 'react'
import { PoolIdInputBlock, PoolIdInputBlockHandle } from '../../pageComponents/createFarm/PoolIdInputBlock'
import { createNewUIRewardInfo } from '@/application/createFarm/parseRewardInfo'
import { offsetDateTime, toUTC } from '@/functions/date/dateFormat'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import useConnection from '@/application/connection/useConnection'
import { NewRewardIndicatorAndForm } from '../../pageComponents/createFarm/NewRewardIndicatorAndForm'
import { isDateBefore } from '@/functions/date/judges'
import useAppSettings from '@/application/appSettings/useAppSettings'
import { gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { div } from '@/functions/numberish/operations'
import useWallet from '@/application/wallet/useWallet'
import toPubString from '@/functions/format/toMintString'

// unless ido have move this component, it can't be renamed or move to /components
function StepBadge(props: { n: number }) {
  return (
    <CyberpunkStyleCard wrapperClassName="w-8 h-8" className="grid place-content-center bg-[#2f2c78]">
      <div className="font-semibold text-white">{props.n}</div>
    </CyberpunkStyleCard>
  )
}

function WarningBoard({ className }: { className: string }) {
  const [needWarning, setNeedWarning] = useState(true)
  return (
    <FadeInStable show={needWarning}>
      <Row className={className}>
        <Icon iconSrc="/icons/create-farm-exclamation-circle.svg" className="my-4" iconClassName="w-8 h-8" />
        <Card className={`p-6 grow mx-4 my-2 rounded-3xl ring-1 ring-inset ring-[#DA2EEF] bg-[#1B1659]`}>
          <div className="font-medium text-base text-white mb-3">This tool is for advanced users!</div>

          <div className="font-medium text-sm text-[#ABC4FF80] mb-4">
            Before attempting to create a new farm, we suggest going through the detailed guide.
          </div>

          <Row className="gap-4">
            <Link href="https://raydium.gitbook.io/raydium/exchange-trade-and-swap/raydium-farms">
              <Button className="frosted-glass-teal px-8">Detail Guide</Button>
            </Link>

            <Button
              className="text-[#ABC4FF80]"
              type="outline"
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
  return (
    <Grid className="grid-cols-[auto,1fr] gap-4">
      <Col className="items-center">
        <StepBadge n={stepNumber} />
        <div className={`grow my-4 border-r-1.5 ${haveNavline ? 'border-[#abc4ff1a]' : 'border-transparent'} `} />
      </Col>
      <Col className="grow">
        <div className="font-medium text-lg text-white leading-8 ml-3 mb-5">{title}</div>
        <Grid className="mb-16">{children}</Grid>
      </Col>
    </Grid>
  )
}

export function RewardFormCard({ children }: { children?: ReactNode }) {
  return (
    <Card className="p-4 mobile:px-2 bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)]" size="lg">
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
  const balances = useWallet((s) => s.balances)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)

  const PoolIdInputBlockRef = useRef<PoolIdInputBlockHandle>()

  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className={`self-center transition-all duration-500 w-[min(720px,70vw)] mobile:w-[90vw]`}>
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

        <WarningBoard className="pb-16 w-full" />

        <div className="space-y-4">
          <FormStep stepNumber={1} title="Select Pool" haveNavline>
            <PoolIdInputBlock componentRef={PoolIdInputBlockRef} />
          </FormStep>

          <FormStep
            stepNumber={2}
            title={
              <>
                <div className="font-medium text-lg text-white leading-8 mb-1">Farming Reward</div>
                <Row className="text-sm">
                  <div className="text-[#abc4ff] mr-2">Date on block chain: </div>
                  <TimeClock className="text-[#abc4ff80]" offset={chainTimeOffset} />
                </Row>
                <div className="font-medium text-sm leading-snug text-[#abc4ff80]">
                  It's on-chain time, so there could be slightly delay depending on the network status of Solana
                </div>
              </>
            }
          >
            <NewRewardIndicatorAndForm />
            <Button
              type="text"
              disabled={rewards.length >= 5}
              onClick={() => {
                useCreateFarms.setState({
                  rewards: produce(rewards, (draft) => {
                    draft.push(createNewUIRewardInfo())
                  })
                })
              }}
            >
              <Row className="items-center">
                <Icon className="text-[#abc4ff]" heroIconName="plus-circle" size="sm" />
                <div className="ml-1.5 text-[#abc4ff] font-medium">Add another reward token</div>
                <div className="ml-1.5 text-[#abc4ff80] font-medium">({5 - rewards.length} more)</div>
              </Row>
            </Button>
          </FormStep>
        </div>

        <Col className="items-center ml-12">
          <div className="font-medium text-sm text-justify leading-snug text-[#abc4ff80] mb-8">
            <span className="text-[#DA2EEF]">Please note:</span> All rewards provided are final and unused rewards
            cannot be recovered. You will be able to add more rewards to the farm. When creating 'Ecosystem' farm, you
            should pay 300 RAY as creation fee, which will flow into our Raydium treasury. Adding reward tokens and add
            more reward tokens should have a duration period of at least 7 days and no more than 90 days.
          </div>

          <Button
            className="frosted-glass-teal"
            size="lg"
            validators={[
              {
                should: meaningFullRewards.length > 0
              },
              {
                should: poolId,
                fallbackProps: {
                  onClick: () => {
                    PoolIdInputBlockRef.current?.validate?.()
                  }
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
              ...meaningFullRewards.map((reward) => {
                const haveBalance = gte(balances[toPubString(reward.token?.mint)], reward.amount)
                return {
                  should: haveBalance,
                  fallbackProps: {
                    children: `Insufficient ${reward.token?.symbol} balance`
                  }
                }
              }),
              {
                should: meaningFullRewards.every((r) => r),
                fallbackProps: {
                  children: 'Insufficient'
                }
              },
              {
                should: meaningFullRewards.every((r) => r.startTime && r.endTime),
                fallbackProps: {
                  children: 'Confirm emission time setup'
                }
              },
              {
                should: meaningFullRewards.every((r) => isMeaningfulNumber(r.amount)),
                fallbackProps: {
                  children: 'not eligible token amount'
                }
              },
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
                  children: 'not eligible token amount'
                }
              }
            ]}
            onClick={() => {
              routeTo('/farms/createReview', {})?.then(() => {
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

function TimeClock({ offset, className }: { /* different of current date */ offset?: number; className?: string }) {
  useForceUpdate({ loop: 1000 * 15 })
  return <div className={className}>{toUTC(offsetDateTime(Date.now(), { milliseconds: offset }))}</div>
}
