import React, { ReactNode, useMemo, useRef } from 'react'

import useAppSettings from '@/application/appSettings/useAppSettings'
import { HydratedIdoInfo } from '@/application/ido/type'
import useIdo from '@/application/ido/useIdo'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import IdoCountDownClock from '@/components/IdoCountDownClock'
import Icon from '@/components/Icon'
import Link from '@/components/Link'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import Tabs from '@/components/Tabs'
import { toUTC } from '@/functions/date/dateFormat'
import { currentIsAfter, currentIsBefore } from '@/functions/date/judges'
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
import { useForceUpdate } from '@/hooks/useForceUpdate'
import useStaking from '@/application/staking/useStaking'
import toPercentString from '@/functions/format/toPercentString'
import LoadingCircle from '@/components/LoadingCircle'
import { twMerge } from 'tailwind-merge'
import Progress from '@/components/Progress'
import toPercentNumber from '@/functions/format/toPercentNumber'
import Input from '@/components/Input'

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
          A launchpad for new Solana projects
        </div>
      </Col>
    </Col>
  )
}

function IdoList() {
  const currentTab = useIdo((s) => s.currentTab)
  const infos = useIdo((s) => s.idoHydratedInfos)
  const searchText = useIdo((s) => s.searchText)
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
  const upcomingOrClosedPoolItems =
    currentTab === 'Upcoming Pools'
      ? upcomingPools
      : closedPools.filter((pool) =>
          (pool.baseSymbol + pool.projectName).toLowerCase().includes((searchText ?? '').trim().toLowerCase())
        )
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
        className={`self-center mobile:col-span-full ${
          upcomingPools.length > 0
            ? ' mt-24 mobile:mt-16 mb-10 mobile:mb-8'
            : openPools.length > 0
            ? 'invisible mt-12 mobile:mt-8 mb-10 mobile:mb-8'
            : 'invisible m-0'
        }`}
        itemClassName={isMobile ? 'min-w-[112px] h-[30px] px-2' : 'min-w-[128px]'}
      />
      {(upcomingPools.length > 0 || closedPools.length > 0) && (
        <Row className="mobile:px-4 gap-6 mb-6 mobile:mb-4 justify-between w-[min(890px,100%)] self-center">
          <div className="text-2xl mobile:text-base font-semibold text-white">{currentTab}</div>
          {currentTab === 'Closed Pools' && <IdoSearchBlock className="mobile:w-[12em]" />}
        </Row>
      )}

      <Col className="gap-12 mobile:gap-8 w-[min(890px,100%)] mx-auto mobile:w-full">
        {upcomingOrClosedPoolItems.length > 0 ? (
          upcomingOrClosedPoolItems.map((info) => (
            <div key={info.id}>
              <CyberpunkStyleCard>
                <Collapse defaultOpen={currentTab === 'Upcoming Pools'}>
                  <Collapse.Face>{(open) => <AcceleRaytorCollapseItemFace open={open} info={info} />}</Collapse.Face>
                  <Collapse.Body>
                    <AcceleRaytorCollapseItemContent info={info} />
                  </Collapse.Body>
                </Collapse>
              </CyberpunkStyleCard>
            </div>
          ))
        ) : (
          <div className="text-xl mobile:text-lg text-[#ABC4FF80] mx-auto">
            ( {currentTab === 'Closed Pools' && searchText ? 'Searched Not Found' : 'Empty'} )
          </div>
        )}
      </Col>
    </>
  )
}

function IdoSearchBlock({ className }: { className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const storeSearchText = useIdo((s) => s.searchText)
  return (
    <Input
      value={storeSearchText}
      className={twMerge(
        'px-2 py-2 mobile:py-1 gap-2 border-1.5 border-[rgba(196,214,255,0.5)] rounded-xl mobile:rounded-lg',
        className
      )}
      inputClassName="font-medium mobile:text-xs text-[rgba(196,214,255,0.5)] placeholder-[rgba(196,214,255,0.5)]"
      prefix={<Icon heroIconName="search" size={isMobile ? 'sm' : 'md'} className="text-[rgba(196,214,255,0.5)]" />}
      suffix={
        <Icon
          heroIconName="x"
          size={isMobile ? 'xs' : 'sm'}
          className={`text-[rgba(196,214,255,0.5)] transition clickable ${
            storeSearchText ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => {
            useIdo.setState({ searchText: '' })
          }}
        />
      }
      placeholder="Search by token"
      onUserInput={(searchText) => {
        useIdo.setState({ searchText })
      }}
    />
  )
}

function AcceleRaytorCollapseItemFace({ open, info }: { open: boolean; info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)

  return (
    <div
      className={`py-6 px-8 mobile:py-4 mobile:px-5 bg-[#141041]  rounded-t-3xl mobile:rounded-t-lg  ${
        open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
      }`}
    >
      <AutoBox is={isMobile ? 'Col' : 'Row'} className={`flex-wrap items-stretch gap-5`}>
        <Row className="items-center gap-4 mobile:w-full">
          <Row
            className="items-center min-w-[160px] mobile:min-w-[120px] gap-4 mobile:gap-3 mobile:w-auto clickable"
            onClick={() => routeTo('/acceleraytor/detail', { queryProps: { idoId: info.id } })}
          >
            <CoinAvatar noCoinIconBorder size={isMobile ? 'md' : 'lg'} token={info.base} />
            <div>
              <div className="text-base mobile:text-sm font-semibold text-white">{info.baseSymbol}</div>
              <div className="text-sm mobile:text-xs text-[#ABC4FF80]">{info.projectName}</div>
            </div>
          </Row>
          {info.filled && (
            <Row className="flex-wrap gap-4  items-center border-l border-[rgba(171,196,255,0.5)] w-full self-center pl-6 mobile:pl-4">
              <Progress
                borderThemeMode
                className="w-[180px] mobile:w-full"
                labelClassName="text-sm font-bold"
                value={toPercentNumber(info.filled)}
                labelFormat={(v) => `Filled: ${toPercentString(v, { fixed: 0 })}`}
              />
            </Row>
          )}
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
      </AutoBox>
      {currentIsAfter(info.endTime) && (
        <Icon
          iconSrc="/icons/acceleraytor-list-collapse-open.svg"
          className="mx-auto -mt-3 -mb-3 translate-y-3 mobile:mt-3 mobile:mb-0 clickable hover:brightness-110 "
        />
      )}
    </div>
  )
}

function FaceButtonGroupUpcoming({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <AutoBox is={isMobile ? 'Col' : 'Row'} className="items-center mobile:w-full">
      <Button
        size={isMobile ? 'xs' : 'md'}
        className="frosted-glass-skygray mobile:mb-3 mobile:self-stretch"
        suffix={<Icon className="inline-block" size="sm" heroIconName="arrow-circle-right" />}
        onClick={() => routeTo('/acceleraytor/detail', { queryProps: { idoId: info.id } })}
      >
        Pool Information
      </Button>
      {isMobile && (
        <Link href={info.projectDetailLink} className="text-[#ABC4FF80] font-medium text-xs">
          Read Full Detail
        </Link>
      )}
    </AutoBox>
  )
}
function FaceButtonGroupJoin({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Button
      size={isMobile ? 'xs' : 'md'}
      className="frosted-glass-teal mobile:w-full"
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
  const refreshIdo = useIdo((s) => s.refreshIdo)
  const [, forceUpdate] = useForceUpdate()

  return (
    <>
      <Col className="items-center mobile:grow">
        <Button
          size={isMobile ? 'xs' : 'md'}
          className="frosted-glass-teal mobile:self-stretch w-[160px] mobile:w-[100%] whitespace-normal"
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
                  <div>
                    Withdraw {info.base?.symbol ?? 'UNKNOWN'} in{' '}
                    <IdoCountDownClock
                      className="justify-center"
                      singleValueMode
                      labelClassName="text-base"
                      endTime={Number(info.startWithdrawTime)}
                      onEnd={forceUpdate}
                    />
                  </div>
                )
              }
            }
          ]}
          onClick={({ ev }) => {
            ev.stopPropagation()
            txIdoClaim({
              idoInfo: info,
              side: 'base',
              onTxSuccess: () => {
                refreshIdo(info.id)
              }
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
          className="frosted-glass-teal mobile:self-stretch w-[160px] mobile:w-[100%] whitespace-normal"
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
              side: 'quote',
              onTxSuccess: () => {
                refreshIdo(info.id)
              }
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
        <div className={`relative w-[360px] mobile:w-full max-h-[192px] mobile:h-[106px] rounded-xl overflow-hidden`}>
          <Image
            src={info.projectPosters}
            className={`shrink-0 mobile:h-full mobile:w-full object-contain mobile:object-cover clickable`}
            onClick={() => routeTo('/acceleraytor/detail', { queryProps: { idoId: info.id } })}
          />
          {!isMobile && (
            <div className="bg-[#141041cc] absolute bottom-0 w-full  ">
              <Row className="py-1 justify-center items-center">
                <Icon className="mr-2" iconSrc="/icons/acceleraytor-list-medium.svg" />
                <Link href={info.projectDetailLink} className="text-[#ABC4FF80] font-medium text-xs">
                  Read Full Details
                </Link>
              </Row>
            </div>
          )}
        </div>
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
                  <div className="text-[#ABC4FF80] font-medium text-xs">Tickets</div>
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
        <IdoItemCardContentButtonGroup className="w-full" info={info} />
      </Row>
    </div>
  )
}
function IdoItemCardStakeChip({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const connected = useWallet((s) => s.connected)
  const stakingHydratedInfo = useStaking((s) => s.stakeDialogInfo)
  if (isMobile || currentIsAfter(info.stakeTimeEnd)) return null
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
function IdoItemCardContentButtonGroup({ className, info }: { className?: string; info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const connected = useWallet((s) => s.connected)
  const stakingHydratedInfo = useStaking((s) => s.stakeDialogInfo)

  return info.isUpcoming ? (
    isMobile && currentIsBefore(info.stakeTimeEnd) ? (
      <Col
        className={twMerge(
          'justify-between bg-[#14104180] px-6 py-3 mr-4 mobile:pt-0 mobile:pb-2 mobile:px-4 mobile:-mx-4 mobile:-mb-4 rounded-xl mobile:rounded-none',
          className
        )}
      >
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
      className={twMerge(
        `${
          isMobile ? '' : 'flex-row-reverse'
        } items-center mx-4 mobile:mx-0 mobile:-mt-3 pt-4 border-t-1.5 border-[rgba(171,196,255,0.1)]`,
        className
      )}
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
