import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { CreateFarmStore, UIRewardInfo } from '@/application/createFarm/type'
import useToken from '@/application/token/useToken'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import ListTable from '@/components/ListTable'
import Row from '@/components/Row'
import { toUTC } from '@/functions/date/dateFormat'
import parseDuration, { getDuration, parseDurationAbsolute } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'

/**
 * mode: list show
 * mode: list show (item select)
 * mode: edit
 */
export function RewardEditSummery({
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
        const rewardToken = getToken(reward.tokenMint)
        if (label === 'Asset') {
          return reward.tokenMint ? (
            <Row className="gap-1 items-center">
              <CoinAvatar token={rewardToken} size="sm" />
              <div>{rewardToken?.symbol ?? 'UNKNOWN'}</div>
            </Row>
          ) : (
            '--'
          )
        }

        if (label === 'Amount') {
          if (reward.isRewarding && reward.version === 'v3/v5') return '--'
          return reward.amount ? (
            <div className="break-all">
              {formatNumber(reward.amount, { fractionLength: rewardToken?.decimals ?? 6 })}
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
              {toString(estimatedValue)} {rewardToken?.symbol}
            </div>
          )
        }
      }}
      renderRowEntry={({ contentNode, index: idx, itemData: reward }) => (
        <div>
          {contentNode}
          <div className="bg-[#abc4ff1a] rounded-md p-2 mb-4">
            {reward && ( // TODO: temp mock
              <Col className="items-center" onClick={() => onClickIncreaseReward?.({ reward, rewardIndex: idx })}>
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
                  className="items-center justify-center gap-1"
                  onClick={() => onClickIncreaseReward?.({ reward, rewardIndex: idx })}
                >
                  <Icon iconSrc="/icons/create-farm-plus.svg" size="xs" className="text-[#abc4ff80]" />
                  <div className="text-xs text-[#abc4ff] font-medium">Add more rewards</div>
                </Row>

                <Row
                  className="items-center justify-center gap-1"
                  onClick={() => onClaimReward?.({ reward, rewardIndex: idx })}
                >
                  <Icon iconSrc="/icons/create-farm-roll-back.svg" size="xs" className="text-[#abc4ff80]" />
                  <Col>
                    <div className="text-xs text-[#abc4ff] font-medium">Claim unemmitted rewards</div>
                    <div className="text-xs text-[#abc4ff80] font-medium">1111 RAY</div>
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
