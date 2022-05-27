import useCreateFarms, { CreateFarmStore, RewardInfo } from '@/application/createFarm/useCreateFarm'
import useToken from '@/application/token/useToken'
import CoinAvatar from '@/components/CoinAvatar'
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
export function RewardSummery({
  mode,
  activeIndex,
  onActiveIndexChange,
  onClickIncreaseReward,
  onDeleteReward
}: {
  mode: 'normal' | 'selectable' | 'edit'

  // --------- when selectable ------------
  activeIndex?: number
  onActiveIndexChange?(index: number): void

  // --------- when edit ------------
  onClickIncreaseReward?(payload: { reward: RewardInfo; rewardIndex: number }): void
  onDeleteReward?(payload: { reward: RewardInfo; rewardIndex: number }): void
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
      rowClassName={({ index, itemData: reward }) => {
        if (!reward.canEdit) return `not-clickable`
        if (mode === 'selectable') {
          return `${activeIndex === index ? 'backdrop-brightness-90' : 'hover:backdrop-brightness-95'}`
        }
        return ''
      }}
      onClickRow={({ index }) => {
        onActiveIndexChange?.(index)
      }}
      renderRowItem={({ item: reward, label, key }) => {
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
      renderRowEntry={({ contentNode, destorySelf, index: idx, itemData: reward }) => {
        const controlsNode = reward.canEdit ? (
          mode === 'selectable' ? (
            <Row className="gap-2">
              <Icon
                size="smi"
                heroIconName="pencil"
                className="clickable clickable-opacity-effect text-[#abc4ff]"
                onClick={() => {
                  onActiveIndexChange?.(idx)
                }}
              />
              <Icon
                size="smi"
                heroIconName="trash"
                className={`clickable text-[#abc4ff] ${rewards.length > 1 ? 'hover:text-[#DA2EEF]' : 'hidden'}`}
                onClick={() => rewards.length > 1 && destorySelf()}
              />
            </Row>
          ) : mode === 'edit' ? (
            <Row className="gap-2">
              <Icon
                size="smi"
                heroIconName="plus-circle"
                className="clickable clickable-opacity-effect text-[#abc4ff]"
                onClick={() => {
                  onClickIncreaseReward?.({ reward, rewardIndex: idx })
                }}
              />
              <Icon
                size="smi"
                heroIconName="trash"
                className={`clickable text-[#abc4ff] ${rewards.length > 1 ? 'hover:text-[#DA2EEF]' : 'hidden'}`}
                onClick={() => {
                  if (rewards.length > 1) {
                    destorySelf()
                    onDeleteReward?.({ reward, rewardIndex: idx })
                  }
                }}
              />
            </Row>
          ) : null
        ) : null

        return (
          <>
            {contentNode}
            <div className="absolute -right-10 top-1/2 -translate-y-1/2 translate-x-full">{controlsNode}</div>
          </>
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
