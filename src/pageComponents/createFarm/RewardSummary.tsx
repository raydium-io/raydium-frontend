import useCreateFarms, { CreateFarmStore } from '@/application/createFarm/useCreateFarm'
import CoinAvatar from '@/components/CoinAvatar'
import Icon from '@/components/Icon'
import ListTable from '@/components/ListTable'
import Row from '@/components/Row'
import { toUTC } from '@/functions/date/dateFormat'
import parseDuration, { getDuration, parseDurationAbsolute } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'

export function RewardSummery({
  activeIndex,
  onActiveIndexChange
}: {
  activeIndex?: number
  onActiveIndexChange?(index: number): void
}) {
  const rewards = useCreateFarms((s) => s.rewards)
  return (
    <ListTable
      list={rewards}
      labelMapper={[
        {
          key: 'token',
          label: 'Asset',
          cssGridItemWidth: '.6fr'
        },
        {
          key: 'amount',
          label: 'Amount',
          cssGridItemWidth: '.6fr'
        },
        {
          label: 'Day and Hours'
        },
        {
          key: ['startTime', 'endTime'],
          label: 'Period (yy-mm-dd)',
          cssGridItemWidth: '1.5fr'
        },
        {
          label: 'Est. daily rewards'
        }
      ]}
      // className="backdrop-brightness-"
      rowClassName={({ index }) =>
        `${activeIndex === index ? 'backdrop-brightness-90' : 'hover:backdrop-brightness-95'} `
      }
      onClickRow={({ index }) => {
        onActiveIndexChange?.(index)
      }}
      renderItem={({ item, label, key }) => {
        if (label === 'Asset') {
          return item.token ? (
            <Row className="gap-1 items-center">
              <CoinAvatar token={item.token} size="sm" />
              <div>{item.token?.symbol ?? 'UNKNOWN'}</div>
            </Row>
          ) : (
            '--'
          )
        }

        if (label === 'Amount') {
          return item.amount ? formatNumber(item.amount) : undefined
        }

        if (label === 'Day and Hours') {
          if (!item.startTime || !item.endTime) return
          const duration = parseDuration(getDuration(item.endTime, item.startTime))
          return `${duration.days} Days ${duration.hours} Hours`
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
          const durationDays = item.endTime
            ? parseDurationAbsolute(item.endTime.getTime() - (item.startTime?.getTime() ?? Date.now())).days
            : undefined
          const estimatedValue = item.amount && durationDays ? div(item.amount, durationDays) : undefined
          if (!estimatedValue) return
          return (
            <div className="text-xs">
              {toString(estimatedValue)} {item.token?.symbol}
            </div>
          )
        }
      }}
      renderRowControls={({ destorySelf, index: idx }) => (
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
            className={`clickable text-[#abc4ff] ${rewards.length > 1 ? 'hover:text-[#DA2EEF]' : 'not-clickable'}`}
            onClick={() => rewards.length > 1 && destorySelf()}
          />
        </Row>
      )}
      onListChange={(list) => {
        useCreateFarms.setState({
          rewards: list
        })
      }}
    />
  )
}
