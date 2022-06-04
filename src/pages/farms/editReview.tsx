import txCreateNewFarm from '@/application/createFarm/txCreateNewFarm'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { routeBack, routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import Button from '@/components/Button'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import assert from '@/functions/assert'
import tryCatch from '@/functions/tryCatch'
import { PoolInfoSummary } from '@/pageComponents/createFarm/PoolInfoSummery'
import { NewAddedRewardSummary } from '@/pageComponents/createFarm/NewAddedRewardSummary'
import { useMemo } from 'react'
import { ExistedEditRewardSummary } from '@/pageComponents/createFarm/ExistedRewardEditSummary'
import { createNewUIRewardInfo, hasRewardBeenEdited } from '@/application/createFarm/parseRewardInfo'
import txUpdateEdited from '@/application/createFarm/txUpdateFarm'
import useFarms from '@/application/farms/useFarms'

export default function EditReviewPage() {
  const getToken = useToken((s) => s.getToken)
  const { poolId, rewards } = useCreateFarms()
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

  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(640px,90vw)]">
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Edit Farm</div>

        <div className="mb-8 text-xl mobile:text-lg font-semibold justify-self-start text-white">
          Review edited farm details
        </div>

        <div className="mb-8">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Pool</div>
          <PoolInfoSummary />
        </div>

        <div className="mb-6">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Exised farm rewards</div>
          <ExistedEditRewardSummary canUserEdit={false} />
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
                  }, 1000)
                }
              })
            }}
          >
            Edit Farm
          </Button>
          <Button className="frosted-glass-skygray" size="lg" onClick={routeBack}>
            Edit
          </Button>
        </Row>
      </div>
    </PageLayout>
  )
}
