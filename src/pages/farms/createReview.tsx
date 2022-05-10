import { routeTo } from '@/application/routeTools'
import Button from '@/components/Button'
import Card from '@/components/Card'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import useToggle from '@/hooks/useToggle'
import { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export default function CreateFarmReviewPage() {
  const [isCoinSelectorOn, { on: turnOnCoinSelector, off: turnOffCoinSelector }] = useToggle()
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(560px,90vw)]">
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">
          Review farm details
        </div>

        <Card
          className="py-4 px-8 mobile:px-2 bg-cyberpunk-card-bg border-1.5 divide-y divide-[#abc4ff1a] border-[rgba(171,196,255,0.2)] mb-5"
          size="lg"
        >
          {/* <CreateFarmReviewItem
            label="Pool"
            value={
              <Row className="items-baseline gap-1">
                <div className="text-white font-medium">
                  {formatNumber(toString(info.ticketPrice), { fractionLength: 'auto' })}
                </div>
                <div className="text-[#ABC4FF80] font-medium text-xs">{info.quote?.symbol ?? 'UNKNOWN'}</div>
              </Row>
            }
          /> */}
          <CreateFarmReviewItem
            label="Farm Period"
            value={
              <Row className="items-baseline gap-1">
                <div className="text-white font-medium">7</div>
                <div className="text-[#ABC4FF80] font-medium text-xs">days</div>
              </Row>
            }
          />
          <CreateFarmReviewItem
            label="Farm Period"
            value={
              <Row className="items-baseline gap-1">
                <div className="text-white font-medium">7</div>
                <div className="text-[#ABC4FF80] font-medium text-xs">days</div>
              </Row>
            }
          />
          <CreateFarmReviewItem
            label="Farm Period"
            value={
              <Row className="items-baseline gap-1">
                <div className="text-white font-medium">7</div>
                <div className="text-[#ABC4FF80] font-medium text-xs">days</div>
              </Row>
            }
          />
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
