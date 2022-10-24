import useAppSettings from '@/application/common/useAppSettings'
import Row from '@/components/Row'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import CoinAvatar from '@/components/CoinAvatar'
import ListTable from '@/components/ListTable'
import parseDuration, { getDuration } from '@/functions/date/parseDuration'
import formatNumber from '@/functions/format/formatNumber'
import { toUTC } from '@/functions/date/dateFormat'
import { mul } from '@/functions/numberish/operations'
import { NewReward } from './AddNewReward'
import { DAY_SECONDS } from './utils'

interface Props {
  newRewards: NewReward[]
}

export default function NewRewardTable({ newRewards }: Props) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <ListTable
      list={newRewards}
      type={isMobile ? 'item-card' : 'list-table'}
      className={isMobile ? 'gap-4 mb-8' : 'mb-8'}
      getItemKey={(r) => r.token?.mint.toBase58()}
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
      renderRowItem={({ item: reward, label }) => {
        const { openTime, endTime, perDay, token } = reward
        const rewardDuration = getDuration(endTime!, openTime!)
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
          return (
            <Grid className="gap-4 h-full">
              {perDay ? (
                <Col className="grow break-all justify-center">
                  {formatNumber(mul(perDay, Math.floor(rewardDuration / 1000) / DAY_SECONDS), {
                    fractionLength: token?.decimals ?? 6
                  })}
                </Col>
              ) : undefined}
            </Grid>
          )
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
          return (
            <Grid className="gap-4 h-full">
              <Col className="grow justify-center text-xs">
                <div>
                  {formatNumber(perDay, { fractionLength: token?.decimals || 6 })}
                  /day
                </div>
              </Col>
            </Grid>
          )
        }
      }}
    />
  )
}
