import useCreateFarms from '@/application/createFarm/useCreateFarm'
import Card from '@/components/Card'
import Icon from '@/components/Icon'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { PoolInfoSummary } from '@/pageComponents/createFarm/PoolInfoSummery'
import RewardInputDialog from '@/pageComponents/createFarm/RewardEditDialog'
import produce from 'immer'
import { useState } from 'react'
import { createNewUIRewardInfo } from '@/application/createFarm/parseRewardInfo'
import { UIRewardInfo } from '@/application/createFarm/type'
import { NewRewardIndicatorAndForm } from '@/pageComponents/createFarm/NewRewardIndicatorAndForm'
import { ExistedEditRewardSummary } from '../../pageComponents/createFarm/ExistedRewardEditSummary'
import Button from '@/components/Button'
import { routeTo } from '@/application/routeTools'

export default function FarmEditPage() {
  const { rewards, cannotAddNewReward } = useCreateFarms()
  const [isRewardInputDialogOpen, setIsRewardInputDialogOpen] = useState(false)
  const [focusReward, setFocusReward] = useState<UIRewardInfo>()
  const canAddRewardInfo = !cannotAddNewReward && rewards.length < 5
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(720px,90vw)]">
        <div className="mb-10 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Edit Farm</div>

        <div className="mb-8">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Pool</div>
          <PoolInfoSummary />
        </div>

        <div className="mb-4">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Farm rewards</div>
          <ExistedEditRewardSummary
            canUserEdit
            onClickIncreaseReward={({ reward }) => {
              setIsRewardInputDialogOpen(true)
              setFocusReward(reward)
            }}
            onClaimReward={({ reward }) => {
              // Farm.makeWithdrawFarmRewardInstruction() //TODO: imply it!
            }}
          />
        </div>

        <NewRewardIndicatorAndForm className="mt-8 mb-4" />

        <Row
          className={`items-center my-2 mb-12 text-sm clickable ${
            canAddRewardInfo ? '' : 'not-clickable-with-disallowed'
          }`}
          onClick={() => {
            if (!canAddRewardInfo) return
            useCreateFarms.setState({
              rewards: produce(rewards, (draft) => {
                draft.push(createNewUIRewardInfo())
              })
            })
          }}
        >
          <Icon className="text-[#abc4ff]" heroIconName="plus-circle" size="sm" />
          <div className="ml-1.5 text-[#abc4ff] font-medium">Add another reward token</div>
          <div className="ml-1.5 text-[#abc4ff80] font-medium">({5 - rewards.length} more)</div>
        </Row>

        <Button
          className="block frosted-glass-teal mx-auto mt-4 mb-12"
          onClick={() => {
            routeTo('/farms/editReview')
          }}
        >
          Review changes
        </Button>

        <Card className={`p-6 rounded-3xl ring-1 ring-inset ring-[#abc4ff1a] bg-[#1B1659] relative`}>
          <div className="absolute -left-4 top-5 -translate-x-full">
            <Icon iconSrc="/icons/create-farm-info-circle.svg" iconClassName="w-7 h-7" />
          </div>

          <div className="font-medium text-base text-[#abc4ff] mb-3">How to add more rewards?</div>

          <div>
            <div className="font-medium text-sm text-[#ABC4FF80] mb-4">
              <ol className="list-decimal ml-4 space-y-4">
                <li>
                  You can add additional rewards to the farm 72 hrs prior to rewards ending, but this can only be done
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

        {focusReward != null && (
          <RewardInputDialog
            reward={focusReward}
            open={isRewardInputDialogOpen}
            onClose={() => setIsRewardInputDialogOpen(false)}
          />
        )}
      </div>
    </PageLayout>
  )
}
