import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import useAppSettings from '@/application/appSettings/useAppSettings'
import { HydratedIdoInfo } from '@/application/ido/type'
import useIdo from '@/application/ido/useIdo'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import IdoCountDownClock from '@/components/IdoCountDownClock'
import Icon, { socialIconSrcMap } from '@/components/Icon'
import Link from '@/components/Link'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import Tabs from '@/components/Tabs'
import { getTime, toUTC } from '@/functions/date/dateFormat'
import { currentIsBefore } from '@/functions/date/judges'
import { eq, gt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import txIdoClaim from '@/application/ido/utils/txIdoClaim'
import Image from '@/components/Image'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import formatNumber from '@/functions/format/formatNumber'
import { routeTo } from '@/application/routeTools'
import { FadeIn } from '@/components/FadeIn'
import Grid from '@/components/Grid'
import AutoBox from '@/components/AutoBox'
import { TimeStamp } from '@/functions/date/interface'
import parseDuration from '@/functions/date/parseDuration'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import useStaking from '@/application/staking/useStaking'
import toPercentString from '@/functions/format/toPercentString'
import LoadingCircle from '@/components/LoadingCircle'
import useUpdate from '@/hooks/useUpdate'

export default function AcceleRaytor() {
  const infos = useIdo((s) => s.idoHydratedInfos)
  return (
    <PageLayout mobileBarTitle="AcceleRaytor" metaTitle="AcceleRaytor - Raydium">
      <AcceleRaytorHeaderCyberpunk />
      {Object.keys(infos).length ? <IdoList /> : <LoadingCircle className="mx-auto my-12" />}
    </PageLayout>
  )
}

function AcceleRaytorHeaderCyberpunk() {
  return (
    <Col className="items-center gap-20 mb-11">
      <Col className="items-center cyberpunk-bg-light-acceleraytor mobile:scale-75 mobile:translate-y-4">
        <Image src="/logo/accecleraytor-text-logo.svg" />
        <div className="text-[20px] mt-2 font-medium text-[#ABC4FF80] whitespace-nowrap">
          Buy new tokens launching on Solana.
        </div>
      </Col>
    </Col>
  )
}

function IdoList() {
  const currentTab = useIdo((s) => s.currentTab)
  const infos = useIdo((s) => s.idoHydratedInfos)
  const isMobile = useAppSettings((s) => s.isMobile)

  const upcomingPools = useMemo(() => Object.values(infos).filter((i) => i.isUpcoming), [infos])
  const openPools = Object.values(infos).filter((i) => i.isOpen)
  const closedPools = Object.values(infos).filter((i) => i.isClosed || i.canWithdrawBase)

  // because upcoming may change many times
  const hasSetUpcomingTab = useRef(false)
  if (!hasSetUpcomingTab.current && upcomingPools.length) {
    useIdo.setState({ currentTab: 'Upcoming Pools' })
    hasSetUpcomingTab.current = true
  }
  return (
    <>
      {openPools.length > 0 && (
        <>
          <div className="text-2xl mobile:text-base mobile:px-4 mb-6 mobile:mb-4 font-semibold text-white w-[min(890px,100%)] self-center">
            Open Pool{openPools.length > 1 ? 's' : ''}
          </div>
          <Col className="gap-10 mobile:gap-8 w-[min(890px,100%)] mx-auto mobile:w-full">
            {openPools.map((info) => (
              <div key={info.id}>
                <CyberpunkStyleCard>
                  <Collapse defaultOpen>
                    <Collapse.Face>{(open) => <AcceleRaytorCollapseItemFace open={open} info={info} />}</Collapse.Face>
                    <Collapse.Body>
                      <AcceleRaytorCollapseItemContent info={info} />
                    </Collapse.Body>
                  </Collapse>
                </CyberpunkStyleCard>
              </div>
            ))}
          </Col>
        </>
      )}
      <Tabs
        currentValue={currentTab}
        values={['Upcoming Pools', 'Closed Pools']}
        onChange={(currentTab) => {
          useIdo.setState({ currentTab })
        }}
        className="self-center mobile:col-span-full mt-24 mobile:mt-16 mb-10 mobile:mb-8"
        itemClassName={isMobile ? 'min-w-[112px] h-[30px] px-2' : 'min-w-[128px]'}
      />
      {(upcomingPools.length > 0 || closedPools.length > 0) && (
        <div className="text-2xl mobile:text-base mobile:px-4 mb-6 mobile:mb-4 font-semibold text-white w-[min(890px,100%)] self-center">
          {currentTab}
        </div>
      )}
      <Col className="gap-12 mobile:gap-8 w-[min(890px,100%)] mx-auto mobile:w-full">
        {(currentTab === 'Upcoming Pools' ? upcomingPools : closedPools).map((info) => (
          <div key={info.id}>
            <CyberpunkStyleCard>
              <Collapse defaultOpen>
                <Collapse.Face>{(open) => <AcceleRaytorCollapseItemFace open={open} info={info} />}</Collapse.Face>
                <Collapse.Body>
                  <AcceleRaytorCollapseItemContent info={info} />
                </Collapse.Body>
              </Collapse>
            </CyberpunkStyleCard>
          </div>
        ))}
      </Col>
    </>
  )
}

function AcceleRaytorCollapseItemFace({ open, info }: { open: boolean; info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)

  return (
    <Row
      className={`flex-wrap py-6 px-8 mobile:py-4 mobile:px-5 bg-[#141041] items-stretch gap-5 rounded-t-3xl mobile:rounded-t-lg ${
        open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
      }`}
    >
      <Row className="items-center gap-4 mobile:gap-3 mobile:w-auto">
        <Row
          className="items-center gap-4 mobile:gap-3 mobile:w-auto clickable"
          onClick={() => routeTo('/acceleraytor/detail', { queryProps: { idoId: info.id } })}
        >
          <CoinAvatar noCoinIconBorder size={isMobile ? 'md' : 'lg'} token={info.base} />
          <div>
            <div className="text-base mobile:text-sm font-semibold text-white">{info.baseSymbol}</div>
            <div className="text-sm mobile:text-xs text-[#ABC4FF80]">{info.projectName}</div>
          </div>
        </Row>
        <Row className="flex-wrap gap-4 mobile:gap-3 items-center border-l border-[rgba(171,196,255,0.5)] self-center pl-6 mobile:pl-3">
          {/* {Object.entries({ website: info.project.officialSites.website, ...info.project.socialsSites }).map(
            ([socialName, link]) => (
              <Link key={socialName} href={link} className="flex items-center gap-2 clickable">
                <Icon
                  className="frosted-glass-skygray p-2.5 mobile:p-2 rounded-xl mobile:rounded-lg"
                  iconClassName="w-3 h-3 opacity-50"
                  iconSrc={socialIconSrcMap[socialName.toLowerCase()]}
                />
              </Link>
            )
          )} */}
        </Row>
      </Row>

      <Row className="gap-4 mobile:gap-6 grow justify-end mobile:justify-center">
        {info.isUpcoming ? (
          <FaceButtonGroupUpcoming info={info} />
        ) : info.isOpen ? (
          <FaceButtonGroupJoin info={info} />
        ) : (
          <FaceButtonGroupClaim info={info} />
        )}
      </Row>
    </Row>
  )
}

function FaceButtonGroupUpcoming({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <AutoBox is={isMobile ? 'Col' : 'Row'} className="items-center">
      <Button
        size={isMobile ? 'xs' : 'md'}
        className="frosted-glass-skygray mobile:mb-3 mobile:self-stretch"
        suffix={<Icon className="inline-block" size="sm" heroIconName="arrow-circle-right" />}
        onClick={() => routeTo('/acceleraytor/detail', { queryProps: { idoId: info.id } })}
      >
        Pool Information
      </Button>
    </AutoBox>
  )
}
function FaceButtonGroupJoin({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Button
      size={isMobile ? 'xs' : 'md'}
      className="frosted-glass-teal mobile:self-stretch"
      validators={[{ should: info.isOpen }]}
      onClick={({ ev }) => {
        ev.stopPropagation()
        routeTo('/acceleraytor/detail', { queryProps: { idoId: info.id } })
      }}
    >
      Join Lottery
    </Button>
  )
}
function FaceButtonGroupClaim({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const connected = useWallet((s) => s.connected)

  const [, forceUpdate] = useForceUpdate()
  return (
    <>
      <Col className="items-center mobile:grow">
        <Button
          size={isMobile ? 'xs' : 'md'}
          className="frosted-glass-teal mobile:self-stretch"
          validators={[
            {
              should: connected,
              fallbackProps: {
                onClick: () => useAppSettings.setState({ isWalletSelectorShown: true })
              }
            },
            { should: info.ledger && gt(info?.winningTickets?.length, 0) && eq(info.ledger.baseWithdrawn, 0) },
            {
              should: info.canWithdrawBase,
              fallbackProps: {
                children: (
                  <Row>
                    Withdraw {info.base?.symbol ?? 'UNKNOWN'} in{' '}
                    <IdoCountDownClock
                      className="ml-1"
                      singleValueMode
                      labelClassName="text-base"
                      endTime={Number(info.startWithdrawTime)}
                      onEnd={forceUpdate}
                    />
                  </Row>
                )
              }
            }
          ]}
          onClick={({ ev }) => {
            ev.stopPropagation()
            txIdoClaim({
              idoInfo: info,
              side: 'base'
            })
          }}
        >
          Withdraw {info.base?.symbol ?? 'UNKNOWN'}
        </Button>
        <FadeIn>
          {gt(info.winningTickets?.length, 0) && eq(info.ledger?.baseWithdrawn, 0) && (
            <div className="text-xs mt-1 font-semibold text-[#ABC4FF80]">
              {info.winningTickets?.length} winning tickets
            </div>
          )}
        </FadeIn>
      </Col>
      <Col className="items-center mobile:grow">
        <Button
          size={isMobile ? 'xs' : 'md'}
          className="frosted-glass-teal mobile:self-stretch"
          validators={[
            { should: connected },
            { should: eq(info.ledger?.quoteWithdrawn, 0) },
            { should: info.isClosed },
            {
              should: connected,
              forceActive: true,
              fallbackProps: {
                onClick: () => useAppSettings.setState({ isWalletSelectorShown: true })
              }
            }
          ]}
          onClick={({ ev }) => {
            ev.stopPropagation()
            txIdoClaim({
              idoInfo: info,
              side: 'quote'
            })
          }}
        >
          Withdraw {info.quote?.symbol ?? 'UNKNOWN'}
        </Button>
        <FadeIn>
          {eq(info.ledger?.quoteWithdrawn, 0) && (
            <div className="text-xs mt-1 font-semibold text-[#ABC4FF80]">
              {(info.depositedTickets?.length ?? 0) - (info.winningTickets?.length ?? 0)} non-winning tickets
            </div>
          )}
        </FadeIn>
      </Col>
    </>
  )
}
function AcceleRaytorCollapseItemContent({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <div className="p-6 mobile:p-3">
      {<IdoItemCardStakeChip info={info} />}
      <Row className="flex-wrap gap-6 mobile:gap-3 rounded-b-3xl mobile:rounded-b-lg  bg-cyberpunk-card-bg items-center">
        <Link href={info.projectDetailLink} className="flex-shrink-0 mobile:w-full text-[#ABC4FF80]">
          <div className={`relative w-[360px] mobile:w-full max-h-[192px] mobile:h-[106px] rounded-xl overflow-hidden`}>
            <Image src={info.projectPosters} className={`shrink-0 mobile:h-full object-contain mobile:object-cover`} />
            {!isMobile && (
              <div className="bg-[#141041cc] absolute bottom-0 w-full  ">
                <Row className="py-2 justify-center items-center">
                  <Icon className="mr-2" iconSrc="/icons/acceleraytor-list-medium.svg" />
                  <span className=" font-medium text-xs">Read Full Detail</span>
                </Row>
              </div>
            )}
          </div>
        </Link>
        <Col className="grow justify-between">
          <div className="grid grid-flow-row grid-cols-2 mobile:grid-cols-1 mobile:gap-board px-6 mobile:p-0">
            <IdoItem
              fieldName="Total Raise"
              fieldValue={
                <Row className="items-baseline gap-1">
                  <div className="text-white font-medium">{formatNumber(toString(info.totalRaise))}</div>
                  <div className="text-[#ABC4FF80] font-medium text-xs">{info.baseSymbol}</div>
                </Row>
              }
            />
            <IdoItem
              fieldName={`Per ${info.base?.symbol ?? 'UNKNOWN'}`}
              fieldValue={
                <Row className="items-baseline gap-1">
                  <div className="text-white font-medium">
                    {formatNumber(toString(info.coinPrice), { fractionLength: 'auto' })}
                  </div>
                  <div className="text-[#ABC4FF80] font-medium text-xs">{info.quote?.symbol ?? 'UNKNOWN'}</div>
                </Row>
              }
            />
            <IdoItem
              fieldName={`Total tickets deposited`}
              fieldValue={
                <Row className="items-baseline gap-1">
                  <div className="text-white font-medium">{formatNumber(info.depositedTicketCount)}</div>
                  <div className="text-[#ABC4FF80] font-medium text-xs">tickets</div>
                </Row>
              }
            />
            <IdoItem
              fieldName={`Allocation / Winning Ticket`}
              fieldValue={
                <Row className="items-baseline gap-1">
                  <div className="text-white font-medium">
                    {formatNumber(toString(info.ticketPrice), { fractionLength: 'auto' })}
                  </div>
                  <div className="text-[#ABC4FF80] font-medium text-xs">{info.quote?.symbol ?? 'UNKNOWN'}</div>
                </Row>
              }
            />
            <IdoItem
              fieldName="Pool open"
              fieldValue={
                <Row className="items-baseline gap-1">
                  {currentIsBefore(Number(info.startTime)) ? (
                    <>
                      <div className="text-[#ABC4FF80] font-medium text-xs">in</div>
                      <div className="text-white font-medium">
                        <IdoCountDownClock endTime={Number(info.startTime)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-white font-medium">
                        {toUTC(Number(info.startTime), { hideUTCBadge: true })}
                      </div>
                      <div className="text-[#ABC4FF80] font-medium text-xs">{'UTC'}</div>
                    </>
                  )}
                </Row>
              }
            />
            <IdoItem
              fieldName="Pool close"
              fieldValue={
                <Row className="items-baseline gap-1">
                  {currentIsBefore(Number(info.endTime)) ? (
                    <>
                      <div className="text-[#ABC4FF80] font-medium text-xs">in</div>
                      <div className="text-white font-medium">
                        <IdoCountDownClock endTime={Number(info.endTime)} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-white font-medium">
                        {toUTC(Number(info.endTime), { hideUTCBadge: true })}
                      </div>
                      <div className="text-[#ABC4FF80] font-medium text-xs">{'UTC'}</div>
                    </>
                  )}
                </Row>
              }
            />
          </div>
        </Col>
        <div className="w-full">
          <IdoItemCardContentButtonGroup info={info} />
        </div>
      </Row>
    </div>
  )
}
function IdoItemCardStakeChip({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const connected = useWallet((s) => s.connected)
  const stakingHydratedInfo = useStaking((s) => s.stakeDialogInfo)
  if (isMobile) return null
  return (
    <Row className={`AlertText items-center bg-[#abc4ff1a] p-3 rounded-xl mb-6`}>
      <Icon className="flex-none text-[#ABC4FF80] mr-2" size="sm" heroIconName="exclamation-circle" />
      <div className="text-[#ABC4FF80] font-medium text-xs">
        To be eligible for the lottery, you need to <span className="text-[#ABC4FF]">stake 100 RAY</span> with a
        deadline of <span className="text-[#ABC4FF]">{toUTC(info.stakeTimeEnd)}</span>.
      </div>
      <Button
        className="frosted-glass-skygray ml-auto"
        size="xs"
        validators={[
          {
            should: connected,
            forceActive: true,
            fallbackProps: {
              onClick: () => useAppSettings.setState({ isWalletSelectorShown: true })
            }
          }
        ]}
        disabled={!currentIsBefore(info.stakeTimeEnd)}
        onClick={() => {
          useStaking.setState({
            isStakeDialogOpen: true,
            stakeDialogMode: 'deposit'
          })
        }}
      >
        Stake
      </Button>
    </Row>
  )
}
function IdoItemCardContentButtonGroup({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const connected = useWallet((s) => s.connected)
  const stakingHydratedInfo = useStaking((s) => s.stakeDialogInfo)

  return info.isUpcoming ? (
    isMobile ? (
      <Col className="justify-between bg-[#14104180] px-6 py-3 mr-4 pr-12 mobile:pt-0 mobile:pb-2 mobile:px-4 mobile:-mx-4 mobile:-mb-4 rounded-xl mobile:rounded-none">
        <IdoItem
          fieldValue={
            <Row className="items-baseline gap-1">
              <div className="text-white font-medium">
                {toString(stakingHydratedInfo?.userStakedLpAmount) || '--'} RAY
              </div>
            </Row>
          }
          fieldName={
            <Row className="gap-1 items-center">
              <div className="text-xs font-bold text-[#ABC4FF80]">Your staking</div>
            </Row>
          }
        />

        <Col>
          <Button
            className="frosted-glass-skygray"
            size="xs"
            validators={[
              {
                should: connected,
                forceActive: true,
                fallbackProps: {
                  onClick: () => useAppSettings.setState({ isWalletSelectorShown: true })
                }
              }
            ]}
            disabled={!currentIsBefore(info.stakeTimeEnd)}
            onClick={() => {
              useStaking.setState({
                isStakeDialogOpen: true,
                stakeDialogMode: 'deposit'
              })
            }}
          >
            Stake
          </Button>

          <div className="text-xs text-center text-[#ABC4FF80] my-1">
            APR: {toPercentString(stakingHydratedInfo?.totalApr)}
          </div>
        </Col>
      </Col>
    ) : null
  ) : (
    <AutoBox
      is={isMobile ? 'Col' : 'Row'}
      className={`${
        isMobile ? '' : 'flex-row-reverse'
      } items-center mx-4 mobile:mx-0 py-4 border-t-1.5 border-[rgba(171,196,255,0.2)]`}
    >
      <Button
        size={isMobile ? 'xs' : 'md'}
        className="frosted-glass-skygray mobile:mb-3 mobile:self-stretch"
        suffix={<Icon className="inline-block" size="sm" heroIconName="arrow-circle-right" />}
        onClick={() => routeTo('/acceleraytor/detail', { queryProps: { idoId: info.id } })}
      >
        Pool Information
      </Button>
      <Link href={info.projectDetailLink} className="mx-4 text-[#ABC4FF80] font-bold mobile:text-xs">
        Full Details
      </Link>
    </AutoBox>
  )
}

function IdoItem({ fieldName, fieldValue }: { fieldName?: ReactNode; fieldValue?: ReactNode }) {
  const isMobile = useAppSettings((s) => s.isMobile)

  return isMobile ? (
    <Grid className="grid-cols-[3fr,4fr] items-center py-3 px-2 gap-8">
      <div className="text-xs font-bold text-[#ABC4FF80]">{fieldName}</div>
      <div className="text-sm font-semibold text-white">{fieldValue}</div>
    </Grid>
  ) : (
    <div className={`top-info-panel-field-item py-3`}>
      <div>{fieldValue}</div>
      <div className="text-[#ABC4FF] font-bold text-xs opacity-50 mt-1">{fieldName}</div>
    </div>
  )
}
