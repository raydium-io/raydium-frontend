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
import { Fragment, ReactNode, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import { PoolSummary } from '@/pageComponents/createFarm/PoolSummary'
import { RewardSummery } from '@/pageComponents/createFarm/RewardSummary'

export default function CreateFarmReviewPage() {
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(640px,90vw)]">
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

        <div className="mb-8 text-xl mobile:text-lg font-semibold justify-self-start text-white">
          Review farm details
        </div>

        <div className="mb-8">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Pool</div>
          <PoolSummary />
        </div>

        <div className="mb-6">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Farm rewards</div>
          <RewardSummery />
        </div>

        <div className="font-medium text-sm text-center leading-snug text-[#abc4ff80] mb-8">
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
