import { CurrencyAmount } from '@raydium-io/raydium-sdk'
import useAppSettings from '@/application/common/useAppSettings'
import useToken from '@/application/token/useToken'
import Row from '@/components/Row'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import CoinAvatar from '@/components/CoinAvatar'
import ListTable from '@/components/ListTable'
import parseDuration, { getDuration } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { toUTC } from '@/functions/date/dateFormat'
import { mul, div } from '@/functions/numberish/operations'
import toPercentString from '@/functions/format/toPercentString'
import { NewReward } from './AddNewReward'
import { DAY_SECONDS } from './utils'
import { isMeaningfulNumber } from '@/functions/numberish/compare'

interface Props {
  newRewards: NewReward[]
  tvl?: CurrencyAmount
  onClickRow?: (dataIdx: number) => void
  onDelete?: (dataIdx: number) => void
}

export default function NewRewardTable({ newRewards, tvl, onClickRow, onDelete }: Props) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const tokenPrices = useToken((s) => s.tokenPrices)

  return (
    <ListTable
      list={newRewards}
      type={isMobile ? 'item-card' : 'list-table'}
      className={isMobile ? 'gap-4 mb-8' : 'mb-8'}
      getItemKey={() => Date.now()}
      labelMapper={[
        {
          label: 'Asset',
          cssGridItemWidth: '.7fr'
        },
        {
          label: 'Amount'
        },
        {
          label: 'Duration',
          cssGridItemWidth: '1fr'
        },
        {
          label: 'Period',
          cssGridItemWidth: '1.5fr'
        },
        {
          label: 'Rate'
        }
      ]}
      rowClassName={() => (onClickRow ? 'clickable hover:backdrop-brightness-95' : '')}
      onClickRow={({ index }) => onClickRow?.(index)}
      renderRowItem={({ item: reward, label }) => {
        const { openTime, endTime, perDay, token } = reward
        const rewardDuration = getDuration(endTime || 0, openTime || 0)
        const hasPerDay = isMeaningfulNumber(perDay)
        function getDurationText(val) {
          const duration = parseDuration(val)
          return duration.hours ? `${duration.days}D ${duration.hours}H` : `${duration.days}D`
        }

        if (label === 'Asset') {
          return reward.token ? (
            <Col className="h-full gap-1 justify-center">
              <Row className="gap-1 items-center">
                <CoinAvatar token={reward.token} size="sm" />
                <div>{reward.token.symbol ?? 'UNKNOWN'}</div>
              </Row>
            </Col>
          ) : (
            '--'
          )
        }

        if (label === 'Amount') {
          return isMeaningfulNumber(rewardDuration) ? (
            <Grid className="gap-4 h-full">
              {hasPerDay ? (
                <Col className="grow break-all justify-center">
                  {formatNumber(mul(perDay, Math.floor(rewardDuration / 1000) / DAY_SECONDS), {
                    fractionLength: token?.decimals ?? 6
                  })}
                </Col>
              ) : undefined}
            </Grid>
          ) : null
        }

        if (label === 'Duration') {
          return (
            <Grid className="h-full gap-3">
              {openTime && endTime ? (
                <Col className="justify-center">
                  <Row className="break-all items-center gap-1">{getDurationText(rewardDuration)}</Row>
                </Col>
              ) : undefined}
            </Grid>
          )
        }

        if (label === 'Period') {
          if (!openTime || !endTime) return
          return (
            <Grid className="gap-4 h-full">
              <Col className="grow justify-center">
                <div>{toUTC(openTime)}</div>
                <div>{toUTC(endTime)}</div>
              </Col>
            </Grid>
          )
        }

        if (label === 'Rate') {
          return hasPerDay ? (
            <Grid className="gap-4 h-full">
              <Col className="grow justify-center text-xs">
                <div>
                  {formatNumber(mul(perDay, 7), { fractionLength: token?.decimals || 6 })}
                  /day
                </div>
                <div>
                  {toPercentString(
                    div(mul(mul(perDay, token ? tokenPrices[token.mint.toBase58()] : 0), 365), tvl || 0)
                  )}{' '}
                  APR
                </div>
              </Col>
            </Grid>
          ) : null
        }
      }}
      renderControlButtons={({ index }) => {
        return onDelete ? (
          <Icon className="cursor-pointer" heroIconName="trash" size="sm" onClick={() => onDelete(index)} />
        ) : null
      }}
    />
  )
}
