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
      rowClassName={({ index }) =>
        mode === 'selectable'
          ? `${activeIndex === index ? 'backdrop-brightness-90' : 'hover:backdrop-brightness-95'}`
          : ''
      }
      onClickRow={({ index }) => {
        onActiveIndexChange?.(index)
      }}
      renderItem={({ item, label, key }) => {
        const rewardToken = getToken(item.tokenMint)
        if (label === 'Asset') {
          return item.tokenMint ? (
            <Row className="gap-1 items-center">
              <CoinAvatar token={rewardToken} size="sm" />
              <div>{rewardToken?.symbol ?? 'UNKNOWN'}</div>
            </Row>
          ) : (
            '--'
          )
        }

        if (label === 'Amount') {
          return item.amount ? (
            <div className="break-all">{formatNumber(item.amount, { fractionLength: rewardToken?.decimals ?? 6 })}</div>
          ) : undefined
        }

        if (label === 'Day and Hours') {
          if (!item.startTime || !item.endTime) return
          const duration = parseDuration(getDuration(item.endTime, item.startTime))
          return duration.hours ? `${duration.days}D ${duration.hours} H` : `${duration.days}D`
        }

        if (label === 'Period (yy-mm-dd)') {
          if (!item.startTime || !item.endTime) return
          return (
            <div>
              <div>{toUTC(item.startTime)}</div>
              <div>{toUTC(item.endTime)}</div>
            </div>
          )
        }

        if (label === 'Est. daily rewards') {
          const durationTime =
            item.endTime && item.startTime ? item.endTime.getTime() - item.startTime.getTime() : undefined
          const estimatedValue =
            item.amount && durationTime ? div(item.amount, parseDurationAbsolute(durationTime).days) : undefined
          if (!estimatedValue) return
          return (
            <div className="text-xs">
              {toString(estimatedValue)} {rewardToken?.symbol}
            </div>
          )
        }
      }}
      renderRowControls={
        mode === 'selectable'
          ? ({ destorySelf, index: idx }) => (
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
            )
          : mode === 'edit'
          ? ({ destorySelf, index: idx, itemData }) => (
              <Row className="gap-2">
                <Icon
                  size="smi"
                  heroIconName="plus-circle"
                  className="clickable clickable-opacity-effect text-[#abc4ff]"
                  onClick={() => {
                    onClickIncreaseReward?.({ reward: itemData, rewardIndex: idx })
                  }}
                />
                <Icon
                  size="smi"
                  heroIconName="trash"
                  className={`clickable text-[#abc4ff] ${rewards.length > 1 ? 'hover:text-[#DA2EEF]' : 'hidden'}`}
                  onClick={() => rewards.length > 1 && destorySelf()}
                />
              </Row>
            )
          : undefined
      }
      onListChange={(list) => {
        useCreateFarms.setState({
          rewards: list
        })
      }}
    />
  )
}
