import useAppSettings from '@/application/appSettings/useAppSettings'
import useCreateFarms, { CreateFarmStore } from '@/application/createFarm/useCreateFarm'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import AutoComplete from '@/components/AutoComplete'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import Col from '@/components/Col'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import DateInput from '@/components/DateInput'
import FadeInStable from '@/components/FadeIn'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import InputBox from '@/components/InputBox'
import Link from '@/components/Link'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { offsetDateTime } from '@/functions/date/dateFormat'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { div, mul } from '@/functions/numberish/operations'
import { trimTailingZero } from '@/functions/numberish/stringNumber'
import { toString } from '@/functions/numberish/toString'
import produce from 'immer'
import { ReactNode, useState } from 'react'

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
        <Icon iconSrc="/icons/create-farm-exclamation-circle.svg" className="my-4" iconClassName="w-12 h-12" />
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

function SearchBlock() {
  const poolId = useCreateFarms((s) => s.poolId)
  const liquidityPools = useLiquidity((s) => s.jsonInfos)
  const tokens = useToken((s) => s.tokens)

  return (
    <AutoComplete
      candidates={liquidityPools
        .filter((p) => tokens[p.baseMint] && tokens[p.quoteMint])
        .map((pool) => ({
          ...pool,
          label: `${tokens[pool.baseMint]?.symbol}-${tokens[pool.quoteMint]?.symbol}`
        }))}
      renderCandidateItem={(i) => (
        <Row className="py-3 items-center gap-2">
          <CoinAvatarPair token1={tokens[i.baseMint]} token2={tokens[i.quoteMint]} />
          <div className="text-[#abc4ff] font-medium">
            {tokens[i.baseMint]?.symbol}-{tokens[i.quoteMint]?.symbol}
          </div>
          <AddressItem showDigitCount={8} className="text-[#abc4ff80] text-xs ml-auto">
            {i.id}
          </AddressItem>
        </Row>
      )}
      value={poolId}
      className="p-4 py-3 gap-2 bg-[#141041] rounded-xl min-w-[7em]"
      inputClassName="font-medium mobile:text-xs text-[#abc4ff] placeholder-[#abc4Ff80]"
      suffix={<Icon heroIconName="search" className="text-[rgba(196,214,255,0.5)]" />}
      placeholder="Search for a pool or paste AMM ID"
      onUserInput={(searchText) => {
        // useFarms.setState({ searchText })
        useCreateFarms.setState({ poolId: searchText })
      }}
    />
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

function RewardSettingsCard({
  reward,
  idx,
  rewards
}: {
  reward: CreateFarmStore['rewards'][number]
  idx: number
  rewards: CreateFarmStore['rewards']
}) {
  const durationDays = reward.endTime
    ? parseDurationAbsolute(reward.endTime.getTime() - (reward.startTime?.getTime() ?? Date.now())).days
    : undefined

  const estimatedValue = reward.amount && durationDays ? div(reward.amount, durationDays) : undefined
  return (
    <Card
      className="grid gap-3 p-4 mobile:px-2 bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)]"
      size="lg"
    >
      <CoinInputBoxWithTokenSelector
        haveHalfButton
        topLeftLabel="Assert"
        value={toString(reward.amount)}
        token={reward.token}
        onSelectCoin={(token) => {
          useCreateFarms.setState({
            rewards: produce(rewards, (draft) => {
              draft[idx].token = token
            })
          })
        }}
        onUserInput={(amount) => {
          useCreateFarms.setState({
            rewards: produce(rewards, (draft) => {
              draft[idx].amount = amount
            })
          })
        }}
      />

      <Row className="gap-2">
        <DateInput
          className=" grow"
          label="Farming Start"
          inputProps={{
            placeholder: '(now)',
            inputClassName: 'text-[#abc4ff] text-xs font-medium'
          }}
          value={reward.startTime}
          onDateChange={(selectedDate) =>
            useCreateFarms.setState({
              rewards: produce(rewards, (draft) => {
                draft[idx].startTime = selectedDate
              })
            })
          }
        />

        <DateInput
          className="grow"
          label="Farming Ends"
          inputProps={{
            inputClassName: 'text-[#abc4ff] text-xs font-medium'
          }}
          value={reward.endTime}
          onDateChange={(selectedDate) =>
            useCreateFarms.setState({
              rewards: produce(rewards, (draft) => {
                draft[idx].endTime = selectedDate
              })
            })
          }
        />

        <InputBox
          decimalMode
          className="py-3 px-3"
          label="Days"
          inputClassName="w-12"
          value={durationDays && trimTailingZero(formatNumber(durationDays, { fractionLength: 1 }))}
          onUserInput={(v) => {
            if (v) {
              useCreateFarms.setState({
                rewards: produce(rewards, (draft) => {
                  draft[idx].endTime = offsetDateTime(reward.startTime ?? Date.now(), { days: Number(v) })
                })
              })
            }
          }}
        />
      </Row>

      <InputBox
        decimalMode
        floating
        label="Estimated rewards / day"
        value={estimatedValue}
        onUserInput={(v) => {
          if (!durationDays) return
          useCreateFarms.setState({
            rewards: produce(rewards, (draft) => {
              draft[idx].amount = mul(durationDays, v)
            })
          })
        }}
        suffix={reward.token && durationDays && durationDays > 0 ? <div>{reward.token.symbol} / day</div> : undefined}
      />
    </Card>
  )
}

export default function CreateFarmPage() {
  const rewards = useCreateFarms((s) => s.rewards)
  const connected = useWallet((s) => s.connected)
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div
        className={`self-center transition-all duration-500 ${
          rewards.length > 1 ? 'w-[min(1200px,70vw)]' : 'w-[min(560px,70vw)]'
        } mobile:w-[90vw]`}
      >
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

        <WarningBoard className="pb-16 w-full" />

        <div className="space-y-4">
          <FormStep stepNumber={1} title="Select Pool" haveNavline>
            <Card className="p-4 mobile:px-2 bg-cyberpunk-card-bg border-1.5 border-[#abc4ff1a]" size="lg">
              <SearchBlock />
            </Card>
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
            <Row className="gap-3 mb-3 justify-center">
              <Button
                className="grid place-items-center h-12 w-12 frosted-glass-teal p-0"
                disabled={rewards.length >= 5}
                onClick={() => {
                  useCreateFarms.setState({
                    rewards: produce(rewards, (draft) => {
                      draft.push({})
                    })
                  })
                }}
              >
                <Icon heroIconName="plus" className="grid place-items-center" />
              </Button>
              {rewards.length > 1 && (
                <Button
                  className="grid place-items-center h-12 w-12 frosted-glass-teal p-0"
                  onClick={() => {
                    useCreateFarms.setState({
                      rewards: produce(rewards, (draft) => {
                        draft.pop()
                      })
                    })
                  }}
                >
                  <Icon heroIconName="minus" className="grid place-items-center" />
                </Button>
              )}
            </Row>
            <Grid className="grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-8">
              {rewards.map((reward, index) => (
                <RewardSettingsCard key={index} rewards={rewards} reward={reward} idx={index} />
              ))}
            </Grid>
          </FormStep>
        </div>

        <Button
          className="frosted-glass-teal ml-12 "
          size="lg"
          onClick={() => {
            routeTo('/farms/createReview')
          }}
          validators={[
            {
              should: connected,
              forceActive: true,
              fallbackProps: {
                onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                children: 'Connect Wallet'
              }
            }
          ]}
        >
          Review Farm
        </Button>
      </div>
    </PageLayout>
  )
}
