import { useCallback, useEffect, useState } from 'react'
import useAppSettings from '@/application/common/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useToken from '@/application/token/useToken'
import Row from '@/components/Row'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import ListTable from '@/components/ListTable'
import { Badge } from '@/components/Badge'
import { mul, div } from '@/functions/numberish/operations'
import { toUTC } from '@/functions/date/dateFormat'
import { isDateAfter, isDateBefore } from '@/functions/date/judges'
import formatNumber from '@/functions/format/formatNumber'
import toPercentString from '@/functions/format/toPercentString'
import parseDuration, { getDuration } from '@/functions/date/parseDuration'
import Button from '@/components/Button'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import Icon from '@/components/Icon'
import { Unpacked } from '@/types/generics'
import AddMoreDialog, { UpdateData } from './AddMoreDialog'
import txCollectReward from '@/application/concentrated/txCollectReward'
import { DAY_SECONDS } from './utils'

interface Props {
  pool: HydratedConcentratedInfo
  onUpdateReward: (data: Map<string, UpdateData>) => void
  previewMode: boolean
}

export default function ExistingRewardInfo({ pool, onUpdateReward, previewMode }: Props) {
  const [isMobile, isApprovePanelShown] = useAppSettings((s) => [s.isMobile, s.isApprovePanelShown])
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const [currentReward, setCurrentReward] = useState<
    (Unpacked<HydratedConcentratedInfo['rewardInfos']> & { isRewardEnded: boolean }) | undefined
  >()
  const [updateData, setUpdateData] = useState<Map<string, UpdateData>>(new Map())
  const onlineCurrentDate = Date.now() + (chainTimeOffset ?? 0)
  const handleClose = useCallback(() => setCurrentReward(undefined), [])

  const handleUpdateData = useCallback((props: { rewardMint: string; data: UpdateData }) => {
    const { rewardMint, data } = props
    setUpdateData((preData) => {
      preData.set(rewardMint, data)
      return new Map(Array.from(preData))
    })
  }, [])

  const handleReset = useCallback((mint: string) => {
    setUpdateData((preData) => {
      preData.delete(mint)
      return new Map(Array.from(preData))
    })
  }, [])

  useEffect(() => {
    onUpdateReward(updateData)
  }, [updateData, onUpdateReward])

  return (
    <>
      <ListTable
        list={pool.rewardInfos}
        type={isMobile ? 'item-card' : 'list-table'}
        className={isMobile ? 'gap-4' : ''}
        getItemKey={(r) => `${r.tokenMint.toBase58()}-${r.creator.toBase58()}`}
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
        renderRowItem={({ item: reward, label, index }) => {
          const { openTime, endTime, rewardToken, perSecond, rewardPerWeek } = reward
          const isRewardBeforeStart = Boolean(openTime && isDateBefore(onlineCurrentDate, openTime))
          const isRewardEnded = Boolean(endTime && isDateAfter(onlineCurrentDate, endTime))
          const isRewarding = (!openTime && !endTime) || (!isRewardEnded && !isRewardBeforeStart)
          const rewardDuration = getDuration(endTime, openTime)
          function getDurationText(val) {
            const duration = parseDuration(val)
            return duration.hours ? `${duration.days}D ${duration.hours}H` : `${duration.days}D`
          }

          const rewardDecimals = rewardToken?.decimals || 6
          const updateReward = updateData.get(reward.rewardToken!.mint.toBase58())
          const updateDuration = updateReward ? getDuration(updateReward.endTime, updateReward.openTime) : 0

          const getRewardBadge = () => {
            if (isRewardEnded)
              return (
                <Badge className="w-fit" cssColor="#da2Eef">
                  Ended
                </Badge>
              )
            if (isRewardBeforeStart)
              return (
                <Badge className="w-fit" cssColor="#abc4ff">
                  Upcoming
                </Badge>
              )
            if (isRewarding)
              return (
                <Badge className="w-fit" cssColor="#39d0d8">
                  Ongoing
                </Badge>
              )
            return null
          }

          if (label === 'Asset') {
            return reward.rewardToken ? (
              <Col className="h-full gap-1 justify-center">
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
                      mul(
                        div(perSecond.toFixed(rewardDecimals), 10 ** rewardDecimals),
                        Math.floor(rewardDuration / 1000)
                      ),
                      {
                        fractionLength: rewardDecimals
                      }
                    )}
                  </Col>
                ) : undefined}
                {updateReward && (
                  <Col className="grow justify-center text-[#39d0d8]">
                    {formatNumber(
                      mul(div(updateReward.perSecond, 10 ** rewardDecimals), Math.floor(updateDuration / 1000)),
                      {
                        fractionLength: rewardDecimals
                      }
                    )}
                  </Col>
                )}
              </Grid>
            )
          }

          if (label === 'Duration') {
            return (
              <Grid className="h-full gap-3">
                {openTime && endTime ? (
                  <Col className="justify-center">
                    <Row className="break-all items-center gap-1">
                      {getDurationText(rewardDuration)}
                      {getRewardBadge()}
                    </Row>
                  </Col>
                ) : undefined}
                {updateReward && (
                  <Col className="grow justify-center text-[#39d0d8]">
                    <Row className="break-all items-center gap-1">
                      {getDurationText(updateDuration)}
                      <Badge cssColor="#39d0d8">New</Badge>
                    </Row>
                  </Col>
                )}
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
                {updateReward && (
                  <Col className="grow justify-center text-[#39d0d8]">
                    <div>{toUTC(updateReward.openTime)}</div>
                    <div>{toUTC(updateReward.endTime)}</div>
                  </Col>
                )}
              </Grid>
            )
          }

          if (label === 'Rate') {
            return (
              <Grid className="gap-4 h-full">
                <Col className="grow justify-center text-xs">
                  <div>
                    {formatNumber(rewardPerWeek)}
                    /week
                  </div>
                  {pool.rewardApr24h[index] && <div>{toPercentString(pool.rewardApr24h[index])} APR</div>}
                </Col>
                {updateReward && (
                  <Col className="grow justify-center text-[#39d0d8]">
                    <div>
                      {formatNumber(mul(div(updateReward.perSecond, 10 ** rewardDecimals), 3600 * 24 * 7), {
                        fractionLength: reward.rewardToken?.decimals ?? 6
                      })}
                      /week
                    </div>
                    <div>
                      {toPercentString(
                        div(
                          mul(
                            mul(div(updateReward.perSecond, 10 ** rewardDecimals), DAY_SECONDS * 365),
                            tokenPrices[reward.tokenMint.toBase58()] || 0
                          ),
                          pool.tvl
                        )
                      )}{' '}
                      APR
                    </div>
                  </Col>
                )}
              </Grid>
            )
          }
        }}
        renderItemActionButtons={({ itemData: reward }) => {
          const hasUnClaimed = isMeaningfulNumber(reward.remainingRewards)
          const { endTime } = reward
          const isRewardEnded = Boolean(endTime && isDateAfter(onlineCurrentDate, endTime))
          const canAddMore =
            endTime - onlineCurrentDate <= 1000 * 3600 * 24 * 3 && !updateData.get(reward.rewardToken!.mint.toBase58())

          return canAddMore ? (
            <div className="flex bg-[#abc4ff1a] mobile:bg-transparent items-center rounded-md p-2 mobile:p-0 mb-4 mobile:mb-0 empty:hidden">
              <Button
                onClick={() => setCurrentReward({ ...reward, isRewardEnded })}
                noComponentCss
                className="flex flex-1 justify-center text-secondary-title text-xs font-medium clickable mobile:py-4"
              >
                <Icon heroIconName="plus" size="sm" />
                Add more rewards
              </Button>
              <Button
                noComponentCss
                disabled={!hasUnClaimed || isApprovePanelShown}
                onClick={() => {
                  txCollectReward({ currentAmmPool: pool, rewardMint: reward.tokenMint }).then(() => {
                    useConcentrated.getState().refreshConcentrated()
                  })
                }}
                className={`flex flex-1 gap-1 justify-center items-center text-secondary-title text-xs font-medium ${
                  hasUnClaimed && !isApprovePanelShown ? 'clickable' : 'cursor-default opacity-50'
                } mobile:py-4`}
              >
                <Icon iconSrc="/icons/create-farm-roll-back.svg" size="xs" className="text-[#abc4ff80]" />
                <Col className="items-start">
                  Claim unemmitted rewards
                  <span className="text-[#abc4ff80]">
                    {div(reward.remainingRewards, 10 ** (reward.rewardToken?.decimals || 6))?.toSignificant(
                      reward.rewardToken?.decimals || 6
                    )}{' '}
                    {reward.rewardToken?.symbol}
                  </span>
                </Col>
              </Button>
            </div>
          ) : null
        }}
        renderControlButtons={({ itemData: reward }) => {
          return updateData.get(reward.rewardToken!.mint.toBase58()) ? (
            <Badge
              className="cursor-pointer"
              cssColor={previewMode ? '#39d0d8' : '#abc4ff'}
              onClick={previewMode ? undefined : () => handleReset(reward.rewardToken!.mint.toBase58())}
            >
              {previewMode ? 'Added' : 'reset'}
            </Badge>
          ) : null
        }}
      />
      <AddMoreDialog
        open={!!currentReward}
        reward={currentReward}
        chainTimeOffset={chainTimeOffset}
        onClose={handleClose}
        onConfirm={handleUpdateData}
      />
    </>
  )
}
