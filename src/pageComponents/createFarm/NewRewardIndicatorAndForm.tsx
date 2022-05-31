import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { FadeIn } from '@/components/FadeIn'
import Grid from '@/components/Grid'
import { useState } from 'react'
import { RewardFormCardInputs } from './RewardFormInputs'
import { NewAddedRewardSummery } from './NewAddedRewardSummery'
import { RewardFormCard } from '../../pages/farms/create'

export function NewRewardIndicatorAndForm({ className }: { className?: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const rewards = useCreateFarms((s) => s.rewards)
  const newReards = rewards.filter((r) => r.type === 'new added')
  // TODO: use reward id not idex
  if (!newReards.length) return null
  return (
    <div className={className}>
      <div className="mb-8">
        <NewAddedRewardSummery mode="selectable" activeIndex={activeIndex} onActiveChange={setActiveIndex} />
      </div>
      <Grid className="grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-8">
        <FadeIn>
          {newReards[activeIndex] && (
            <RewardFormCard>
              <RewardFormCardInputs rewardIndex={activeIndex} />
            </RewardFormCard>
          )}
        </FadeIn>
      </Grid>
    </div>
  )
}
