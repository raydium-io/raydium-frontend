import { createNewUIRewardInfo, hasRewardBeenEdited } from '@/application/createFarm/parseRewardInfo'
import txUpdateEdited from '@/application/createFarm/txUpdateFarm'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import useFarms from '@/application/farms/useFarms'
import { routeBack, routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import assert from '@/functions/assert'
import tryCatch from '@/functions/tryCatch'
import { EditableRewardSummary } from '@/pageComponents/createFarm/EditableRewardSummary'
import { NewAddedRewardSummary } from '@/pageComponents/createFarm/NewAddedRewardSummary'
import { PoolInfoSummary } from '@/pageComponents/createFarm/PoolInfoSummery'
import { useEffect, useMemo } from 'react'

function useAvailableCheck() {
  useEffect(() => {
    if (!useCreateFarms.getState().isRoutedByCreateOrEdit) routeTo('/farms')
  }, [])
}

export default function EditReviewPage() {
  const getToken = useToken((s) => s.getToken)
  const { poolId, rewards, farmId } = useCreateFarms()
  const canCreateFarm = useMemo(
    () =>
      tryCatch(
        () => {
          assert(poolId, 'poolId is not defined')
          rewards.forEach((reward) => {
            assert(reward.amount, 'reward amount is not defined')
            assert(reward.token, 'reward token is not defined')
            assert(reward.startTime, 'reward start time is not defined')
            assert(reward.endTime, 'reward end time is not defined')
          })
          return true
        },
        () => false
      ),
    [poolId, rewards, getToken]
  )

  const newRewards = rewards.filter((r) => r.type === 'new added')
  const editedRewards = rewards.filter((r) => hasRewardBeenEdited(r))

  useAvailableCheck()

  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(720px,90vw)]">
        <Row className="mb-8 justify-self-start items-baseline gap-2">
          <div className="text-2xl mobile:text-lg font-semibold text-white">Edit Farm</div>
          {farmId && (
            <div className="text-sm mobile:text-xs font-semibold text-[#abc4ff80]">
              Farm ID:
              <div className="inline-block ml-1">
                <AddressItem
                  className="flex-nowrap whitespace-nowrap"
                  canCopy
                  iconClassName="hidden"
                  textClassName="text-sm mobile:text-xs font-semibold text-[#abc4ff80] whitespace-nowrap"
                  showDigitCount={6}
                >
                  {farmId}
                </AddressItem>
              </div>
            </div>
          )}
        </Row>

        <div className="mb-8 text-xl mobile:text-lg font-semibold justify-self-start text-white">
          Review farm details
        </div>

        <div className="mb-8">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Pool</div>
          <PoolInfoSummary />
        </div>

        <div className="mb-6">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Existing farm rewards</div>
          <EditableRewardSummary canUserEdit={false} />
        </div>

        {newRewards.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">New farm rewards</div>
            <NewAddedRewardSummary canUserEdit={false} />
          </div>
        )}

        <Row className="gap-5 mt-12 justify-center">
          <Button
            className="frosted-glass-teal"
            size="lg"
            validators={[{ should: newRewards.length > 0 || editedRewards.length > 0 }]}
            onClick={() => {
              txUpdateEdited({
                onTxSuccess: () => {
                  setTimeout(() => {
                    routeTo('/farms')
                    useCreateFarms.setState({ rewards: [createNewUIRewardInfo()] })
                    useFarms.getState().refreshFarmInfos()
                    useCreateFarms.setState({ isRoutedByCreateOrEdit: false })
                  }, 1000)
                }
              })
            }}
          >
            Confirm Farm Changes
          </Button>
          <Button className="frosted-glass-skygray" size="lg" onClick={routeBack}>
            Edit
          </Button>
        </Row>
      </div>
    </PageLayout>
  )
}
