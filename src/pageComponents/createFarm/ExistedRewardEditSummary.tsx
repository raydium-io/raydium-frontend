import useCreateFarms from '@/application/createFarm/useCreateFarm'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import { UIRewardInfo } from '@/application/createFarm/type'
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
import { isDateAfter } from '@/functions/date/judges'
import { Badge } from '@/components/Badge'
import { hasRewardBeenEdited } from '@/application/createFarm/parseRewardInfo'
import toPercentString from '@/functions/format/toPercentString'

export function ExistedEditRewardSummary({
  canUserEdit,
  onClickIncreaseReward,
  onClaimReward
}: {
  canUserEdit: boolean
  // --------- when edit ------------
  onClickIncreaseReward?(payload: { reward: UIRewardInfo }): void
  onClaimReward?(payload: { reward: UIRewardInfo }): void
}) {
  const rewards = useCreateFarms((s) => s.rewards)
  const editableRewards = rewards.filter((r) => r.type === 'existed reward')
  const currentChainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const currentChainTime = Date.now() + (currentChainTimeOffset ?? 0)
  return (
    <ListTable
      list={editableRewards}
      labelMapper={[
        {
          label: 'Asset',
          cssGridItemWidth: '.9fr'
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
          label: 'Rate'
        }
      ]}
      renderRowItem={({ item: reward, label }) => {
        if (label === 'Asset') {
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

        if (label === 'Day and Hours') {
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
              <div>{reward.apr ? toPercentString(reward.apr) : '--'} APR</div>
            </div>
          )
        }
      }}
      renderRowEntry={({ contentNode, itemData: reward }) => {
        return (
          <div
            className={
              isDateAfter(currentChainTime, offsetDateTime(reward.originData?.endTime, { hours: -0.5 }))
                ? ''
                : 'not-selectable'
            }
          >
            {contentNode}
            {canUserEdit && (reward.originData?.isRwardingBeforeEnd72h || reward.originData?.isRewardEnded) && (
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
                  <Grid className="grid-cols-2 gap-board">
                    <Row
                      className="items-center justify-center gap-1 clickable"
                      onClick={() => onClickIncreaseReward?.({ reward })}
                    >
                      <Icon iconSrc="/icons/create-farm-plus.svg" size="xs" className="text-[#abc4ff80]" />
                      <div className="text-xs text-[#abc4ff] font-medium">Add more rewards</div>
                    </Row>

                    <Row
                      className="items-center justify-center gap-1 clickable"
                      onClick={() => onClaimReward?.({ reward })}
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
