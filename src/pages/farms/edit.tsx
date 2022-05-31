import useCreateFarms from '@/application/createFarm/useCreateFarm'
import Card from '@/components/Card'
import Icon from '@/components/Icon'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { PoolInfoSummary } from '@/pageComponents/createFarm/PoolInfoSummery'
import RewardEditInputDialog from '@/pageComponents/createFarm/RewardInputDialog'
import produce from 'immer'
import { useState } from 'react'
import { createNewUIRewardInfo } from '@/application/createFarm/parseRewardInfo'
import { UIRewardInfo } from '@/application/createFarm/type'
import useToken from '@/application/token/useToken'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import ListTable from '@/components/ListTable'
import { offsetDateTime, toUTC } from '@/functions/date/dateFormat'
import parseDuration, { getDuration, parseDurationAbsolute } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useConnection from '@/application/connection/useConnection'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import { offset } from '@solana/buffer-layout'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import Button from '@/components/Button'
import { Farm } from '@raydium-io/raydium-sdk'
import txUpdateEdited from '@/application/createFarm/txUpdateFarm'

export default function FarmEditPage() {
  const { rewards, cannotAddNewReward } = useCreateFarms()
  const [isRewardEditDialogOpen, setIsRewardEditDialogOpen] = useState(false)
  const [rewardEditDialogMode, setRewardEditDialogMode] = useState<'edit-in-rewarding' | 'edit-after-rewarding'>()
  const [focusRewardIndex, setFocusRewardIndex] = useState<number>()
  const canAddRewardInfo = !cannotAddNewReward && rewards.length < 5
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(640px,90vw)]">
        <div className="mb-10 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Edit Farm</div>

        <div className="mb-8">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Pool</div>
          <PoolInfoSummary />
        </div>

        <div className="mb-6">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Farm rewards</div>
          <RewardEditSummery
            mode="edit"
            onClickIncreaseReward={({ rewardIndex, reward }) => {
              setRewardEditDialogMode(reward.isRewarding ? 'edit-in-rewarding' : 'edit-in-rewarding') // TODO: temp
              // setRewardEditDialogMode(reward.isRewarding ? 'edit-in-rewarding' : 'edit-after-rewarding')
              setIsRewardEditDialogOpen(true)
              setFocusRewardIndex(rewardIndex)
            }}
            onClaimReward={({ reward }) => {
              // Farm.makeWithdrawFarmRewardInstruction() //TODO: imply it!
            }}
          />
          <Row
            className={`items-center my-2 text-sm clickable ${
              !canAddRewardInfo ? 'not-clickable-with-disallowed' : ''
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
        </div>

        <Button
          onClick={() => {
            txUpdateEdited({ rewardId: rewards[0].id })
          }}
        >
          Submit
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
                  You can add additional rewards to the farm 24 hrs prior to rewards ending, but this can only be done
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

        {focusRewardIndex != null && (
          <RewardEditInputDialog
            open={isRewardEditDialogOpen}
            onClose={() => setIsRewardEditDialogOpen(false)}
            rewardIndex={focusRewardIndex}
            mode={rewardEditDialogMode}
          />
        )}
      </div>
    </PageLayout>
  )
}

function RewardEditSummery({
  mode,
  activeIndex,
  onActiveIndexChange,
  onClickIncreaseReward,
  onClaimReward
}: {
  mode: 'normal' | 'selectable' | 'edit'

  // --------- when selectable ------------
  activeIndex?: number
  onActiveIndexChange?(index: number): void

  // --------- when edit ------------
  onClickIncreaseReward?(payload: { reward: UIRewardInfo; rewardIndex: number }): void
  onClaimReward?(payload: { reward: UIRewardInfo; rewardIndex: number }): void
}) {
  const rewards = useCreateFarms((s) => s.rewards)
  const getToken = useToken((s) => s.getToken)
  const currentChainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const currentChainTime = Date.now() + (currentChainTimeOffset ?? 0)
  return (
    <ListTable
      list={rewards}
      labelMapper={[
        {
          label: 'Asset',
          cssGridItemWidth: '.6fr'
        },
        {
          label: 'Amount'
        },
        {
          label: 'Day and Hours',
          cssGridItemWidth: '.6fr'
        },
        {
          label: 'Period (yy-mm-dd)',
          cssGridItemWidth: '1.5fr'
        },
        {
          label: 'Est. daily rewards'
        }
      ]}
      // className="backdrop-brightness-"
      rowClassName={({ index }) => {
        // if (!reward.canEdit) return `not-clickable`
        if (mode === 'selectable') {
          return `${activeIndex === index ? 'backdrop-brightness-90' : 'hover:backdrop-brightness-95'}`
        }
        return ''
      }}
      onClickRow={({ index }) => {
        onActiveIndexChange?.(index)
      }}
      renderRowItem={({ item: reward, label }) => {
        if (label === 'Asset') {
          return reward.token ? (
            <Row className="gap-1 items-center">
              <CoinAvatar token={reward.token} size="sm" />
              <div>{reward.token?.symbol ?? 'UNKNOWN'}</div>
            </Row>
          ) : (
            '--'
          )
        }

        if (label === 'Amount') {
          if (reward.isRewarding && reward.version === 'v3/v5') return '--'
          return reward.amount ? (
            <div className="break-all">
              {formatNumber(reward.amount, { fractionLength: reward.token?.decimals ?? 6 })}
            </div>
          ) : undefined
        }

        if (label === 'Day and Hours') {
          if (reward.isRewarding && reward.version === 'v3/v5') return '--'
          if (!reward.startTime || !reward.endTime) return
          const duration = parseDuration(getDuration(reward.endTime, reward.startTime))
          return duration.hours ? `${duration.days}D ${duration.hours} H` : `${duration.days}D`
        }

        if (label === 'Period (yy-mm-dd)') {
          if (reward.isRewarding && reward.version === 'v3/v5') return '--'
          if (!reward.startTime || !reward.endTime) return
          return (
            <div>
              <div>{toUTC(reward.startTime)}</div>
              <div>{toUTC(reward.endTime)}</div>
            </div>
          )
        }

        if (label === 'Est. daily rewards') {
          if (reward.isRewarding && reward.version === 'v3/v5') return '--'
          const durationTime =
            reward.endTime && reward.startTime ? reward.endTime.getTime() - reward.startTime.getTime() : undefined
          const estimatedValue =
            reward.amount && durationTime ? div(reward.amount, parseDurationAbsolute(durationTime).days) : undefined
          if (!estimatedValue) return
          return (
            <div className="text-xs">
              {toString(estimatedValue)} {reward.token?.symbol}
            </div>
          )
        }
      }}
      renderRowEntry={({ contentNode, index: idx, itemData: reward }) => (
        <div
          className={
            isDateAfter(currentChainTime, offsetDateTime(reward.endTime, { hours: -0.5 })) ? '' : 'not-selectable'
          }
        >
          {contentNode}
          <div className="bg-[#abc4ff1a] rounded-md p-2 mb-4">
            {!reward.isRewardEnded && (
              <Col
                className="items-center clickable"
                onClick={() => {
                  onClickIncreaseReward?.({ reward, rewardIndex: idx })
                }}
              >
                <Row className="items-center gap-1">
                  <Icon iconSrc="/icons/create-farm-plus.svg" size="xs" className="text-[#abc4ff80]" />
                  <div className="text-xs text-[#abc4ff] font-medium">Add more rewards</div>
                </Row>
                <div className="text-xs text-[#abc4ff80] font-medium">(no rate changed allowed)</div>
              </Col>
            )}

            {reward.isRewardEnded && (
              <Grid className="grid-cols-2 gap-board">
                <Row
                  className="items-center justify-center gap-1 clickable"
                  onClick={() => onClickIncreaseReward?.({ reward, rewardIndex: idx })}
                >
                  <Icon iconSrc="/icons/create-farm-plus.svg" size="xs" className="text-[#abc4ff80]" />
                  <div className="text-xs text-[#abc4ff] font-medium">Add more rewards</div>
                </Row>

                <Row
                  className="items-center justify-center gap-1 clickable"
                  onClick={() => onClaimReward?.({ reward, rewardIndex: idx })}
                >
                  <Icon iconSrc="/icons/create-farm-roll-back.svg" size="xs" className="text-[#abc4ff80]" />
                  <Col>
                    <div className="text-xs text-[#abc4ff] font-medium">Claim unemmitted rewards</div>
                    <div className="text-xs text-[#abc4ff80] font-medium">1111 RAY</div> {/* TODO: imply it!! */}
                  </Col>
                </Row>
              </Grid>
            )}
          </div>
        </div>
      )}
      onListChange={(list) => {
        useCreateFarms.setState({
          rewards: list
        })
      }}
    />
  )
}
