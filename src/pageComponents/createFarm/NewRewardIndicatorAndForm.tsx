import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { FadeIn } from '@/components/FadeIn'
import Grid from '@/components/Grid'
import { useState } from 'react'
import { RewardFormCardInputs } from './RewardFormInputs'
import { NewAddedRewardSummary } from './NewAddedRewardSummery'
import { RewardFormCard } from '../../pages/farms/create'
import { UIRewardInfo } from '@/application/createFarm/type'

export function NewRewardIndicatorAndForm({ className }: { className?: string }) {
  const rewards = useCreateFarms((s) => s.rewards)
  const newReards = rewards.filter((r) => r.type === 'new added')

  const [activeRewardId, setActiveRewardId] = useState<string | number | undefined>(newReards[0]?.id)
  const activeReward = newReards.find((r) => r.id === activeRewardId)
  // TODO: use reward id not idex
  if (!newReards.length) return null
  return (
    <div className={className}>
      <div className={activeReward ? 'mb-8' : 'mb-2'}>
        <NewAddedRewardSummary
          mode="selectable"
          activeReward={activeReward}
          onActiveRewardChange={(r) => setActiveRewardId(r.id)}
        />
      </div>
      <Grid className="grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-8">
        <FadeIn>
          {activeReward && (
            <RewardFormCard>
              <RewardFormCardInputs reward={activeReward} />
            </RewardFormCard>
          )}
        </FadeIn>
      </Grid>
    </div>
  )
}
