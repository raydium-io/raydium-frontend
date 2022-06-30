import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { FadeIn } from '@/components/FadeIn'
import Grid from '@/components/Grid'
import { useEffect, useState } from 'react'
import { RewardFormCardInputs } from './RewardFormInputs'
import { NewAddedRewardSummary } from './NewAddedRewardSummary'
import { RewardFormCard } from '../../pages/farms/create'

export function NewRewardIndicatorAndForm({ className }: { className?: string }) {
  const rewards = useCreateFarms((s) => s.rewards)
  const newRewards = rewards.filter((r) => r.type === 'new added')

  const [activeRewardId, setActiveRewardId] = useState<string | number | undefined>(newRewards[0]?.id)
  const activeReward = newRewards.find((r) => String(r.id) === String(activeRewardId))
  useEffect(() => {
    const targetId = newRewards[newRewards.length - 1]?.id
    setActiveRewardId(targetId)
  }, [newRewards.map((r) => r.id).join('-')])
  if (!newRewards.length) return null
  return (
    <div className={className}>
      {newRewards.length >= 2 && (
        <div className={`${activeReward ? 'pb-8' : 'pb-2'}`}>
          <NewAddedRewardSummary
            canUserEdit
            activeReward={activeReward}
            onActiveRewardChange={(r) => setActiveRewardId(r.id)}
          />
        </div>
      )}
      <Grid className="grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-8">
        <FadeIn>
          {activeReward && (
            <RewardFormCard>
              <RewardFormCardInputs syncDataWithZustandStore reward={activeReward} />
            </RewardFormCard>
          )}
        </FadeIn>
      </Grid>
    </div>
  )
}
