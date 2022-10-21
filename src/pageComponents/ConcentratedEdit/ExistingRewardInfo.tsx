import { useCallback, useState } from 'react'
import useAppSettings from '@/application/common/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import Row from '@/components/Row'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import ListTable from '@/components/ListTable'
import { Badge } from '@/components/Badge'
import { mul, div, add } from '@/functions/numberish/operations'
import { toUTC } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import formatNumber from '@/functions/format/formatNumber'
import toPercentString from '@/functions/format/toPercentString'
import parseDuration, { getDuration } from '@/functions/date/parseDuration'
import Button from '@/components/Button'
import toFraction from '@/functions/numberish/toFraction'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import Icon from '@/components/Icon'
import { Unpacked } from '@/types/generics'
import AddMoreDialog from './AddMoreDialog'

interface Props {
  pool: HydratedConcentratedInfo
}

export default function ExistingRewardInfo({ pool }: Props) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const [currentReward, setCurrentReward] = useState<Unpacked<HydratedConcentratedInfo['rewardInfos']> | undefined>()

  const handleClose = useCallback(() => setCurrentReward(undefined), [])

  return (
    <>
      <ListTable
        list={pool.rewardInfos}
        type={isMobile ? 'item-card' : 'list-table'}
        className={isMobile ? 'gap-4' : ''}
        getItemKey={(r) => `${r.tokenMint.toBase58()}-${r.authority.toBase58()}`}
        labelMapper={[
          {
            label: 'Asset',
            cssGridItemWidth: '.9fr'
          },
          {
            label: 'Amount'
          },
          {
            label: 'Duration',
            cssGridItemWidth: '.6fr'
          },
          {
            label: 'Period',
            cssGridItemWidth: '1.5fr'
          },
          {
            label: 'Rate'
          }
        ]}
        renderRowItem={({ item: reward, label, index }) => {
          const { openTime, endTime, rewardToken, perSecond } = reward
          const onlineCurrentDate = Date.now() + (chainTimeOffset ?? 0)
          const isRewardBeforeStart = Boolean(openTime && isDateBefore(onlineCurrentDate, openTime))
          const isRewardEnded = Boolean(endTime && isDateAfter(onlineCurrentDate, endTime))
          const isRewarding = (!openTime && !endTime) || (!isRewardEnded && !isRewardBeforeStart)
          const rewardDuration = getDuration(endTime, openTime)
          function getDurationText() {
            const duration = parseDuration(rewardDuration)
            return duration.hours ? `${duration.days}D ${duration.hours}H` : `${duration.days}D`
          }

          if (label === 'Asset') {
            return reward.rewardToken ? (
              <Col className="h-full justify-center">
                <Row className="gap-1 items-center">
                  <CoinAvatar token={reward.rewardToken} size="sm" />
                  <div>{reward.rewardToken.symbol ?? 'UNKNOWN'}</div>
                </Row>
              </Col>
            ) : (
              '--'
            )
          }

          if (label === 'Amount') {
            return (
              <Grid className="gap-4 h-full">
                {perSecond ? (
                  <Col className="grow break-all justify-center">
                    {formatNumber(
                      mul(div(perSecond, 10 ** (rewardToken?.decimals || 6)), Math.floor(rewardDuration / 1000)),
                      {
                        fractionLength: reward.rewardToken?.decimals ?? 6
                      }
                    )}
                  </Col>
                ) : undefined}
              </Grid>
            )
          }

          if (label === 'Duration') {
            return (
              <Grid className="h-full">
                {openTime && endTime ? (
                  <>
                    <Col className="grow break-all justify-center">{getDurationText()}</Col>
                    <Row className="gap-1 flex-wrap mt-1">
                      {isRewardEnded && <Badge cssColor="#da2Eef">Ended</Badge>}
                      {isRewardBeforeStart && <Badge cssColor="#abc4ff">Upcoming</Badge>}
                      {isRewarding && <Badge cssColor="#39d0d8">Ongoing</Badge>}
                    </Row>
                  </>
                ) : undefined}
              </Grid>
            )
          }

          if (label === 'Period') {
            if (!openTime || !endTime) return
            return (
              <Grid className={`gap-4 h-full`}>
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
                {
                  <Col className="grow justify-center text-xs">
                    <div>
                      {formatNumber(mul(div(perSecond, 10 ** (rewardToken?.decimals || 6)), 3600 * 24), {
                        fractionLength: reward.rewardToken?.decimals ?? 6
                      })}
                      /day
                    </div>
                    {pool.rewardApr24h[index] && <div>{toPercentString(pool.rewardApr24h[index])} APR</div>}
                  </Col>
                }
              </Grid>
            )
          }
        }}
        renderItemActionButtons={({ index, itemData: reward }) => {
          const unClaimed = pool.userPositionAccount?.[index].rewardInfos.reduce(
            (acc, cur) => add(acc, cur.penddingReward || 0),
            toFraction(0)
          )
          const hasUnClaimed = !!unClaimed && isMeaningfulNumber(unClaimed)

          return (
            <div className="flex bg-[#abc4ff1a] mobile:bg-transparent rounded-md p-2 mobile:p-0 mb-4 mobile:mb-0 empty:hidden">
              <Button
                onClick={() => setCurrentReward(reward)}
                noComponentCss
                className="flex flex-1 justify-center text-secondary-title text-xs font-medium clickable mobile:py-4"
              >
                <Icon heroIconName="plus" size="sm" />
                Add more rewards
              </Button>
              {hasUnClaimed && (
                <Button
                  noComponentCss
                  disabled={!hasUnClaimed}
                  className="flex flex-1 justify-center items-center text-secondary-title text-xs font-medium clickable mobile:py-4"
                >
                  <img className="mr-2.5" src="/icons/rollback.svg" />
                  <Col className="items-start">
                    Claim unemmitted rewards
                    <span className="text-[#abc4ff80]">
                      {div(unClaimed, 10 ** (reward.rewardToken?.decimals || 6))?.toSignificant(
                        reward.rewardToken?.decimals || 6
                      )}{' '}
                      {reward.rewardToken?.symbol}
                    </span>
                  </Col>
                </Button>
              )}
            </div>
          )
        }}
        renderControlButtons={({ changeSelf, itemData: reward }) => {
          return (
            <Badge className="cursor-pointer" cssColor="#abc4ff">
              reset
            </Badge>
          )
        }}
      />
      <AddMoreDialog open={!!currentReward} reward={currentReward} onClose={handleClose} />
    </>
  )
}
