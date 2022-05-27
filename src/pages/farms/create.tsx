import useAppSettings from '@/application/appSettings/useAppSettings'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { routeTo } from '@/application/routeTools'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Col from '@/components/Col'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import FadeInStable, { FadeIn } from '@/components/FadeIn'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Link from '@/components/Link'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { currentIsBefore, isDateBefore } from '@/functions/date/judges'
import { listToJSMap } from '@/functions/format/listToMap'
import produce from 'immer'
import { ReactNode, useState } from 'react'
import { RewardFormCardInputs } from '../../pageComponents/createFarm/RewardFormCardInputs'
import { PoolIdInputBlock } from '../../pageComponents/createFarm/PoolIdInputBlock'
import { RewardSummery } from '../../pageComponents/createFarm/RewardCreateSummary'
import toPubString from '@/functions/format/toMintString'
import { RAYMint } from '@/application/token/utils/wellknownToken.config'

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

function RewardFormCard({ children }: { children?: ReactNode }) {
  return (
    <Card className="p-4 mobile:px-2 bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)]" size="lg">
      {children}
    </Card>
  )
}

export default function CreateFarmPage() {
  const poolId = useCreateFarms((s) => s.poolId)
  const rewards = useCreateFarms((s) => s.rewards)
  const connected = useWallet((s) => s.connected)
  const [activeIndex, setActiveIndex] = useState(0)
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className={`self-center transition-all duration-500 w-[min(720px,70vw)] mobile:w-[90vw]`}>
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

        <WarningBoard className="pb-16 w-full" />

        <div className="space-y-4">
          <FormStep stepNumber={1} title="Select Pool" haveNavline>
            <PoolIdInputBlock />
          </FormStep>

          <FormStep
            stepNumber={2}
            title={
              <>
                <div className="font-medium text-lg text-white leading-8 mb-1">Farming Reward</div>
                <div className="font-medium text-sm leading-snug text-[#abc4ff80]">
                  <span className="text-[#DA2EEF]">Please note:</span> All rewards provided are final and unused rewards
                  cannot be recovered. You will be able to add more rewards to the farm.
                </div>
              </>
            }
          >
            <div className="mb-8">
              <RewardSummery mode="selectable" activeIndex={activeIndex} onActiveIndexChange={setActiveIndex} />
            </div>
            <Grid className="grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-8">
              <FadeIn>
                {rewards[activeIndex] && (
                  <RewardFormCard>
                    <RewardFormCardInputs rewardIndex={activeIndex} />
                  </RewardFormCard>
                )}
              </FadeIn>
            </Grid>
            <Button
              type="text"
              disabled={rewards.length >= 5}
              onClick={() => {
                useCreateFarms.setState({
                  rewards: produce(rewards, (draft) => {
                    draft.push({ canEdit: true })
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

        <Button
          className="frosted-glass-teal ml-12 "
          size="lg"
          onClick={() => {
            routeTo('/farms/createReview')
          }}
          // validators={[
          //   {
          //     should: poolId,
          //     fallbackProps: {
          //       children: 'Select pool' // NOTE: should ask manager about the text content
          //     }
          //   },
          //   {
          //     should: rewards.every((r) => r.token),
          //     fallbackProps: {
          //       children: 'Choose reward token' // NOTE: should ask manager about the text content
          //     }
          //   },
          //   {
          //     should: rewards.every((r) => r.amount),
          //     fallbackProps: {
          //       children: 'Input reward amount' // NOTE: should ask manager about the text content
          //     }
          //   },
          //   {
          //     should: rewards.every((r) => r.startTime && r.endTime),
          //     fallbackProps: {
          //       children: 'Set StartTime and EndTime' // NOTE: should ask manager about the text content
          //     }
          //   },
          //   {
          //     should: rewards.every((r) => r.startTime && r.endTime && isDateBefore(r.startTime, r.endTime)),
          //     fallbackProps: {
          //       children: 'StartTime must before EndTime' // NOTE: should ask manager about the text content
          //     }
          //   },
          //   {
          //     should: connected,
          //     forceActive: true,
          //     fallbackProps: {
          //       onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
          //       children: 'Connect Wallet'
          //     }
          //   }
          // ]}
        >
          Review Farm
        </Button>
      </div>
    </PageLayout>
  )
}
