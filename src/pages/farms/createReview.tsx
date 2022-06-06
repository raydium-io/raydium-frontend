import txCreateNewFarm from '@/application/createFarm/txCreateNewFarm'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { routeBack, routeTo } from '@/application/routeTools'
import Button from '@/components/Button'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { PoolInfoSummary } from '@/pageComponents/createFarm/PoolInfoSummery'
import { NewAddedRewardSummary } from '@/pageComponents/createFarm/NewAddedRewardSummary'
import { createNewUIRewardInfo } from '@/application/createFarm/parseRewardInfo'
import useFarms from '@/application/farms/useFarms'
import Col from '@/components/Col'

export default function CreateFarmReviewPage() {
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(720px,90vw)]">
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

        <div className="mb-8 text-xl mobile:text-lg font-semibold justify-self-start text-white">
          Review farm details
        </div>

        <div className="mb-8">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Pool</div>
          <PoolInfoSummary />
        </div>

        <div className="mb-6">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Farm rewards</div>
          <NewAddedRewardSummary canUserEdit />
        </div>

        <div className="font-medium text-sm text-center leading-snug text-[#abc4ff80] mb-8">
          <span className="text-[#DA2EEF]">Please note:</span> All rewards provided are final and unused rewards cannot
          be recovered. You will be able to add more rewards to the farm.
        </div>

        <Row className="gap-5 justify-center items-start">
          <Col className="items-center">
            <Button
              className="frosted-glass-teal px-18 self-stretch"
              size="lg"
              onClick={() => {
                txCreateNewFarm({
                  onTxSuccess: () => {
                    setTimeout(() => {
                      routeTo('/farms')
                      useCreateFarms.setState({ rewards: [createNewUIRewardInfo()] })
                      useFarms.getState().refreshFarmInfos()
                    }, 1000)
                  }
                })
              }}
            >
              Create Farm
            </Button>
            <Col className="mt-4 text-sm font-medium items-center">
              <div>
                <span className="text-[#abc4ff80]">Fee:</span> <span className="text-[#abc4ff]">300 RAY</span>
              </div>
              <div>
                <span className="text-[#abc4ff80]">Est. transaction fee:</span>{' '}
                <span className="text-[#abc4ff]">0.002 SOL</span>
              </div>
            </Col>
          </Col>
          <Button className="frosted-glass-skygray" size="lg" onClick={routeBack}>
            Edit
          </Button>
        </Row>
      </div>
    </PageLayout>
  )
}
