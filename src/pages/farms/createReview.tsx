import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { usePools } from '@/application/pools/usePools'
import { routeTo } from '@/application/routeTools'
import Button from '@/components/Button'
import Card from '@/components/Card'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { toUTC } from '@/functions/date/dateFormat'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { AddressItem } from '@/components/AddressItem'
import formatNumber from '@/functions/format/formatNumber'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { ReactNode, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

export default function CreateFarmReviewPage() {
  const rewards = useCreateFarms((s) => s.rewards)
  const poolId = useCreateFarms((s) => s.poolId)
  const poolsHydratedPools = usePools((s) => s.hydratedInfos)
  const targetPoolHydratedInfo = useMemo(
    () => poolsHydratedPools.find((i) => i.ammId === poolId),
    [poolsHydratedPools, poolId]
  )
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(640px,90vw)]">
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

        <div className="pb-8 text-xl mobile:text-lg font-semibold justify-self-start text-white">
          Review farm details
        </div>

        <Card
          className="py-4 px-8 mobile:px-2 bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)] mb-5"
          size="lg"
        >
          <div className="py-2 text-xl mobile:text-lg font-semibold justify-self-start text-[#abc4ff80]">Pool info</div>
          <div className="divide-y divide-[#abc4ff1a]">
            <CreateFarmReviewItem
              label="Base - Quote"
              value={[targetPoolHydratedInfo?.base?.symbol ?? '--', targetPoolHydratedInfo?.quote?.symbol ?? '--'].join(
                '-'
              )}
            />
            <CreateFarmReviewItem
              label="Amm ID"
              value={<AddressItem showDigitCount={6}>{targetPoolHydratedInfo?.ammId}</AddressItem>}
            />
            <CreateFarmReviewItem label="Volume 30d" value={`$${formatNumber(targetPoolHydratedInfo?.volume30d)}`} />
            <CreateFarmReviewItem label="APR 30d" value={`${toString(targetPoolHydratedInfo?.apr30d)}%`} />
            <CreateFarmReviewItem
              label="Lp"
              value={<AddressItem showDigitCount={6}>{targetPoolHydratedInfo?.lpMint}</AddressItem>}
            />
          </div>

          {rewards.map((reward, idx) => {
            const durationDays =
              reward.endTime &&
              formatNumber(
                parseDurationAbsolute(reward.endTime.getTime() - (reward.startTime?.getTime() ?? Date.now())).days,
                { fractionLength: 1 }
              )
            const estimatedValue = reward.amount && durationDays ? div(reward.amount, durationDays) : undefined
            return (
              <>
                <div className="py-2 text-xl mobile:text-lg font-semibold justify-self-start text-[#abc4ff80] mt-8">
                  Reward {rewards.length > 1 ? `${idx + 1}` : ''}
                </div>
                <div className="divide-y divide-[#abc4ff1a] ">
                  <CreateFarmReviewItem
                    label="Total rewards"
                    value={
                      <Row className="items-baseline gap-1">
                        <div className="text-white font-medium">{toString(reward.amount)}</div>
                        <div className="text-[#ABC4FF80] font-medium text-xs">{reward.token?.symbol}</div>
                      </Row>
                    }
                  />
                  <CreateFarmReviewItem
                    label="Farm Starts"
                    value={
                      <Row className="items-baseline gap-1">
                        <div className="text-white font-medium">{toUTC(reward.startTime)}</div>
                      </Row>
                    }
                  />
                  <CreateFarmReviewItem
                    label="Farm Ends"
                    value={
                      <Row className="items-baseline gap-1">
                        <div className="text-white font-medium">{toUTC(reward.endTime)}</div>
                      </Row>
                    }
                  />
                  <CreateFarmReviewItem
                    label="Farm Period"
                    value={
                      <Row className="items-baseline gap-1">
                        <div className="text-white font-medium">{durationDays}</div>
                        <div className="text-[#ABC4FF80] font-medium text-xs">day(s)</div>
                      </Row>
                    }
                  />
                  <CreateFarmReviewItem
                    label="Estimated rewards / day"
                    value={
                      <Row className="items-baseline gap-1">
                        <div className="text-white font-medium">
                          {formatNumber(estimatedValue, { fractionLength: reward.token?.decimals ?? 6 })}
                        </div>
                        <div className="text-[#ABC4FF80] font-medium text-xs">{reward.token?.symbol ?? '--'} / day</div>
                      </Row>
                    }
                  />
                </div>
              </>
            )
          })}
        </Card>

        <div className="font-medium text-sm text-center leading-snug text-[#abc4ff80] mb-5">
          <span className="text-[#DA2EEF]">Please note:</span> All rewards provided are final and unused rewards cannot
          be recovered. You will be able to add more rewards to the farm.
        </div>

        <Row className="gap-5 justify-center">
          <Button className="frosted-glass-teal" size="lg">
            Create Farm
          </Button>
          <Button
            className="frosted-glass-skygray"
            size="lg"
            onClick={() => {
              routeTo('/farms/create')
            }}
          >
            Edit
          </Button>
        </Row>
      </div>
    </PageLayout>
  )
}

function CreateFarmReviewItem({ className, label, value }: { className?: string; label: ReactNode; value: ReactNode }) {
  return (
    <Row className={twMerge('grid gap-4 items-center grid-cols-[1fr,1fr] py-3 px-24', className)}>
      <div className="text-sm text-[#abc4ff] font-medium">{label}</div>
      <div className="text-sm text-white font-medium">{value}</div>
    </Row>
  )
}
