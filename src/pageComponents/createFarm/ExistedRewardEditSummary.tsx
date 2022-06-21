import useCreateFarms from '@/application/createFarm/useCreateFarm'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import { UIRewardInfo } from '@/application/createFarm/type'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import ListTable from '@/components/ListTable'
import { toUTC } from '@/functions/date/dateFormat'
import parseDuration, { getDuration, parseDurationAbsolute } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { Badge } from '@/components/Badge'
import { getRewardSignature, hasRewardBeenEdited } from '@/application/createFarm/parseRewardInfo'
import toPercentString from '@/functions/format/toPercentString'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import produce from 'immer'
import { toTokenAmount } from '@/functions/format/toTokenAmount'

export function ExistedEditRewardSummary({
  canUserEdit,
  onClickIncreaseReward,
  onClaimReward
}: {
  canUserEdit: boolean
  // --------- when edit ------------
  onClickIncreaseReward?(payload: { reward: UIRewardInfo }): void
  onClaimReward?(payload: { reward: UIRewardInfo; onTxSuccess?: () => void }): void
}) {
  const rewards = useCreateFarms((s) => s.rewards)
  const editableRewards = rewards.filter((r) => r.type === 'existed reward')
  return (
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
      renderRowItem={({ item: parsedRewardInfo, label }) => {
        const reward =
          parsedRewardInfo.originData && hasRewardBeenEdited(parsedRewardInfo)
            ? parsedRewardInfo
            : parsedRewardInfo.originData!
        if (label === 'Reward Token') {
          return reward.token ? (
            <div>
              <Row className="gap-1 items-center">
                <CoinAvatar token={reward.token} size="sm" />
                <div>{reward.token?.symbol ?? 'UNKNOWN'}</div>
              </Row>
              <Row className="gap-1 flex-wrap mt-1">
                {reward.isRewardEnded && <Badge cssColor="#da2Eef">Ended</Badge>}
                {reward.isRewardBeforeStart && <Badge cssColor="#abc4ff">Upcoming</Badge>}
                {reward.isRewarding && <Badge cssColor={'#39d0d8'}>Ongoing</Badge>}
              </Row>
            </div>
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

        if (label === 'Total Duration') {
          if (reward.isRewarding && reward.version === 'v3/v5') return '--'
          if (!reward.startTime || !reward.endTime) return
          const duration = parseDuration(getDuration(reward.endTime, reward.startTime))
          return duration.hours ? `${duration.days}D ${duration.hours}H` : `${duration.days}D`
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

        if (label === 'Rate') {
          if (reward.isRewarding && reward.version === 'v3/v5') return '--'
          const durationTime =
            reward.endTime && reward.startTime ? reward.endTime.getTime() - reward.startTime.getTime() : undefined
          const estimatedValue =
            reward.amount && durationTime ? div(reward.amount, parseDurationAbsolute(durationTime).days) : undefined
          if (!estimatedValue) return
          return (
            <div className="text-xs">
              <div>
                {toString(estimatedValue)} {reward.token?.symbol}/day
              </div>
              {reward.apr && <div>{toPercentString(reward.apr)} APR</div>}
            </div>
          )
        }
      }}
      renderRowEntry={({ contentNode, itemData: reward }) => {
        const isRewardEditable = reward.originData?.isRwardingBeforeEnd72h || reward.originData?.isRewardEnded
        return (
          <div className={isRewardEditable ? '' : 'not-selectable'}>
            {contentNode}
            {canUserEdit && isRewardEditable && (
              <div className="bg-[#abc4ff1a] rounded-md p-2 mb-4">
                {reward.originData?.isRwardingBeforeEnd72h && (
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
                  <Grid className="grid-cols-2 gap-board min-h-[36px]">
                    <Row
                      className="items-center justify-center gap-1 clickable"
                      onClick={() => onClickIncreaseReward?.({ reward })}
                    >
                      <Icon iconSrc="/icons/create-farm-plus.svg" size="xs" className="text-[#abc4ff80]" />
                      <div className="text-xs text-[#abc4ff] font-medium">Add more rewards</div>
                    </Row>

                    <Row
                      className={`items-center justify-center gap-1 clickable ${
                        isMeaningfulNumber(toString(reward.originData.claimableRewards)) ? '' : 'not-clickable'
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
                                  if (target) target.claimableRewards = target?.token && toTokenAmount(target?.token, 0)
                                })
                              )
                            }, 300) // disable in UI
                          }
                        })
                      }
                    >
                      <Icon iconSrc="/icons/create-farm-roll-back.svg" size="xs" className="text-[#abc4ff80]" />
                      <Col>
                        <div className="text-xs text-[#abc4ff] font-medium">Claim unemmitted rewards</div>
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
              <Badge className="absolute -right-10 top-1/2 -translate-y-1/2 translate-x-full" cssColor="#39d0d8">
                Edited
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
  )
}
