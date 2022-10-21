import useConcentrated from '@/application/concentrated/useConcentrated'
import PoolInfo from './PoolInfo'
import ExistingRewardInfo from './ExistingRewardInfo'
import AddNewReward from './AddNewReward'
import Button from '@/components/Button'
import Icon from '@/components/Icon'
//3tD34VtprDSkYCnATtQLCiVgTkECU3d12KtjupeR6N2X
export default function EditFarm() {
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const canAddRewardToken = currentAmmPool?.rewardInfos.length === 1

  return (
    <div className="max-w-[720px] text-center">
      <div className="text-2xl mb-10">Edit Farm</div>
      <div className="text-sm text-secondary-title mb-3">Pool</div>
      <PoolInfo pool={currentAmmPool} />

      {currentAmmPool?.rewardInfos && currentAmmPool.rewardInfos.length && (
        <div className="mb-8">
          <div className="text-sm text-secondary-title mb-3">Existing Farming rewards</div>
          <ExistingRewardInfo pool={currentAmmPool} />
        </div>
      )}
      {canAddRewardToken && <AddNewReward pool={currentAmmPool} />}
      <Button className="frosted-glass-teal mt-12 max-w-[232px] w-full" disabled={true}>
        Preview
      </Button>

      <div className="flex mt-12">
        <Icon className="text-[#abc4ff] mr-[15px]" heroIconName="exclamation-circle" size="md" />
        <div className="p-6 bg-[#1B1659] rounded-[20px] border-1.5 border-[rgba(171,196,255,0.2)] text-left text-sm text-[rgba(196,214,255,0.5)]">
          <div className="text-[#abc4ff] font-base mobile:text-sm">How to add more rewards?</div>
          <div className="flex my-3">
            <span>1.</span>
            You can add additional rewards to the farm 24 hrs prior to rewards ending, but this can only be done if rate
            of rewards for that specific reward token doesn’t change.
          </div>
          <div className="flex">
            <span>2.</span>
            If you want to increase or decrease the rewards rate, you must wait until the previous rewards period ends
            before starting a new period and rewards amount.
          </div>
        </div>
      </div>
    </div>
  )
}
