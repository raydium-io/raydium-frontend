import useCreateFarms from '@/application/createFarm/useCreateFarm'
import Card from '@/components/Card'
import Icon from '@/components/Icon'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { PoolInfoSummary } from '@/pageComponents/createFarm/PoolInfoSummery'
import RewardEditInputDialog from '@/pageComponents/createFarm/RewardInputDialog'
import { RewardSummery } from '@/pageComponents/createFarm/RewardCreateSummary'
import produce from 'immer'
import { useState } from 'react'
import { RewardEditSummery } from '@/pageComponents/createFarm/RewardEditSummary'
import { Farm } from '@raydium-io/raydium-sdk'

export default function FarmEditPage() {
  const { rewards, cannotAddNewReward } = useCreateFarms()
  const [isRewardEditDialogOpen, setIsRewardEditDialogOpen] = useState(false)
  const [focusRewardIndex, setFocusRewardIndex] = useState<number>()
  const canAddRewardInfo = !cannotAddNewReward && rewards.length < 5
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(640px,90vw)]">
        <div className="mb-10 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Edit Farm</div>

        <div className="mb-8">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Pool</div>
          <PoolInfoSummary />
        </div>

        <div className="mb-6">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Farm rewards</div>
          <RewardEditSummery
            mode="edit"
            onClickIncreaseReward={({ rewardIndex }) => {
              setIsRewardEditDialogOpen(true)
              setFocusRewardIndex(rewardIndex)
            }}
            onClaimReward={({ reward }) => {
              // Farm.makeWithdrawFarmRewardInstruction() //TODO: imply it!
            }}
          />
          <Row
            className={`items-center my-2 text-sm clickable ${
              !canAddRewardInfo ? 'not-clickable-with-disallowed' : ''
            }`}
            onClick={() => {
              if (!canAddRewardInfo) return
              useCreateFarms.setState({
                rewards: produce(rewards, (draft) => {
                  draft.push({ canEdit: true })
                })
              })
            }}
          >
            <Icon className="text-[#abc4ff]" heroIconName="plus-circle" size="sm" />
            <div className="ml-1.5 text-[#abc4ff] font-medium">Add another reward token</div>
            <div className="ml-1.5 text-[#abc4ff80] font-medium">({5 - rewards.length} more)</div>
          </Row>
        </div>

        <Card className={`p-6 rounded-3xl ring-1 ring-inset ring-[#abc4ff1a] bg-[#1B1659] relative`}>
          <div className="absolute -left-4 top-5 -translate-x-full">
            <Icon iconSrc="/icons/create-farm-info-circle.svg" iconClassName="w-7 h-7" />
          </div>

          <div className="font-medium text-base text-[#abc4ff] mb-3">How to add more rewards?</div>

          <div>
            <div className="font-medium text-sm text-[#ABC4FF80] mb-4">
              <ol className="list-decimal ml-4 space-y-4">
                <li>
                  You can add additional rewards to the farm 24 hrs prior to rewards ending, but this can only be done
                  if rate of rewards for that specific reward token doesn't change.
                </li>
                <li>
                  If you want to increase or decrease the rewards rate, you must wait until the previous rewards period
                  ends before starting a new period and rewards amount.
                </li>
              </ol>
            </div>
          </div>
        </Card>

        <RewardEditInputDialog
          open={isRewardEditDialogOpen}
          onClose={() => setIsRewardEditDialogOpen(false)}
          rewardIndex={focusRewardIndex}
        />
      </div>
    </PageLayout>
  )
}
