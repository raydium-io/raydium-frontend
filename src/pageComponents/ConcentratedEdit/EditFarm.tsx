import { useCallback, useEffect, useState } from 'react'

import useAppSettings from '@/application/common/useAppSettings'
import txSetRewards from '@/application/concentrated/txSetRewards'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import { shakeUndifindedItem } from '@/functions/arrayMethods'

import { UpdateData } from './AddMoreDialog'
import AddNewReward, { NewReward } from './AddNewReward'
import ExistingRewardInfo from './ExistingRewardInfo'
import NewRewardTable from './NewRewardTable'
import PoolInfo from './PoolInfo'

export default function EditFarm() {
  const isMobile = useAppSettings((s) => s.isMobile)
  const walletConnected = useWallet((s) => s.connected)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const [editedReward, setEditedReward] = useState<{ updateReward?: Map<string, UpdateData>; newRewards: NewReward[] }>(
    { newRewards: [] }
  )
  const [showPreview, setShowPreview] = useState(false)
  const [newRewardError, setNewRewardError] = useState<(string | undefined)[]>([])

  const [newRewardIdx, setNewRewardIdx] = useState(-1)
  const [remainRewardsCount, setRemainRewardsCount] = useState<number>(2 - (currentAmmPool?.rewardInfos.length || 0))

  const errorIdx = newRewardError.findIndex((e) => !!e)
  const canClickAddBtn = remainRewardsCount > 0 && errorIdx === -1
  const canAddRewardToken = !showPreview && !!currentAmmPool && currentAmmPool.rewardInfos.length <= 1

  useEffect(() => {
    if (!currentAmmPool) return
    setRemainRewardsCount(2 - (currentAmmPool.rewardInfos.length || 0) - editedReward.newRewards.length)
  }, [currentAmmPool?.rewardInfos.length, editedReward.newRewards.length])

  const handleNewRewardError = useCallback((idx: number, err?: string) => {
    setNewRewardError((prevErr) => {
      const errors = [...prevErr]
      errors[idx] = err
      return errors
    })
  }, [])

  const handleClick = useCallback(() => {
    setShowPreview(true)
  }, [])

  const handleUpdateReward = useCallback((data: Map<string, UpdateData>) => {
    setEditedReward((preValues) => ({ ...preValues, updateReward: data }))
  }, [])

  const handleUpdateNewReward = useCallback((data: NewReward, rewardIdx: number) => {
    setEditedReward((preValues) => {
      const newRewards = [...preValues.newRewards]
      newRewards[rewardIdx] = data
      return { ...preValues, newRewards }
    })
  }, [])

  const handleClickNewReward = useCallback((rewardIdx: number) => {
    setNewRewardIdx(rewardIdx)
  }, [])

  const handleDeleteNewReward = useCallback(
    (rewardIdx: number) => {
      setEditedReward((preValues) => {
        const newRewards = [...preValues.newRewards]
        newRewards.splice(rewardIdx, 1)
        setNewRewardIdx(newRewards.length - 1)
        return { ...preValues, newRewards }
      })
      setRemainRewardsCount((count) => count + 1)
      handleNewRewardError(rewardIdx)
    },
    [handleNewRewardError]
  )

  const handleSendRewardText = () => {
    const { newRewards, updateReward } = editedReward
    txSetRewards({
      currentAmmPool: currentAmmPool!,
      updateRewards: updateReward || new Map(),
      newRewards:
        newRewards.length > 0
          ? newRewards.map((r) => ({
              token: r.token!,
              openTime: r.openTime!,
              endTime: r.endTime!,
              perDay: r.perDay!
            }))
          : []
    })
  }

  return (
    <div className="max-w-[720px]">
      <div className="text-2xl mb-10">Edit Farm</div>
      <div className="text-sm text-secondary-title mb-3">Pool</div>
      <PoolInfo pool={currentAmmPool} />

      {currentAmmPool?.rewardInfos && currentAmmPool.rewardInfos.length > 0 ? (
        <div className="mb-8">
          <div className="text-sm text-secondary-title mb-3">Existing Farming rewards</div>
          <ExistingRewardInfo pool={currentAmmPool} previewMode={showPreview} onUpdateReward={handleUpdateReward} />
        </div>
      ) : null}

      {(editedReward.newRewards.length > 1 || showPreview) && (
        <>
          <div className="text-sm text-secondary-title mb-3">New farm rewards</div>
          <NewRewardTable
            tvl={currentAmmPool?.tvl}
            newRewards={editedReward.newRewards}
            onClickRow={showPreview ? undefined : handleClickNewReward}
            onDelete={showPreview ? undefined : handleDeleteNewReward}
          />
        </>
      )}

      {canAddRewardToken && (
        <>
          {newRewardIdx !== -1 ? (
            <AddNewReward
              key={newRewardIdx}
              disableTokens={shakeUndifindedItem([
                ...currentAmmPool.rewardInfos.map((r) => r.rewardToken),
                ...editedReward.newRewards.map((r) => r.token)
              ])}
              dataIndex={newRewardIdx}
              defaultData={editedReward.newRewards[newRewardIdx]}
              onValidateChange={handleNewRewardError}
              onUpdateReward={handleUpdateNewReward}
            />
          ) : null}
          <Row
            className={`items-center w-fit mb-2 ${!canClickAddBtn ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
            onClick={canClickAddBtn ? () => setNewRewardIdx((idx) => idx + 1) : undefined}
          >
            <Icon className="text-[#abc4ff]" heroIconName="plus-circle" size="sm" />
            <div className="ml-1.5 text-[#abc4ff] font-base mobile:text-sm">Add another reward token</div>
            <div className="ml-1.5 text-[#abc4ff80] font-base mobile:text-sm">({remainRewardsCount} more)</div>
          </Row>
        </>
      )}

      {!showPreview && (
        <div className="text-center">
          <Button
            className="frosted-glass-teal mt-12 w-auto"
            onClick={handleClick}
            validators={[
              {
                should: walletConnected,
                forceActive: true,
                fallbackProps: {
                  onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                  children: 'Connect wallet'
                }
              },
              {
                should: editedReward.updateReward?.size || editedReward.newRewards.length > 0
              },
              {
                should: errorIdx === -1,
                fallbackProps: {
                  children: newRewardError[errorIdx]
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
