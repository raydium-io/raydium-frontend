import React, { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import BN from 'bn.js'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import { HydratedIdoInfo } from '@/application/ido/type'
import useIdo from '@/application/ido/useIdo'
import useWallet from '@/application/wallet/useWallet'
import AlertText from '@/components/AlertText'
import Button from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import CountDownClock from '@/components/CountDownClock'
import DecimalInput from '@/components/DecimalInput'
import Icon, { socialIconSrcMap } from '@/components/Icon'
import Link from '@/components/Link'
import PageLayout from '@/components/PageLayout'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import Tabs from '@/components/Tabs'
import { toUTC } from '@/functions/date/dateFormat'
import { currentIsAfter, currentIsBefore } from '@/functions/date/judges'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { eq, gt, gte, isMeaningfulNumber, lte } from '@/functions/numberish/compare'
import { mul } from '@/functions/numberish/operations'
import { toStringNumber } from '@/functions/numberish/stringNumber'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'
import { ZERO } from '@raydium-io/raydium-sdk'
import txIdoPurchase from '@/application/ido/utils/txIdoPurchase'
import txIdoClaim from '@/application/ido/utils/txIdoClaim'
import { refreshIdoInfo } from '@/application/ido/utils/getHydratedInfo'
import Image from '@/components/Image'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import formatNumber from '@/functions/format/formatNumber'
import { routeTo } from '@/application/routeTools'
import { FadeIn } from '@/components/FadeIn'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import Grid from '@/components/Grid'
import AutoBox from '@/components/AutoBox'

export default function AcceleRaytor() {
  return (
    <PageLayout mobileBarTitle="AcceleRaytor" metaTitle="AcceleRaytor - Raydium">
      <AcceleRaytorHeader />
      <IdoList />
    </PageLayout>
  )
}

function AcceleRaytorHeader() {
  const currentTab = useIdo((s) => s.currentTab)
  const isMobile = useAppSettings((s) => s.isMobile)

  return (
    <Col className="items-center gap-20 mb-11">
      <Col className="items-center cyberpunk-bg-light-acceleraytor mobile:scale-75 mobile:translate-y-4">
        <Image src="/logo/accecleraytor-text-logo.svg" />
        <div className="text-[20px] mt-2 font-medium text-[#ABC4FF] opacity-50 whitespace-nowrap">
          Buy new tokens launching on Solana.
        </div>
      </Col>
      <Tabs
        currentValue={currentTab}
        values={['Upcoming Pools', 'Closed Pools']}
        onChange={(currentTab) => {
          useIdo.setState({ currentTab })
        }}
        className="justify-self-center mobile:col-span-full"
        itemClassName={isMobile ? 'w-[112px] h-[30px] px-2' : 'w-32'}
      />
    </Col>
  )
}

function IdoList() {
  const infos = useIdo((s) => s.idoHydratedInfos)
  return (
    <Col className="gap-12 w-[min(890px,100%)] mx-auto mobile:w-full">
      {Object.values(infos).map((info) => (
        <div key={info.id}>
          <CyberpunkStyleCard>
            <Collapse>
              <Collapse.Face>{(open) => <AcceleRaytorCollapseItemFace open={open} info={info} />}</Collapse.Face>
              <Collapse.Body>
                <AcceleRaytorCollapseItemContent info={info} />
              </Collapse.Body>
            </Collapse>
          </CyberpunkStyleCard>
        </div>
      ))}
    </Col>
  )
}

function AcceleRaytorCollapseItemFace({ open, info }: { open: boolean; info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const connected = useWallet((s) => s.connected)

  return (
    <Row
      className={`flex-wrap py-6 px-8 mobile:py-4 mobile:px-5 bg-[#141041] items-stretch gap-5 rounded-t-3xl mobile:rounded-t-lg ${
        open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
      }`}
    >
      <Row
        className="items-center gap-4 mobile:gap-3 mobile:w-auto clickable"
        onClick={() => routeTo('/acceleraytor/detail', { queryProps: { idoId: info.id } })}
      >
        <CoinAvatar noCoinIconBorder size={isMobile ? 'md' : 'lg'} token={info.base} />
        <div>
          <div className="text-base mobile:text-sm font-semibold text-white">{info.base?.symbol ?? 'UNKNOWN'}</div>
          <div className="text-sm mobile:text-xs text-[#ABC4FF] opacity-50">{info.project.projectName}</div>
        </div>
        <Row className="flex-wrap gap-4 mobile:gap-3 items-center border-l border-[rgba(171,196,255,0.5)] self-center pl-6 mobile:pl-3">
          {Object.entries({ website: info.project.officialSites.website, ...info.project.socialsSites }).map(
            ([socialName, link]) => (
              <Link key={socialName} href={link} className="flex items-center gap-2">
                <Icon
                  className="frosted-glass-skygray p-2.5 mobile:p-2 rounded-xl mobile:rounded-lg"
                  iconClassName="w-3 h-3 opacity-50"
                  iconSrc={socialIconSrcMap[socialName.toLowerCase()]}
                />
              </Link>
            )
          )}
        </Row>
      </Row>

      <Row className="gap-4 mobile:gap-6 grow justify-end mobile:justify-center">
        <Col className="items-center">
          <Button
            size={isMobile ? 'xs' : 'md'}
            className="frosted-glass-teal"
            validators={[
              { should: connected },
              { should: gt(info.ledger?.winningTickets?.length, 0) && eq(info.ledger?.baseWithdrawn, 0) },
              {
                should: connected,
                forceActive: true,
                fallbackProps: {
                  onClick: () => useAppSettings.setState({ isWalletSelectorShown: true })
                }
              }
            ]}
            onClick={() => {
              txIdoClaim({
                idoInfo: info,
                side: 'base'
              })
            }}
          >
            Withdraw {info.base?.symbol ?? 'UNKNOWN'}
          </Button>
          <FadeIn>
            {gt(info.ledger?.winningTickets?.length, 0) && eq(info.ledger?.baseWithdrawn, 0) && (
              <div className="text-xs mt-1 font-semibold text-[#ABC4FF] opacity-50">
                {info.ledger?.winningTickets?.length} winning tickets
              </div>
            )}
          </FadeIn>
        </Col>
        <Col className="items-center">
          <Button
            size={isMobile ? 'xs' : 'md'}
            className="frosted-glass-teal"
            validators={[
              { should: connected },
              { should: eq(info.ledger?.quoteWithdrawn, 0) },
              { should: info.status === 'closed' },
              {
                should: connected,
                forceActive: true,
                fallbackProps: {
                  onClick: () => useAppSettings.setState({ isWalletSelectorShown: true })
                }
              }
            ]}
            onClick={() => {
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
              <div className="text-xs mt-1 font-semibold text-[#ABC4FF] opacity-50">
                {(info.ledger?.depositedTickets?.length ?? 0) - (info.ledger?.winningTickets?.length ?? 0)} non-winning
                tickets
              </div>
            )}
          </FadeIn>
        </Col>
      </Row>
    </Row>
  )
}

function AcceleRaytorCollapseItemContent({ info }: { info: HydratedIdoInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const lightBoardClass = 'bg-[rgba(20,16,65,.2)]'
  const { push } = useRouter()
  return (
    <Row className="p-4 mobile:p-3 gap-8 flex-wrap mobile:gap-3 rounded-b-3xl mobile:rounded-b-lg  bg-cyberpunk-card-bg">
      <Link href={info.project.detailDocLink} className="flex-shrink-0 mobile:w-full">
        <Image
          src={info.project.idoThumbnail}
          className={`w-[360px] mobile:w-full h-[310px] mobile:h-[106px] object-cover rounded-xl`}
        />
      </Link>
      <Col className="grow justify-between py-4">
        <div className="grid grid-flow-row grid-cols-2 mobile:grid-cols-1 mobile:grid-gap-board">
          <IdoItem
            fieldName="Total Raise"
            fieldValue={
              <Row className="items-baseline gap-1">
                <div className="text-white font-medium">{formatNumber(toString(info.totalRaise))}</div>
                <div className="text-[#ABC4FF80] font-medium text-xs">{info.totalRaise?.token.symbol ?? 'UNKNOWN'}</div>
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
            fieldValue={<div className="text-white font-medium">{formatNumber(info.depositedTicketCount)}</div>}
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
                <div className="text-white font-medium">
                  {toUTC(Number(info.state.startTime), { hideUTCBadge: true })}
                </div>
                <div className="text-[#ABC4FF80] font-medium text-xs">{'UTC'}</div>
              </Row>
            }
          />
          <IdoItem
            fieldName="Pool close"
            fieldValue={
              <Row className="items-baseline gap-1">
                <div className="text-white font-medium">
                  {toUTC(Number(info.state.endTime), { hideUTCBadge: true })}
                </div>
                <div className="text-[#ABC4FF80] font-medium text-xs">{'UTC'}</div>
              </Row>
            }
          />
        </div>
        {/* time-line */}
        <div className="border-t-1.5 border-[#ABC4FF] opacity-20"></div>
        <AutoBox is={isMobile ? 'Col' : 'Row'} className="items-center pt-5">
          <Button
            size={isMobile ? 'xs' : 'md'}
            className="frosted-glass-skygray mobile:mb-3 mobile:self-stretch"
            suffix={<Icon className="inline-block" size="sm" heroIconName="arrow-circle-right" />}
            onClick={() => routeTo('/acceleraytor/detail', { queryProps: { idoId: info.id } })}
          >
            Pool Information
          </Button>
          <Link className="mx-4 text-[#ABC4FF] opacity-50 font-bold mobile:text-xs" href={info.project.detailDocLink}>
            Full Details
          </Link>
        </AutoBox>
      </Col>
    </Row>
  )
}

function IdoItem({ fieldName, fieldValue }: { fieldName?: ReactNode; fieldValue?: ReactNode }) {
  const isMobile = useAppSettings((s) => s.isMobile)

  return isMobile ? (
    <Grid className="grid-cols-[3fr,4fr] items-center py-3 px-2 gap-8">
      <div className="text-xs font-bold text-[#ABC4FF] opacity-50">{fieldName}</div>
      <div className="text-sm font-semibold text-white">{fieldValue}</div>
    </Grid>
  ) : (
    <div className={`top-info-panel-field-item py-3`}>
      <div>{fieldValue}</div>
      <div className="text-[#ABC4FF] font-bold text-xs opacity-50 mt-1">{fieldName}</div>
    </div>
  )
}
