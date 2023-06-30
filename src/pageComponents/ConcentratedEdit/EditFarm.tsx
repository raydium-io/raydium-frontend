import { useCallback, useEffect, useMemo, useState } from 'react'

import { shallow } from 'zustand/shallow'

import useAppSettings from '@/application/common/useAppSettings'
import txSetRewards from '@/application/concentrated/txSetRewards'
import useConcentrated from '@/application/concentrated/useConcentrated'
import { routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import Link from '@/components/Link'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { isMintEqual } from '@/functions/judgers/areEqual'

import { UpdateData } from './AddMoreDialog'
import AddNewReward, { NewReward } from './AddNewReward'
import ExistingRewardInfo from './ExistingRewardInfo'
import NewRewardTable from './NewRewardTable'
import PoolInfo from './PoolInfo'

export default function EditFarm() {
  const isMobile = useAppSettings((s) => s.isMobile)
  const walletConnected = useWallet((s) => s.connected)
  const getToken = useToken((s) => s.getToken)
  const sortTokens = useToken((s) => s.sortTokensWithBalance)
  const [currentAmmPool, whitelistRewards] = useConcentrated((s) => [s.currentAmmPool, s.whitelistRewards], shallow)
  const owner = useWallet((s) => s.owner)
  const [editedReward, setEditedReward] = useState<{ updateReward?: Map<string, UpdateData>; newRewards: NewReward[] }>(
    { newRewards: [] }
  )

  const [txSuccess, setTxSuccess] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [newRewardError, setNewRewardError] = useState<(string | undefined)[]>([])

  const [newRewardIdx, setNewRewardIdx] = useState(-1)
  const [remainRewardsCount, setRemainRewardsCount] = useState<number>(2 - (currentAmmPool?.rewardInfos.length || 0))

  const isEditFarm = currentAmmPool && currentAmmPool?.rewardInfos.length > 0
  const hasRewards =
    (currentAmmPool?.rewardInfos || []).length > 0 ||
    editedReward.newRewards.filter((reward) => !!reward?.token).length > 0

  const whiteListMints = useMemo(
    () =>
      new Set([
        ...whitelistRewards.map((pub) => pub.toBase58()),
        currentAmmPool?.base?.mint.toBase58(),
        currentAmmPool?.quote?.mint.toBase58()
      ]),
    [whitelistRewards, currentAmmPool]
  )
  const hasWhiteListRewards = useMemo(
    () =>
      currentAmmPool?.rewardInfos.some((reward) => whiteListMints.has(reward.tokenMint.toBase58())) ||
      editedReward.newRewards.some((reward) => whiteListMints.has(reward.token?.mint.toBase58())),
    [currentAmmPool, editedReward, whiteListMints]
  )

  const enableTokens =
    hasRewards &&
    ((!hasWhiteListRewards && remainRewardsCount === 0) || editedReward.newRewards[newRewardIdx]?.isWhiteListReward)
      ? sortTokens(
          shakeUndifindedItem(
            Array.from(whiteListMints)
              .map((reward) => getToken(reward))
              .filter(
                (token) =>
                  !currentAmmPool ||
                  (token && !currentAmmPool.rewardInfos.some((reward) => reward.tokenMint.equals(token.mint)))
              )
              .filter((token) => !editedReward.newRewards.some((reward) => reward.token?.mint.equals(token!.mint)))
          ),
          true
        )
      : undefined

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
    setTxSuccess(false)
    setShowPreview(true)
  }, [])

  const handleUpdateReward = useCallback((data: Map<string, UpdateData>) => {
    setEditedReward((preValues) => ({ ...preValues, updateReward: data }))
  }, [])

  const handleUpdateNewReward = useCallback(
    (data: NewReward, rewardIdx: number) => {
      setEditedReward((preValues) => {
        const newRewards = [...preValues.newRewards]
        newRewards[rewardIdx] = data
        if (newRewards.filter((r) => !!r?.token).length > 1 && !newRewards.find((r) => r.isWhiteListReward)) {
          const target = newRewards.findIndex((reward) => whiteListMints.has(reward.token?.mint.toBase58()))
          if (target > -1) newRewards[target].isWhiteListReward = true
        }
        return { ...preValues, newRewards }
      })
    },
    [hasWhiteListRewards, whiteListMints]
  )

  const handleClickNewReward = useCallback((rewardIdx: number) => setNewRewardIdx(rewardIdx), [])

  const handleDeleteNewReward = useCallback(
    (rewardIdx: number) => {
      setEditedReward((preValues) => {
        const newRewards = [...preValues.newRewards]
        newRewards.splice(rewardIdx, 1)
        newRewards.forEach((reward) => (reward.isWhiteListReward = false))
        setNewRewardIdx(newRewards.length - 1)
        return { ...preValues, newRewards }
      })
      setRemainRewardsCount((count) => count + 1)

      setNewRewardError((prevErr) => {
        const errors = [...prevErr]
        errors.splice(rewardIdx, 1)
        return errors
      })
    },
    [handleNewRewardError]
  )

  const handleSendRewardText = () => {
    const { newRewards, updateReward } = editedReward
    const formatReward: [string, UpdateData][] = Array.from(updateReward || new Map()).map((rewardData) => {
      const reward = currentAmmPool?.rewardInfos.find((r) => r.tokenMint.toBase58() === rewardData[0])
      if (reward && rewardData[1].openTime < reward.endTime)
        return [rewardData[0], { ...rewardData[1], openTime: reward.endTime }]
      if (rewardData[1].openTime <= Date.now()) rewardData[1].openTime = Date.now() + 30000
      return rewardData
    })

    txSetRewards({
      onTxSuccess: () => setTxSuccess(true),
      currentAmmPool: currentAmmPool!,
      updateRewards: new Map(formatReward),
      newRewards:
        newRewards.length > 0
          ? newRewards.map((r) => ({
              token: r.token!,
              openTime: r.openTime!,
              endTime: r.endTime!,
              perWeek: r.perWeek!
            }))
          : []
    })
  }

  const handleClickAddNewReward = useCallback(() => setNewRewardIdx((idx) => idx + 1), [])

  useEffect(() => {
    if (currentAmmPool && !currentAmmPool.rewardInfos.length && newRewardIdx === -1) {
      handleClickAddNewReward()
    }
  }, [currentAmmPool, newRewardIdx, handleClickAddNewReward])

  if (walletConnected && owner && isMintEqual(currentAmmPool?.creator, owner)) {
    return (
      <div className="max-w-[720px]">
        <div className="text-2xl mb-4">{isEditFarm ? 'Edit' : 'Create'} Farm</div>
        <div className="text-[#C4D6FF] text-sm mb-4">
          Before creating a farm, make sure to check the
          <Link
            className="ml-1"
            href="https://docs.raydium.io/raydium/concentrated-liquidity/creating-a-clmm-pool-and-farm"
          >
            detailed guide
          </Link>
          .
        </div>
        <div className="text-sm text-secondary-title mb-3">Concentrated liquidity Pool</div>
        <PoolInfo pool={currentAmmPool} />

        {currentAmmPool?.rewardInfos && currentAmmPool.rewardInfos.length > 0 ? (
          <div className="mb-8">
            <div className="text-sm text-secondary-title mb-3">Existing Farming rewards</div>
            <ExistingRewardInfo pool={currentAmmPool} previewMode={showPreview} onUpdateReward={handleUpdateReward} />
          </div>
        ) : null}

        {(editedReward.newRewards.length > 1 || (showPreview && editedReward.newRewards.length > 0)) && (
          <>
            <div className="text-sm text-secondary-title mb-3">New farming rewards</div>
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
              <>
                <div className="flex items-center gap-1 text-sm text-secondary-title mb-3">
                  New farming rewards
                  <Tooltip>
                    <Icon size="sm" heroIconName="question-mark-circle" />
                    <Tooltip.Panel>
                      <div className="max-w-[300px]">
                        Two reward tokens can be added to a farm. The first can be any SPL token. <br />
                        If two tokens are added, at least one should be from the token pair of the pool.
                      </div>
                    </Tooltip.Panel>
                  </Tooltip>
                </div>
                <AddNewReward
                  key={newRewardIdx}
                  enableTokens={enableTokens}
                  disableTokens={shakeUndifindedItem([
                    ...(currentAmmPool ? currentAmmPool.rewardInfos.map((r) => r.rewardToken) : []),
                    ...editedReward.newRewards.map((r) => r.token)
                  ])}
                  dataIndex={newRewardIdx}
                  defaultData={editedReward.newRewards[newRewardIdx]}
                  onValidateChange={handleNewRewardError}
                  onUpdateReward={handleUpdateNewReward}
                />
              </>
            ) : null}
            <Row
              className={`items-center w-fit mb-2 ${!canClickAddBtn ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
              onClick={canClickAddBtn ? handleClickAddNewReward : undefined}
            >
              <Icon className="text-[#abc4ff]" heroIconName="plus-circle" size="sm" />
              <div className="ml-1.5 text-[#abc4ff] font-base mobile:text-sm">Add reward token</div>
              <div className="ml-1.5 text-[#abc4ff80] font-base mobile:text-sm">({remainRewardsCount} more)</div>
            </Row>
          </>
        )}

        {txSuccess ? (
          <div className="mb-4 text-[#DA2EEF] text-center text-sm">Farming rewards successfully updated</div>
        ) : null}

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
            {txSuccess ? (
              <Button
                className="frosted-glass-skygray w-fit"
                size={isMobile ? 'sm' : 'lg'}
                onClick={() => routeTo('/clmm/pools')}
              >
                Back to Pools
              </Button>
            ) : (
              <Button className="frosted-glass-teal w-fit" onClick={handleSendRewardText}>
                Confirm Farm Changes
              </Button>
            )}
            <Button
              className="frosted-glass-skygray w-fit"
              size={isMobile ? 'sm' : 'lg'}
              onClick={() => {
                if (txSuccess) {
                  window.location.reload()
                  return
                }
                setShowPreview(false)
                setTxSuccess(false)
              }}
            >
              Edit
            </Button>
          </Row>
        )}

        {!showPreview && (
          <div className="flex mt-12">
            <Icon className="text-[#abc4ff] mr-[15px]" heroIconName="exclamation-circle" size="md" />
            <div className="p-6 bg-[#1B1659] rounded-[20px] border-1.5 border-[rgba(171,196,255,0.2)] text-left text-sm text-[rgba(196,214,255,0.5)]">
              <div className="text-[#ABC4FF] font-medium font-base mobile:text-sm">How to adjust existing rewards?</div>
              <div className="flex mt-2">
                <span className="mr-1">1.</span>
                Rewards allocated to farms <span className="px-1 underline">cannot be withdrawn</span> after farming
                starts.
              </div>
              <div className="flex mt-2">
                <span className="mr-1">2.</span>
                If you want to increase the reward rate, additional rewards can be added while a farm is still running.
                The period must be extended by at least 7 days.
              </div>
              <div className="flex mt-2">
                <span className="mr-1">3.</span>
                If you want to decrease the rewards rate, this can only be done 72 hours before the end of the current
                farming period, and the period must be extended by at least 7 days.
              </div>
            </div>
          </div>
        )}
      </div>
    )
  } else if (!walletConnected) {
    return (
      <div className="max-w-[720px]">
        <div className="text-xl mb-10 text-secondary-title">
          You must connect your wallet before {isEditFarm ? 'Edit' : 'Create'} Farm
        </div>
        <Button
          className="w-full frosted-glass-teal mt-5"
          onClick={() => useAppSettings.setState({ isWalletSelectorShown: true })}
        >
          Connect Wallet
        </Button>
      </div>
    )
  } else {
    return (
      <div className="max-w-[720px]">
        <div className="text-xl mb-10 text-secondary-title">
          Opps! Only pool's owner can {isEditFarm ? 'Edit' : 'Create'} farm reward
        </div>
      </div>
    )
  }
}
