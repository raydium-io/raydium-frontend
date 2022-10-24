import { useState, useCallback } from 'react'
import useAppSettings from '@/application/common/useAppSettings'
import useWallet from '@/application/wallet/useWallet'
import useConcentrated from '@/application/concentrated/useConcentrated'
import Row from '@/components/Row'
import PoolInfo from './PoolInfo'
import ExistingRewardInfo from './ExistingRewardInfo'
import { UpdateData } from './AddMoreDialog'
import AddNewReward, { NewReward } from './AddNewReward'
import NewRewardTable from './NewRewardTable'
import Button from '@/components/Button'
import Icon from '@/components/Icon'
import txSetRewards from '@/application/concentrated/txSetRewards'

export default function EditFarm() {
  const isMobile = useAppSettings((s) => s.isMobile)
  const walletConnected = useWallet((s) => s.connected)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const [editedReward, setEditedReward] = useState<{ updateReward?: Map<string, UpdateData>; newReward?: NewReward }>(
    {}
  )
  const [showPreview, setShowPreview] = useState(false)
  const [newRewardError, setNewRewardError] = useState<string | undefined>()
  const canAddRewardToken = !showPreview && currentAmmPool?.rewardInfos.length === 1

  const handleNewRewardError = useCallback((err: string | undefined) => {
    setNewRewardError(err)
  }, [])

  const handleClick = useCallback(() => {
    setShowPreview(true)
  }, [])

  const handleUpdateReward = useCallback(
    (data: Partial<{ updateReward?: Map<string, UpdateData>; newReward?: NewReward }>) => {
      setEditedReward((values) => ({ ...values, ...data }))
    },
    []
  )

  const handleSendRewardText = () => {
    const { newReward, updateReward } = editedReward
    txSetRewards({
      currentAmmPool: currentAmmPool!,
      updateRewards: updateReward || new Map(),
      newRewards: newReward
        ? [
            {
              token: newReward.token!,
              openTime: newReward.openTime!,
              endTime: newReward.endTime!,
              perDay: newReward.perDay!
            }
          ]
        : []
    })
  }

  return (
    <div className="max-w-[720px]">
      <div className="text-2xl mb-10">Edit Farm</div>
      <div className="text-sm text-secondary-title mb-3">Pool</div>
      <PoolInfo pool={currentAmmPool} />

      {currentAmmPool?.rewardInfos && currentAmmPool.rewardInfos.length && (
        <div className="mb-8">
          <div className="text-sm text-secondary-title mb-3">Existing Farming rewards</div>
          <ExistingRewardInfo pool={currentAmmPool} previewMode={showPreview} onUpdateReward={handleUpdateReward} />
        </div>
      )}

      {canAddRewardToken && (
        <AddNewReward
          pool={currentAmmPool}
          defaultData={editedReward.newReward}
          onValidateChange={handleNewRewardError}
          onUpdateReward={handleUpdateReward}
        />
      )}

      {showPreview && editedReward.newReward && (
        <>
          <div className="text-sm text-secondary-title mb-3">New farm rewards</div>
          <NewRewardTable newRewards={[editedReward.newReward]} />
        </>
      )}

      {!showPreview && (
        <div className="text-center">
          <Button
            className="frosted-glass-teal mt-12 w-auto"
            onClick={handleClick}
            validators={[
              {
                should: editedReward.updateReward?.size || editedReward.newReward
              },
              {
                should: walletConnected,
                forceActive: true,
                fallbackProps: {
                  onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                  children: 'Connect wallet'
                }
              },
              {
                should: !newRewardError,
                fallbackProps: {
                  children: newRewardError
                }
              }
            ]}
          >
            Review Changes
          </Button>
        </div>
      )}
      {showPreview && (
        <Row className="justify-center gap-2">
          <Button className="frosted-glass-teal w-fit" onClick={handleSendRewardText}>
            Confirm Farm Changes
          </Button>
          <Button
            className="frosted-glass-skygray w-fit"
            size={isMobile ? 'sm' : 'lg'}
            onClick={() => setShowPreview(false)}
          >
            Edit
          </Button>
        </Row>
      )}

      {!showPreview && (
        <div className="flex mt-12">
          <Icon className="text-[#abc4ff] mr-[15px]" heroIconName="exclamation-circle" size="md" />
          <div className="p-6 bg-[#1B1659] rounded-[20px] border-1.5 border-[rgba(171,196,255,0.2)] text-left text-sm text-[rgba(196,214,255,0.5)]">
            <div className="text-[#abc4ff] font-base mobile:text-sm">How to add more rewards?</div>
            <div className="flex my-3">
              <span>1.</span>
              You can add additional rewards to the farm 24 hrs prior to rewards ending, but this can only be done if
              rate of rewards for that specific reward token doesn’t change.
            </div>
            <div className="flex">
              <span>2.</span>
              If you want to increase or decrease the rewards rate, you must wait until the previous rewards period ends
              before starting a new period and rewards amount.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
