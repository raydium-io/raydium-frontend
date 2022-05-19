import useAppSettings from '@/application/appSettings/useAppSettings'
import useCreateFarms, { CreateFarmStore } from '@/application/createFarm/useCreateFarm'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { usePools } from '@/application/pools/usePools'
import { routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import AutoComplete, { AutoCompleteCandidateItem } from '@/components/AutoComplete'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import CoinInputBoxWithTokenSelector from '@/components/CoinInputBoxWithTokenSelector'
import Col from '@/components/Col'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import DateInput from '@/components/DateInput'
import FadeInStable from '@/components/FadeIn'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Link from '@/components/Link'
import ListTable from '@/components/ListTable'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { offsetDateTime, toUTC } from '@/functions/date/dateFormat'
import { currentIsBefore, isDateBefore } from '@/functions/date/judges'
import parseDuration, { getDuration, parseDurationAbsolute } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import listToMap, { listToJSMap } from '@/functions/format/listToMap'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { div, mul } from '@/functions/numberish/operations'
import { trimTailingZero } from '@/functions/numberish/stringNumber'
import { toString } from '@/functions/numberish/toString'
import produce from 'immer'
import { ReactNode, useMemo, useState } from 'react'

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
  const pairInfos = usePools((s) => s.hydratedInfos)
  const liquidityPools = useLiquidity((s) => s.jsonInfos)
  const tokens = useToken((s) => s.tokens)

  const liquidityPoolMap = useMemo(() => listToMap(liquidityPools, (s) => s.id), [liquidityPools])
  const pairInfoMap = useMemo(() => listToMap(pairInfos, (s) => s.ammId), [pairInfos])

  const selectedPool = liquidityPools.find((i) => i.id === poolId)
  const selectedPoolPairInfo = pairInfos.find((i) => i.ammId === poolId)

  const candidates = liquidityPools
    .filter((p) => tokens[p.baseMint] && tokens[p.quoteMint])
    .map((pool) =>
      Object.assign(pool, {
        label: pool.id,
        searchText: `${tokens[pool.baseMint]?.symbol} ${tokens[pool.quoteMint]?.symbol} ${pool.id}`
      } as AutoCompleteCandidateItem)
    )

  const [inputValue, setInputValue] = useState<string>()
  const [isInputing, setIsInputing] = useState(false)
  return (
    <Card className="p-4 mobile:px-2 bg-cyberpunk-card-bg border-1.5 border-[#abc4ff1a]" size="lg">
      <AutoComplete
        candidates={candidates}
        value={selectedPool?.id}
        className="p-4 py-3 gap-2 bg-[#141041] rounded-xl min-w-[7em]"
        inputClassName="font-medium mobile:text-xs text-[#abc4ff] placeholder-[#abc4Ff80]"
        suffix={<Icon heroIconName="search" className="text-[rgba(196,214,255,0.5)]" />}
        placeholder="Search for a pool or paste AMM ID"
        renderCandidateItem={({ candidate, isSelected }) => (
          <Row className={`py-3 px-4 items-center gap-2 ${isSelected ? 'backdrop-brightness-50' : ''}`}>
            <CoinAvatarPair token1={tokens[candidate.baseMint]} token2={tokens[candidate.quoteMint]} />
            <div className="text-[#abc4ff] font-medium">
              {tokens[candidate.baseMint]?.symbol}-{tokens[candidate.quoteMint]?.symbol}
            </div>
            {pairInfoMap[candidate.id] ? (
              <div className="text-[#abc4ff80] text-sm font-medium">
                {toUsdVolume(pairInfoMap[candidate.id].liquidity, { decimalPlace: 0 })}
              </div>
            ) : null}
            <AddressItem canCopy={false} showDigitCount={8} className="text-[#abc4ff80] text-xs ml-auto">
              {candidate.id}
            </AddressItem>
          </Row>
        )}
        onSelectCandiateItem={({ selected }) => {
          setIsInputing(false)
          useCreateFarms.setState({ poolId: selected.id })
        }}
        onBlurMatchCandiateFailed={({ text: candidatedPoolId }) => {
          const matchedPoolId = liquidityPools.find((i) => i.id === candidatedPoolId)?.id
          useCreateFarms.setState({ poolId: matchedPoolId })
        }}
        onDangerousValueChange={(v) => {
          setInputValue(v)
        }}
        onUserInput={() => {
          setIsInputing(true)
        }}
        onBlur={() => {
          setIsInputing(false)
        }}
      />

      <FadeInStable show={inputValue && !isInputing}>
        <Row className="items-center px-4 pt-2 gap-2">
          {selectedPool ? (
            <>
              <CoinAvatarPair token1={tokens[selectedPool.baseMint]} token2={tokens[selectedPool.quoteMint]} />
              <div className="text-[#abc4ff] text-base font-medium">
                {tokens[selectedPool.baseMint]?.symbol} - {tokens[selectedPool.quoteMint]?.symbol}
              </div>
              {selectedPoolPairInfo ? (
                <div className="text-[#abc4ff80] text-sm ml-auto font-medium">
                  Liquidity: {toUsdVolume(selectedPoolPairInfo.liquidity, { decimalPlace: 0 })}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Icon size="smi" heroIconName="x-circle" className="text-[#DA2EEF]" />
              <div className="text-[#DA2EEF] text-xs font-medium">Can't find pool</div>
            </>
          )}
        </Row>
      </FadeInStable>
    </Card>
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

function RewardFormCard({
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
          className="grow"
          label="Farming Start"
          inputProps={{
            inputClassName: 'text-[#abc4ff] text-xs font-medium'
          }}
          value={reward.startTime}
          disableDateBeforeCurrent
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
          disableDateBeforeCurrent
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

function RewardSummery({ rewards }: { rewards: CreateFarmStore['rewards'] }) {
  return (
    <ListTable
      list={rewards}
      labelMapper={[
        {
          key: 'token',
          label: 'Asset'
        },
        {
          key: 'amount',
          label: 'Amount'
        },
        {
          label: 'Day and Hours'
        },
        {
          key: ['startTime', 'endTime'],
          label: 'Period (yy-mm-dd)'
        },
        {
          label: 'Est. daily rewards'
        }
      ]}
      renderItem={({ item, label, key }) => {
        if (label === 'Asset') {
          return item.token ? (
            <Row className="gap-1 items-center">
              <CoinAvatar token={item.token} size="sm" />
              <div>{item.token?.symbol ?? 'UNKNOWN'}</div>
            </Row>
          ) : (
            '--'
          )
        }

        if (label === 'Amount') {
          return item.amount ? formatNumber(item.amount) : undefined
        }

        if (label === 'Day and Hours') {
          if (!item.startTime || !item.endTime) return
          const duration = parseDuration(getDuration(item.endTime, item.startTime))
          return `${duration.days} Days ${duration.hours} Hours`
        }

        if (label === 'Period (yy-mm-dd)') {
          if (!item.startTime || !item.endTime) return
          return (
            <div>
              <div>{toUTC(item.startTime)}</div>
              <div>{toUTC(item.endTime)}</div>
            </div>
          )
        }

        if (label === 'Est. daily rewards') {
          const durationDays = item.endTime
            ? parseDurationAbsolute(item.endTime.getTime() - (item.startTime?.getTime() ?? Date.now())).days
            : undefined
          const estimatedValue = item.amount && durationDays ? div(item.amount, durationDays) : undefined
          if (!estimatedValue) return
          return (
            <div className="text-xs">
              {toString(estimatedValue)} {item.token?.symbol}
            </div>
          )
        }
      }}
      renderRowControls={({ destorySelf }) =>
        rewards.length > 1 && (
          <Icon heroIconName="x-circle" className="clickable text-[#abc4ff]" onClick={destorySelf} />
        )
      }
      onListChange={(list) => {
        useCreateFarms.setState({
          rewards: list
        })
      }}
    />
  )
}

export default function CreateFarmPage() {
  const poolId = useCreateFarms((s) => s.poolId)
  const rewards = useCreateFarms((s) => s.rewards)
  const connected = useWallet((s) => s.connected)
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className={`self-center transition-all duration-500 w-[min(640px,70vw)] mobile:w-[90vw]`}>
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

        <WarningBoard className="pb-16 w-full" />

        <div className="space-y-4">
          <FormStep stepNumber={1} title="Select Pool" haveNavline>
            <SearchBlock />
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
              <RewardSummery rewards={rewards} />
            </div>
            <Grid className="grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-8">
              {rewards.map((reward, index) => (
                <RewardFormCard key={index} rewards={rewards} reward={reward} idx={index} />
              ))}
            </Grid>
            <Button
              type="text"
              disabled={rewards.length >= 5}
              onClick={() => {
                useCreateFarms.setState({
                  rewards: produce(rewards, (draft) => {
                    draft.push({})
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
          validators={[
            {
              should: poolId,
              fallbackProps: {
                children: 'Select pool' // NOTE: should ask manager about the text content
              }
            },
            {
              should: rewards.every((r) => r.token),
              fallbackProps: {
                children: 'Choose reward token' // NOTE: should ask manager about the text content
              }
            },
            {
              should: rewards.every((r) => r.amount),
              fallbackProps: {
                children: 'Input reward amount' // NOTE: should ask manager about the text content
              }
            },
            {
              should: rewards.every((r) => r.startTime && r.endTime),
              fallbackProps: {
                children: 'Set StartTime and EndTime' // NOTE: should ask manager about the text content
              }
            },
            {
              should: rewards.every((r) => r.startTime && r.endTime && isDateBefore(r.startTime, r.endTime)),
              fallbackProps: {
                children: 'StartTime must before EndTime' // NOTE: should ask manager about the text content
              }
            },
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
