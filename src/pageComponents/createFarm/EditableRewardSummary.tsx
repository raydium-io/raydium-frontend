import useCreateFarms from '@/application/createFarm/useCreateFarm'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import { UIRewardInfo } from '@/application/createFarm/type'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import ListTable from '@/components/ListTable'
import { getTime, toUTC } from '@/functions/date/dateFormat'
import parseDuration, { getDuration, parseDurationAbsolute } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { Badge } from '@/components/Badge'
import { getRewardSignature, hasRewardBeenEdited } from '@/application/createFarm/parseRewardInfo'
import toPercentString from '@/functions/format/toPercentString'
import { eq, isMeaningfulNumber } from '@/functions/numberish/compare'
import produce from 'immer'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import useWallet from '@/application/wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { HydratedFarmInfo } from '@/application/farms/type'
import { TimeStamp } from '@/functions/date/interface'
import { Numberish } from '@/types/constants'
import Tooltip from '@/components/Tooltip'
import Button from '@/components/Button'

export function EditableRewardSummary({
  canUserEdit,
  hydratedFarmInfo,
  onClickIncreaseReward,
  onClaimReward,
  onClaimAllReward
}: {
  canUserEdit: boolean
  hydratedFarmInfo?: HydratedFarmInfo // only if when user can edit
  // --------- when edit ------------
  onClickIncreaseReward?(payload: { reward: UIRewardInfo }): void
  onClaimReward?(payload: { reward: UIRewardInfo; onTxSuccess?: () => void }): void
  onClaimAllReward?(payload: { rewards: UIRewardInfo[]; onTxSuccess?: () => void }): void
}) {
  const rewards = useCreateFarms((s) => s.rewards)
  const editableRewards = rewards.filter((r) => r.type === 'existed reward')
  const owner = useWallet((s) => s.owner)
  const isCreator = rewards.every((reward) => isMintEqual(owner, reward.owner))
  const existSomeClaimableRewards = rewards.some(
    (reward) =>
      reward.isRewardEnded && reward.originData && isMeaningfulNumber(toString(reward.originData.claimableRewards))
  )
  return (
    <Col>
      <ListTable
        list={editableRewards}
        getItemKey={(r) => getRewardSignature(r)}
        labelMapper={[
          {
            label: 'Reward Token',
            cssGridItemWidth: '.9fr'
          },
          {
            label: 'Amount'
          },
          {
            label: 'Total Duration',
            cssGridItemWidth: '.6fr'
          },
          {
            label: 'Period (yy-mm-dd)',
            cssGridItemWidth: '1.5fr'
          },
          {
            label: 'Rate'
          }
        ]}
        renderRowItem={({ item: reward, label }) => {
          const hasBeenEdited = hasRewardBeenEdited(reward)
          if (label === 'Reward Token') {
            return reward.token ? (
              <Col className="h-full justify-center">
                <Row className="gap-1 items-center">
                  <CoinAvatar token={reward.token} size="sm" />
                  <div>{reward.token?.symbol ?? 'UNKNOWN'}</div>
                </Row>
                <Row className="gap-1 flex-wrap mt-1">
                  {reward.isRewardEnded && <Badge cssColor="#da2Eef">Ended</Badge>}
                  {reward.isRewardBeforeStart && <Badge cssColor="#abc4ff">Upcoming</Badge>}
                  {reward.isRewarding && <Badge cssColor={'#39d0d8'}>Ongoing</Badge>}
                </Row>
              </Col>
            ) : (
              '--'
            )
          }

          if (label === 'Amount') {
            if (reward.isRewarding && reward.version === 'v3/v5') return '--'
            return (
              <Grid className={`gap-4 ${hasBeenEdited ? 'grid-rows-2' : ''} h-full`}>
                {reward.originData?.amount ? (
                  <Col className="grow break-all justify-center">
                    {formatNumber(reward.originData.amount, { fractionLength: reward.token?.decimals ?? 6 })}
                  </Col>
                ) : undefined}
                {hasBeenEdited ? (
                  <Col className="grow break-all justify-center text-[#39d0d8]">
                    {formatNumber(reward.amount, { fractionLength: reward.token?.decimals ?? 6 })}
                  </Col>
                ) : undefined}
              </Grid>
            )
          }

          if (label === 'Total Duration') {
            if (reward.isRewarding && reward.version === 'v3/v5') return '--'

            const getDurationText = (startTime: TimeStamp, endTime: TimeStamp) => {
              const duration = parseDuration(getDuration(endTime, startTime))
              return duration.hours ? `${duration.days}D ${duration.hours}H` : `${duration.days}D`
            }

            return (
              <Grid className={`gap-4 ${hasBeenEdited ? 'grid-rows-2' : ''} h-full`}>
                {reward.originData?.startTime && reward.originData.endTime ? (
                  <Col className="grow break-all justify-center">
                    {getDurationText(reward.originData.startTime, reward.originData.endTime)}
                  </Col>
                ) : undefined}
                {hasBeenEdited && reward.startTime && reward.endTime ? (
                  <Col className="grow break-all justify-center text-[#39d0d8]">
                    {getDurationText(reward.startTime, reward.endTime)}
                  </Col>
                ) : undefined}
              </Grid>
            )
          }

          if (label === 'Period (yy-mm-dd)') {
            if (reward.isRewarding && reward.version === 'v3/v5') return '--'
            if (!reward.startTime || !reward.endTime) return
            return (
              <Grid className={`gap-4 ${hasBeenEdited ? 'grid-rows-2' : ''} h-full`}>
                {reward.originData?.startTime && reward.originData.endTime ? (
                  <Col className="grow justify-center">
                    <div>{toUTC(reward.originData.startTime)}</div>
                    <div>{toUTC(reward.originData.endTime)}</div>
                  </Col>
                ) : undefined}
                {hasBeenEdited ? (
                  <Col className="grow justify-center text-[#39d0d8]">
                    <div>{toUTC(reward.startTime)}</div>
                    <div>{toUTC(reward.endTime)}</div>
                  </Col>
                ) : undefined}
              </Grid>
            )
          }

          if (label === 'Rate') {
            if (reward.isRewarding && reward.version === 'v3/v5') return '--'

            const getEstimatedValue = (amount: Numberish, startTime: TimeStamp, endTime: TimeStamp) => {
              const durationTime = endTime && startTime ? getTime(endTime) - getTime(startTime) : undefined
              const estimatedValue =
                amount && durationTime ? div(amount, parseDurationAbsolute(durationTime).days) : undefined
              return estimatedValue
            }

            const originEstimatedValue =
              reward.originData?.amount && reward.originData.startTime && reward.originData.endTime
                ? getEstimatedValue(reward.originData.amount, reward.originData.startTime, reward.originData.endTime)
                : undefined
            const editedEstimatedValue =
              hasBeenEdited && reward.amount && reward.startTime && reward.endTime
                ? getEstimatedValue(reward.amount, reward.startTime, reward.endTime)
                : undefined
            const showEditedEstimated = editedEstimatedValue && !eq(originEstimatedValue, editedEstimatedValue)
            return (
              <Grid className={`gap-4 ${showEditedEstimated ? 'grid-rows-2' : ''} h-full`}>
                {originEstimatedValue && (
                  <Col className="grow justify-center text-xs">
                    <div>
                      {toString(originEstimatedValue)} {reward.originData?.token?.symbol}/day
                    </div>
                    {reward.originData?.apr && <div>{toPercentString(reward.originData.apr)} APR</div>}
                  </Col>
                )}
                {showEditedEstimated && (
                  <Col className="grow justify-center text-xs text-[#39d0d8]">
                    <div>
                      {toString(editedEstimatedValue)} {reward?.token?.symbol}/day
                    </div>
                    {reward?.apr && <div>{toPercentString(reward.apr)} APR</div>}
                  </Col>
                )}
              </Grid>
            )
          }
        }}
        renderRowEntry={({ contentNode, itemData: reward, changeSelf }) => {
          const isRewardBeforeStart = reward.originData?.isRewardBeforeStart
          const isRewardEditable = reward.originData?.isRwardingBeforeEnd72h || reward.originData?.isRewardEnded
          const isRewardOwner = owner && isMintEqual(owner, reward.owner)
          const isRewardEdited = hasRewardBeenEdited(reward)
          return (
            <div className={isRewardBeforeStart ? 'not-selectable' : ''}>
              {contentNode}
              {canUserEdit && isRewardEditable && (
                <div className="bg-[#abc4ff1a] rounded-md p-2 mb-4 empty:hidden">
                  {reward.originData?.isRwardingBeforeEnd72h && !isRewardEdited && (
                    <Col
                      className="items-center clickable"
                      onClick={() => {
                        onClickIncreaseReward?.({ reward })
                      }}
                    >
                      <Row className="items-center gap-1">
                        <Icon iconSrc="/icons/create-farm-plus.svg" size="xs" className="text-[#abc4ff80]" />
                        <div className="text-xs text-[#abc4ff] font-medium">Add more rewards</div>
                      </Row>
                      <div className="text-xs text-[#abc4ff80] font-medium">(no rate changed allowed)</div>
                    </Col>
                  )}

                  {reward.originData?.isRewardEnded && (
                    <Grid
                      className={`${
                        isRewardEdited ? 'grid-cols-1' : 'grid-cols-2'
                      } gap-board min-h-[36px] empty:hidden`}
                    >
                      {!isRewardEdited && (
                        <Row
                          className={`items-center justify-center gap-1 clickable ${
                            isRewardOwner ? '' : 'not-clickable'
                          }`}
                          onClick={() => onClickIncreaseReward?.({ reward })}
                        >
                          <Icon iconSrc="/icons/create-farm-plus.svg" size="xs" className="text-[#abc4ff80]" />
                          <div className="text-xs text-[#abc4ff] font-medium">Add more rewards</div>
                        </Row>
                      )}

                      <Row
                        className={`items-center justify-center gap-1 clickable ${
                          isRewardOwner && isMeaningfulNumber(toString(reward.originData.claimableRewards))
                            ? ''
                            : 'not-clickable'
                        }`}
                        onClick={() =>
                          onClaimReward?.({
                            reward,
                            onTxSuccess: () => {
                              setTimeout(() => {
                                useCreateFarms.setState((s) =>
                                  produce(s, (draft) => {
                                    const target = draft.rewards.find((r) => r.id === reward.id)
                                    if (target?.originData) {
                                      target.originData.claimableRewards =
                                        target?.token && toTokenAmount(target?.token, 0)
                                    }
                                    if (target)
                                      target.claimableRewards = target?.token && toTokenAmount(target?.token, 0)
                                  })
                                )
                              }, 300) // disable in UI
                            }
                          })
                        }
                      >
                        <Icon iconSrc="/icons/create-farm-roll-back.svg" size="xs" className="text-[#abc4ff80]" />
                        <Col>
                          <Row className="text-xs text-[#abc4ff] font-medium">
                            <div>Claim unemmitted rewards</div>
                            <Tooltip>
                              <Icon className="ml-1" size="sm" heroIconName="question-mark-circle" />
                              <Tooltip.Panel>
                                <div className="max-w-[300px]">
                                  Rewards are only emitted when LP tokens are staked in the farm. If there is a period
                                  when no LP tokens are staked, unemmitted rewards can be claimed here once farming
                                  period ends
                                </div>
                              </Tooltip.Panel>
                            </Tooltip>
                          </Row>
                          <div className="text-xs text-[#abc4ff80] font-medium">
                            {toString(reward.originData.claimableRewards)}{' '}
                            {reward.originData.claimableRewards?.token.symbol ?? 'UNKNOWN'}
                          </div>
                        </Col>
                      </Row>
                    </Grid>
                  )}
                </div>
              )}
              {hasRewardBeenEdited(reward) && (
                <Badge
                  className={`absolute -right-10 top-1/2 -translate-y-1/2 translate-x-full ${
                    canUserEdit ? 'cursor-pointer' : ''
                  }`}
                  cssColor="#39d0d8"
                  onClick={() => {
                    canUserEdit && changeSelf({ ...reward, ...reward.originData })
                  }}
                >
                  {canUserEdit ? 'Reset' : 'Added'}
                </Badge>
              )}
            </div>
          )
        }}
        onListChange={(list) => {
          useCreateFarms.setState({
            rewards: list
          })
        }}
      />
      {canUserEdit && rewards.filter((r) => r.isRewardEnded).length > 1 && (
        <Button
          className={`self-end frosted-glass-skygray my-4`}
          validators={[{ should: isCreator && existSomeClaimableRewards }]}
          size="lg"
          onClick={() => {
            const { rewards } = useCreateFarms.getState()
            onClaimAllReward?.({
              rewards,
              onTxSuccess: () => {
                setTimeout(() => {
                  useCreateFarms.setState((s) =>
                    produce(s, (draft) => {
                      for (const target of draft.rewards) {
                        if (target?.originData) {
                          target.originData.claimableRewards = target?.token && toTokenAmount(target?.token, 0)
                        }
                        if (target) target.claimableRewards = target?.token && toTokenAmount(target?.token, 0)
                      }
                    })
                  )
                }, 300) // disable in UI
              }
            })
          }}
        >
          Claim all unemmitted rewards
        </Button>
      )}
    </Col>
  )
}
