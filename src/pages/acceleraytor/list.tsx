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
import { gte, isMeaningfulNumber, lte } from '@/functions/numberish/compare'
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
      <Col className="items-center cyberpunk-bg-light-acceleraytor">
        <Image src="/logo/accecleraytor-text-logo.svg" />
        <div className="text-[26px] font-medium  text-[#ABC4FF] opacity-50">Buy new tokens launching on Solana.</div>
      </Col>
      <Tabs
        currentValue={currentTab}
        values={['All', 'Inactive']}
        onChange={(currentTab) => {
          useIdo.setState({ currentTab })
        }}
        className="justify-self-center mobile:col-span-full"
        itemClassName={isMobile ? 'w-[108px] h-[30px]' : 'w-32'}
      />
    </Col>
  )
}

function IdoList() {
  const infos = useIdo((s) => s.idoHydratedInfos)
  return (
    <Col className="gap-12 w-[min(890px,100%)] mx-auto mobile:w-full">
      {Object.values(infos).map((info) => (
        // <div className={`ido-table flex flex-wrap justify-center gap-16 mobile:gap-4`}>
        //   {idoList
        //     .filter((ido) => ido.status === 'open')
        //     .map((parsedInfo, idx) => (
        //       <IdoCard key={parsedInfo.id + idx} {...parsedInfo} />
        //     ))}
        // </div>
        <div key={info.id}>
          <CyberpunkStyleCard>
            <Collapse>
              <Collapse.Face>{(open) => <AcceleRaytorCollapseItemFace open={open} info={info} />}</Collapse.Face>
              <Collapse.Body>
                <AcceleRaytorCollapseItemContent info={info} />
              </Collapse.Body>
            </Collapse>
            {/* <Grid className="w-9 h-9 place-items-center self-center">
              <Icon
                size="sm"
                className="justify-self-end p-3 mr-1.5 frosted-glass-teal rounded-xl"
                heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`}
              />
            </Grid> */}
          </CyberpunkStyleCard>
        </div>
      ))}
    </Col>
  )
}

function AcceleRaytorCollapseItemFace({ open, info }: { open: boolean; info: HydratedIdoInfo }) {
  return (
    <Row
      className={`flex-wrap py-6 px-8 mobile:py-4 mobile:px-5 bg-[#141041] items-stretch gap-2 rounded-t-3xl mobile:rounded-t-lg ${
        open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
      }`}
    >
      <Row className="items-center gap-4 w-48">
        <CoinAvatar size="lg" token={info.base} />
        <div>
          <div className="text-base font-semibold text-white">{info.base?.symbol ?? 'UNKNOWN'}</div>
          <div className="text-sm text-[#ABC4FF] opacity-50">{info.project.projectName}</div>
        </div>
      </Row>

      <Row className="gap-4 items-center border-l border-[rgba(171,196,255,0.5)] self-center pl-6">
        {Object.entries(info.project.socials).map(([socialName, link]) => (
          <Link key={socialName} href={link} className="flex items-center gap-2">
            <Icon
              className="frosted-glass-skygray p-2.5 rounded-lg text"
              iconClassName="w-3 h-3 opacity-50"
              iconSrc={socialIconSrcMap[socialName.toLowerCase()]}
            />
          </Link>
        ))}
      </Row>

      <Row className="ml-auto gap-4">
        <Button className="frosted-glass-teal" disabled onClick={() => {}}>
          Withdraw {info.base?.symbol ?? 'UNKNOWN'}
        </Button>
        <Button className="frosted-glass-teal" onClick={() => {}}>
          Withdraw {info.quote?.symbol ?? 'UNKNOWN'}
        </Button>
      </Row>
    </Row>
  )
}

function AcceleRaytorCollapseItemContent({ info }: { info: HydratedIdoInfo }) {
  const lightBoardClass = 'bg-[rgba(20,16,65,.2)]'
  const { push } = useRouter()
  return (
    <Row className="p-4 gap-8 mobile:gap-3 rounded-b-3xl mobile:rounded-b-lg  bg-cyberpunk-card-bg">
      <Link href={info.project.detailDocLink} className="flex-shrink-0">
        <Image src={info.project.idoThumbnail} className={`w-[360px] h-[310px] object-cover rounded-xl`} />
      </Link>
      <Col className="grow justify-between py-4">
        <div className="grid grid-flow-row grid-cols-2-auto gap-6">
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
        <div>
          <Button
            className="frosted-glass-skygray"
            suffix={<Icon className="inline-block" size="sm" heroIconName="arrow-circle-right" />}
            onClick={() => routeTo('/acceleraytor/lotteryDetail', { queryProps: { idoId: info.id } })}
          >
            Pool Information
          </Button>
          <Link className="mx-4 text-[#ABC4FF] opacity-50 font-bold" href={info.project.detailDocLink}>
            Full Details
          </Link>
        </div>
      </Col>
    </Row>
  )
}

function IdoItem({
  fieldName,
  fieldValue,
  className
}: {
  className?: string
  fieldName?: ReactNode
  fieldValue?: ReactNode
}) {
  return (
    <div className={`top-info-panel-field-item ${className ?? ''}`}>
      <div>{fieldValue}</div>
      <div className="text-[#ABC4FF] font-bold text-xs opacity-50 mt-1">{fieldName}</div>
    </div>
  )
}

function FormPanel({ className, info }: { className?: string; info: HydratedIdoInfo }) {
  const refreshSelf = () => {
    if (info?.id) refreshIdoInfo(info?.id)
  }
  return (
    <Row className={`flex-col py-1 px-8 mobile:px-6 ${className ?? ''}`}>
      <Row className="items-center gap-2">
        <div className="title my-4 text-lg font-bold h-max">
          {info?.status === 'closed' ? 'Deposits Have Closed' : 'Join Lottery'}
        </div>
        <RefreshCircle refreshKey="acceleRaytor" freshFunction={refreshSelf} />
      </Row>
      <div className="py-4">
        <FormPanelLotteryInput info={info} />
        {/* {info?.status === 'upcoming' && <FormPanelLotteryUpcoming info={info} />}
        {info?.status === 'open' && <FormPanelLotteryInput info={info} />}
        {info?.status === 'closed' && <FormPanelClaimButtons info={info} />} */}
      </div>
    </Row>
  )
}

function IdoAlertText({
  flag,
  className,
  info: idoInfo
}: {
  flag: '1' | '2' | '3' | '4'
  className?: string
  info: HydratedIdoInfo
}) {
  // const { idoInfo } = usePageData()

  if (idoInfo && flag === '1') {
    return (
      <AlertText className={className}>
        Eligible tickets will be visible closer to pool open on {toUTC(idoInfo.state.startTime.toNumber())}
      </AlertText>
    )
  }
  if (idoInfo && flag === '2') {
    return (
      <AlertText className={className}>
        Deposited {idoInfo.quote?.symbol ?? ''} can be claimed after the lottery ends. Drop Box can be claimed after{' '}
        {toUTC(idoInfo.state.startWithdrawTime.toNumber())}
      </AlertText>
    )
  }
  if (idoInfo && flag === '3') {
    return (
      <AlertText className={className}>
        Drop Boxes MUST be redeemed on{' '}
        <a href={idoInfo.project.projectWebsiteLink} rel="nofollow noopener noreferrer" target="_blank">
          {idoInfo.project.projectName}
        </a>{' '}
        by
      </AlertText>
    )
  }
  if (idoInfo && flag === '4') {
    return (
      <AlertText className={className}>
        User can only deposit once, and cannot add tickets or deposit a second time
      </AlertText>
    )
  }
  return null
}

function FormPanelLotteryUpcoming({ info }: { info: HydratedIdoInfo }) {
  const refreshIdo = useIdo((s) => s.refreshIdo)
  const refreshSelf = () => refreshIdo(info.id)
  return (
    <>
      <Row className="flex-1 grid place-items-center">
        <div className="text-2xl mobile:text-lg opacity-60">Upcoming DropZone Launch</div>
        <Row className="flex-col items-center py-4">
          <div className="justify-self-start opacity-80 mb-2">Deposits will open in:</div>
          <CountDownClock endTime={info?.state.startTime.toNumber()} onEnd={refreshSelf} />
        </Row>
      </Row>
      <IdoAlertText info={info} flag="1" className="pt-4 pb-2 border-t-2 border-white border-opacity-10" />
      <IdoAlertText info={info} flag="2" className="pt-2 pb-4" />
    </>
  )
}

function FormPanelLotteryInput({ className, info: idoInfo }: { className?: string; info: HydratedIdoInfo }) {
  const [userBalance, setUserBalance] = useState<string | undefined>()
  // const { setDepositingHasSuccess } = usePageData()
  const { ticketAmount, hasDeposited } = useIdo((s) => s.idoState[idoInfo.id]) ?? {}
  const setIdoState = useIdo((s) => s.setIdoState)
  const setTicketAmount = (amount: Numberish) => setIdoState(idoInfo.id, { ticketAmount: amount })
  const setHasDeposited = () => setIdoState(idoInfo.id, { hasDeposited: true })
  const refreshIdo = useIdo((s) => s.refreshIdo)
  const refreshSelf = () => refreshIdo(idoInfo.id)

  const { connected, adapter, balances } = useWallet()
  const { connection } = useConnection()

  const inputMaxEligibleTickets = () => {
    if (idoInfo && idoInfo.state) {
      setTicketAmount(idoInfo.userEligibleTicketAmount ?? 0)
    }
  }

  const inputMinEligibleTickets = () => {
    if (idoInfo && idoInfo.state) {
      setTicketAmount(BN.min(idoInfo.state.perUserMinLotteries, idoInfo.userEligibleTicketAmount ?? ZERO))
    }
  }

  const joinLottery = async () => {
    if (!idoInfo || !idoInfo.base || !ticketAmount) return
    try {
      await txIdoPurchase({
        idoInfo,
        amount: toBN(toTokenAmount(idoInfo.base, ticketAmount, { alreadyDecimaled: true })),
        onTxSuccess: () => {
          setHasDeposited()
          refreshSelf()
        }
      })
      // eslint-disable-next-line no-empty
    } catch (err) {}
  }

  useEffect(() => {
    const userBalance =
      connection && adapter?.publicKey && idoInfo?.quote?.mint ? balances[String(idoInfo?.quote?.mint)] : undefined

    if (userBalance === undefined) setUserBalance(undefined)
    else setUserBalance(userBalance.toFixed())
  }, [connected, adapter, idoInfo?.quote?.mint])

  return (
    <div className={`lottery-input space-y-4 ${className ?? ''}`}>
      {idoInfo && (
        <>
          <div className="text-center">
            Deposits close in:{' '}
            <CountDownClock
              type="text"
              showDays="auto"
              showHours="auto"
              endTime={idoInfo.state.endTime.toNumber()}
              onEnd={refreshSelf}
            />
          </div>
          <IdoAlertText flag="4" info={idoInfo} />
          <div className="px-4 space-y-3">
            <FormPanelLotteryInputTemplate
              className="border-2 border-white rounded-md p-3"
              topRight={`Eligible Ticket(s): ${connection ? idoInfo.userEligibleTicketAmount : '--'}`}
              bottomLeft={
                <DecimalInput
                  placeholder="(ticket amount)"
                  value={ticketAmount ? toString(ticketAmount) : ''}
                  onUserInput={(v) => setTicketAmount(new BN(toStringNumber(v)))}
                />
              }
              bottomRight={
                <Row className="grid grid-flow-col gap-3">
                  <Button
                    className="py-1 px-3 rounded-md font-bold bg-[#293062] bg-opacity-80 text-sm"
                    onClick={inputMinEligibleTickets}
                  >
                    MIN
                  </Button>
                  <Button
                    className="py-1 px-3 rounded-md font-bold bg-[#293062] bg-opacity-80 text-sm"
                    onClick={inputMaxEligibleTickets}
                  >
                    MAX
                  </Button>
                </Row>
              }
            />
            <FormPanelLotteryInputTemplate
              className="border-2  border-white border-opacity-40 rounded-md p-3 cursor-not-allowed"
              topLeft="Deposit"
              topRight={
                <div className="grid justify-items-end">
                  <span>Balance: </span>
                  <span>{userBalance ?? '--'}</span>
                </div>
              }
              bottomLeft={
                <DecimalInput
                  disabled
                  value={
                    ticketAmount && idoInfo.quote
                      ? toString(
                          mul(ticketAmount ?? 0, toTokenAmount(idoInfo.quote, idoInfo.state.perLotteryQuoteAmount))
                        )
                      : undefined
                  }
                />
              }
              bottomRight={
                <Row className="space-x-2">
                  {idoInfo.quote && <Icon iconSrc={idoInfo.quote.iconSrc} />}
                  <div className="text-lg font-bold">{idoInfo.quote?.symbol ?? ''}</div>
                </Row>
              }
            />
            <Button
              className="block w-full"
              validators={[
                {
                  should: connected,
                  forceActive: true,
                  fallbackProps: {
                    onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                    children: 'Connect Wallet'
                  }
                },
                {
                  should: idoInfo.isEligible,
                  fallbackProps: { children: 'Wallet not eligible for this pool' }
                },
                {
                  should: !hasDeposited,
                  fallbackProps: { children: 'Joined' }
                },
                {
                  should: (idoInfo.ledger?.depositedTickets?.length ?? 0) === 0,
                  fallbackProps: { children: 'You have already deposited' }
                },
                {
                  should: ticketAmount,
                  fallbackProps: { children: 'Enter ticket amount' }
                },
                {
                  should: isMeaningfulNumber(idoInfo.userEligibleTicketAmount),
                  fallbackProps: { children: 'No eligible tickets' }
                },
                {
                  should: ticketAmount && gte(ticketAmount, idoInfo.state.perUserMinLotteries),
                  fallbackProps: { children: `Min. tickets amount is ${idoInfo.state.perUserMinLotteries}` }
                },
                {
                  should: ticketAmount && lte(ticketAmount, idoInfo.userEligibleTicketAmount),
                  fallbackProps: { children: `Max. tickets amount is ${idoInfo.userEligibleTicketAmount}` }
                }
              ]}
              onClick={joinLottery}
            >
              Join Lottery
            </Button>
          </div>
          <IdoAlertText info={idoInfo} flag="2" className="pt-1 pb-3" />
        </>
      )}
    </div>
  )
}

function FormPanelLotteryInputTemplate({
  className,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight
}: {
  className?: string
  topLeft?: ReactNode
  topRight?: ReactNode
  bottomLeft?: ReactNode
  bottomRight?: ReactNode
}) {
  return (
    <div className={`grid gap-1 grid-cols-2 ${className ?? ''}`}>
      <div className="top-left opacity-50 text-xs">{topLeft}</div>
      <div className="top-right opacity-50 text-xs justify-self-end">{topRight}</div>
      <div className="bottom-left">{bottomLeft}</div>
      <div className="bottom-right justify-self-end">{bottomRight}</div>
    </div>
  )
}

function FormPanelClaimButtons({ className, info: idoInfo }: { className?: string; info: HydratedIdoInfo }) {
  const setIdoState = useIdo((s) => s.setIdoState)
  const setHasClaimedBase = () => setIdoState(idoInfo.id, { hasClaimedBase: true })
  const setHasClaimedQuote = () => setIdoState(idoInfo.id, { hasClaimedQuote: true })

  const refreshIdo = useIdo((s) => s.refreshIdo)
  const refreshSelf = () => refreshIdo(idoInfo.id)
  const { connected } = useWallet()
  const userHasDepositedUSDC = idoInfo && idoInfo.ledger && idoInfo.ledger.quoteDeposited.toNumber() > 0

  if (!idoInfo) return null

  const clickClaim = async (side: 'base' | 'quote') => {
    if (!idoInfo) return
    try {
      txIdoClaim({
        side,
        idoInfo,
        onTxSuccess: () => {
          ;(side === 'base' ? setHasClaimedBase : setHasClaimedQuote)()
          refreshSelf()
        }
      })
      // eslint-disable-next-line no-empty
    } catch (err) {}
  }

  return (
    <>
      <div className="my-6">
        {!connected ? (
          <Button className="block w-full" onClick={() => useAppSettings.setState({ isWalletSelectorShown: true })}>
            Connect Wallet
          </Button>
        ) : !idoInfo.isEligible ? (
          <Button className="block w-full" disabled>
            Wallet not eligible for this pool
          </Button>
        ) : (
          <Row className={`space-x-6 justify-center ${className}`}>
            {userHasDepositedUSDC ? (
              <>
                <Button
                  className="flex-1"
                  validators={[
                    {
                      should:
                        Number(idoInfo.ledger?.winningTickets?.length ?? 0) !==
                        Number(idoInfo.ledger?.depositedTickets?.length ?? 0)
                    },
                    {
                      should: Number(idoInfo.ledger?.quoteWithdrawn ?? 0) <= 0
                    }
                  ]}
                  onClick={() => {
                    clickClaim('quote')
                  }}
                >
                  Claim {idoInfo.quote?.symbol ?? ''}
                </Button>
                <Button
                  className="flex-1"
                  validators={[
                    { should: currentIsAfter(idoInfo.state.startWithdrawTime.toNumber()) },
                    { should: idoInfo.ledger?.winningTickets && idoInfo.ledger?.winningTickets.length > 0 },
                    { should: idoInfo.ledger && idoInfo.ledger.baseWithdrawn.toNumber() <= 0 }
                  ]}
                  onClick={() => {
                    clickClaim('base')
                  }}
                >
                  Claim {idoInfo.base?.symbol ?? ''}
                </Button>
              </>
            ) : (
              <div className="text-xl opacity-50 ">You did not deposit</div>
            )}
          </Row>
        )}
        {currentIsBefore(idoInfo.state.startWithdrawTime.toNumber()) && userHasDepositedUSDC && (
          <Row className="flex-col items-center py-4">
            <div className="justify-self-start opacity-80 mb-2">Claim Drop Box in:</div>
            <CountDownClock
              showDays="auto"
              showHours="auto"
              endTime={idoInfo.state.startWithdrawTime.toNumber()}
              onEnd={() => {
                refreshSelf()
              }}
            />
          </Row>
        )}
      </div>
      <IdoAlertText info={idoInfo} flag="2" className="pt-4 pb-2 border-t-2 border-white border-opacity-10" />
      <IdoAlertText info={idoInfo} flag="3" className="pt-2 pb-4" />
    </>
  )
}
