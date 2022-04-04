import React, { ReactNode, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import BN from 'bn.js'

import useConnection from '@/application/connection/useConnection'
import { TicketInfo } from '@/application/ido/type'
import useIdo from '@/application/ido/useIdo'
import useWallet from '@/application/wallet/useWallet'
import AlertText from '@/components/AlertText'
import Button from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import CountDownClock from '@/components/CountDownClock'
import DecimalInput from '@/components/DecimalInput'
import DropZoneBadgeStatusTag from '@/components/DropZoneBadgeStatusTag'
import Icon, { socialIconSrcMap } from '@/components/Icon'
import Link from '@/components/Link'
import LoadingCircle from '@/components/LoadingCircle'
import PageLayout from '@/components/PageLayout'
import Progress from '@/components/Progress'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import TabWithPanel from '@/components/TabWithPanel'
import { toUTC } from '@/functions/date/dateFormat'
import { currentIsAfter, currentIsBefore } from '@/functions/date/judges'
import formatNumber from '@/functions/format/formatNumber'
import toPercentNumber from '@/functions/format/toPercentNumber'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import useAppSettings from '@/application/appSettings/useAppSettings'
import { objectMap } from '@/functions/objectMethods'
import { toString } from '@/functions/numberish/toString'
import { ZERO } from '@raydium-io/raydium-sdk'
import { eq, gt, gte, isMeaningfulNumber, lte } from '@/functions/numberish/compare'
import txIdoPurchase from '@/application/ido/utils/txIdoPurchase'
import txIdoClaim from '@/application/ido/utils/txIdoClaim'
import { Numberish } from '@/types/constants'
import toBN from '@/functions/numberish/toBN'
import { mul } from '@/functions/numberish/operations'
import { useRouter } from 'next/router'
import { FadeIn } from '@/components/FadeIn'
import Card from '@/components/Card'
import { twMerge } from 'tailwind-merge'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import { Badge } from '@/components/Badge'
import Tabs from '@/components/Tabs'
import { shakeFalsyItem } from '@/functions/arrayMethods'
import { Markdown } from '@/components/Markdown'
import CoinInputBox from '@/components/CoinInputBox'
import useFarms from '@/application/farms/useFarms'
import toPercentString from '@/functions/format/toPercentString'
import useStaking from '@/application/staking/useStaking'
import { StakingPageStakeLpDialog } from '@/components/dialogs/StakingPageStakeLpDialog'
// paser url to patch idoid
function useUrlParser() {
  const idoHydratedInfos = useIdo((s) => s.idoHydratedInfos)
  const idoInfo = useIdo((s) => s.currentIdoHydratedInfo)
  const { query } = useRouter()
  useEffect(() => {
    if (idoInfo) return
    const idoIdFromUrl = query.idoId as string | undefined
    if (idoIdFromUrl) {
      const current = idoHydratedInfos[idoIdFromUrl]
      if (current) useIdo.setState({ currentIdoHydratedInfo: current })
    }
  }, [idoHydratedInfos])
}

function NavButtons({ className }: { className?: string }) {
  const idoInfo = useIdo((s) => s.currentIdoHydratedInfo)
  return (
    <Row className={twMerge('items-center justify-between', className)}>
      <Button
        type="text"
        className="text-sm text-[#ABC4FF] opacity-50"
        prefix={<Icon heroIconName="chevron-left" size="sm" />}
      >
        Back to all pools
      </Button>

      <Link
        className="rounded-none font-medium text-sm text-[#ABC4FF] opacity-50 flex gap-1 items-center"
        href={idoInfo?.project.detailDocLink}
      >
        <Icon size="sm" inline heroIconName="information-circle" />
        Read full details
      </Link>
    </Row>
  )
}

export default function LotteryDetailPage() {
  useUrlParser()
  return (
    <PageLayout metaTitle="AcceleRaytor" mobileBarTitle="AcceleRaytor" contentYPaddingShorter>
      <div className="-z-10 cyberpunk-bg-light-acceleraytor-detail-page top-1/2 left-1/2"></div>

      <NavButtons className="mb-10" />

      <FadeIn>
        <TicketPanelClosed className="mb-5" />
      </FadeIn>

      <Grid
        className="gap-5"
        style={{
          gridTemplate: `
            "b a" auto
            "c a" auto
            "d a" auto / 3fr minmax(350px, 1fr)`
        }}
      >
        <IdoInputPanel className="grid-area-a self-start" />
        <LotteryInfoPanel className="grid-area-b" />
        <LotteryLedgerPanel className="grid-area-c" />
        <LotteryProjectInfoPanel className="grid-area-d" />
      </Grid>
    </PageLayout>
  )
}

function TicketItem({
  ticket,
  className,
  style
}: {
  ticket?: TicketInfo
  className?: string
  style?: React.CSSProperties
}) {
  if (!ticket) return null
  return (
    <Row className={twMerge('items-center gap-1', className)} style={style}>
      <div className={`text-xs font-semibold ${ticket.isWinning ? 'text-[#39D0D8]' : 'text-[#ABC4FF]'} `}>
        {ticket.no}
      </div>
      <Icon
        size="smi"
        className={ticket.isWinning ? 'text-[#39D0D8]' : 'text-[#ABC4FF]'}
        heroIconName={ticket.isWinning ? 'check-circle' : 'x-circle'}
      />
    </Row>
  )
}

function TicketPanelClosed({ className }: { className?: string }) {
  const idoInfo = useIdo((s) => s.currentIdoHydratedInfo)

  // TODO: `const winningNumbers = ` (no heavy logic in jsx return)
  if (idoInfo?.status !== 'closed') return null
  if (!idoInfo.ledger?.depositedTickets?.length) return null
  return (
    <Card
      className={twMerge(
        'overflow-hidden rounded-3xl border-1.5 border-[rgba(171,196,255,0.1)] bg-cyberpunk-card-bg',
        className
      )}
      size="lg"
    >
      <Row className="justify-between p-8 ">
        <Col className="gap-1">
          <div className="mobile:text-sm font-semibold text-base text-white">
            {['1', '2'].includes(String(idoInfo?.state.winningTicketsTailNumber.isWinning)) ? (
              <div>
                {idoInfo?.state
                  .winningTicketsTailNumber!.tickets.map(({ no, isPartial }) => `${no}${isPartial ? ' (partial)' : ''}`)
                  .join(', ')}
              </div>
            ) : ['3'].includes(String(idoInfo?.state.winningTicketsTailNumber.isWinning)) ? (
              <div>(Every deposited ticket wins)</div>
            ) : (
              <div className="opacity-50">
                {idoInfo?.status === 'closed' ? '(Lottery in progress)' : '(Numbers selected when lottery ends)'}
              </div>
            )}
          </div>
          <div className="text-xs font-semibold  text-[#ABC4FF] opacity-50">
            {
              {
                '0': 'Lucky Ending Numbers',
                '1': 'All numbers not ending with',
                '2': 'Lucky Ending Numbers',
                '3': 'All Tickets Win',
                undefined: 'Lucky Ending Numbers'
              }[String(idoInfo?.state.winningTicketsTailNumber.isWinning)] // TODO: to hydrated info
            }
          </div>
        </Col>

        <Row className="ml-auto gap-8">
          <Button className="frosted-glass-teal" disabled onClick={() => {}}>
            Withdraw {idoInfo.base?.symbol ?? 'UNKNOWN'}
          </Button>
          <Button className="frosted-glass-teal" onClick={() => {}}>
            Withdraw {idoInfo.quote?.symbol ?? 'UNKNOWN'}
          </Button>
        </Row>
      </Row>

      <Col className="bg-[#141041] py-5 px-6">
        <div className="text-xs mb-5 font-semibold  text-[#ABC4FF] opacity-50">Your ticket numbers</div>
        <Grid
          className="grid-gap-board -mx-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', clipPath: 'inset(1px 16px)' }}
        >
          {idoInfo?.ledger?.depositedTickets?.map((ticket) => (
            <TicketItem key={ticket.no} ticket={ticket} className="px-5 py-3" />
          ))}
        </Grid>
      </Col>
    </Card>
  )
}

function LotteryInfoPanel({ className }: { className?: string }) {
  const idoInfo = useIdo((s) => s.currentIdoHydratedInfo)
  if (!idoInfo) return null
  return (
    <Card
      className={twMerge(
        'grid grid-cols-[auto,1fr] overflow-hidden rounded-3xl border-1.5 border-[rgba(171,196,255,0.1)] bg-[#141041]',
        className
      )}
      size="lg"
    >
      <CyberpunkStyleCard className="flex flex-col items-center justify-center gap-2 py-8" wrapperClassName="w-[140px]">
        <CoinAvatar size="lg" token={idoInfo.base} />
        <div>
          <div className="text-center text-base font-semibold text-white">{idoInfo.base?.symbol ?? 'UNKNOWN'}</div>
          <div className="text-center text-sm text-[#ABC4FF] opacity-50">{idoInfo.project.projectName}</div>
        </div>
        <Badge cssColor={idoInfo.status === 'upcoming' ? '#ABC4FF' : idoInfo.status === 'open' ? '#39D0D8' : '#DA2EEF'}>
          {idoInfo.status}
        </Badge>
      </CyberpunkStyleCard>

      <div className="grid grid-cols-3-auto grid-gap-board my-2 mx-4">
        <IdoInfoItem
          fieldName="Total Raise"
          fieldValue={
            <Row className="items-baseline gap-1">
              <div className="text-white font-medium">{formatNumber(toString(idoInfo.totalRaise))}</div>
              <div className="text-[#ABC4FF80] font-medium text-xs">
                {idoInfo.totalRaise?.token.symbol ?? 'UNKNOWN'}
              </div>
            </Row>
          }
        />
        <IdoInfoItem
          fieldName={`Per ${idoInfo.base?.symbol ?? 'UNKNOWN'}`}
          fieldValue={
            <Row className="items-baseline gap-1">
              <div className="text-white font-medium">
                {formatNumber(toString(idoInfo.coinPrice), { fractionLength: 'auto' })}
              </div>
              <div className="text-[#ABC4FF80] font-medium text-xs">{idoInfo.quote?.symbol ?? 'UNKNOWN'}</div>
            </Row>
          }
        />
        <IdoInfoItem
          fieldName="Pool open"
          fieldValue={
            <Row className="items-baseline gap-1">
              <div className="text-white font-medium">
                {toUTC(Number(idoInfo.state.startTime), { hideUTCBadge: true })}
              </div>
              <div className="text-[#ABC4FF80] font-medium text-xs">{'UTC'}</div>
            </Row>
          }
        />
        <IdoInfoItem
          fieldName={`Allocation / Winning Ticket`}
          fieldValue={
            <Row className="items-baseline gap-1">
              <div className="text-white font-medium">
                {formatNumber(toString(idoInfo.ticketPrice), { fractionLength: 'auto' })}
              </div>
              <div className="text-[#ABC4FF80] font-medium text-xs">{idoInfo.quote?.symbol ?? 'UNKNOWN'}</div>
            </Row>
          }
        />
        <IdoInfoItem
          fieldName={`Total tickets deposited`}
          fieldValue={<div className="text-white font-medium">{formatNumber(idoInfo.depositedTicketCount)}</div>}
        />
        <IdoInfoItem
          fieldName="Pool close"
          fieldValue={
            <Row className="items-baseline gap-1">
              <div className="text-white font-medium">
                {toUTC(Number(idoInfo.state.endTime), { hideUTCBadge: true })}
              </div>
              <div className="text-[#ABC4FF80] font-medium text-xs">{'UTC'}</div>
            </Row>
          }
        />
      </div>
    </Card>
  )
}

function LotteryLedgerPanel({ className }: { className?: string }) {
  const idoInfo = useIdo((s) => s.currentIdoHydratedInfo)

  const TopInfoPanelFieldItem = (props: { fieldName: ReactNode; fieldValue: ReactNode }) => (
    <div className="px-6">
      <div className="text-base font-semibold text-white">{props.fieldValue}</div>
      <div className="text-sm text-[#ABC4FF] opacity-50">{props.fieldName}</div>
    </div>
  )

  if (!idoInfo) return null
  return (
    <Card
      className={twMerge('py-5 rounded-3xl border-1.5 border-[rgba(171,196,255,0.1)] bg-[#141041]', className)}
      size="lg"
    >
      <Grid className="grid-cols-4 grid-gap-board">
        <TopInfoPanelFieldItem
          fieldName="Your Eligible Tickets"
          fieldValue={`${formatNumber(idoInfo.userEligibleTicketAmount)}`}
        />
        <TopInfoPanelFieldItem
          fieldName="Your Deposited Tickets"
          fieldValue={`${formatNumber(idoInfo.ledger?.depositedTickets?.length ?? 0)}`}
        />
        <TopInfoPanelFieldItem
          fieldName="Your Winning Tickets"
          fieldValue={`${formatNumber(idoInfo.ledger?.depositedTickets?.filter((i) => i.isWinning)?.length ?? 0)}`}
        />
        <TopInfoPanelFieldItem
          fieldName="Your allocation"
          fieldValue={
            <Row className="items-baseline gap-1">
              <div>{formatNumber(idoInfo.ledger?.userAllocation)}</div>
              <div className="text-sm text-[#ABC4FF] opacity-50"> {idoInfo.base?.symbol ?? ''}</div>
            </Row>
          }
        />
      </Grid>
    </Card>
  )
}

function LotteryProjectInfoPanel({ className }: { className?: string }) {
  const idoInfo = useIdo((s) => s.currentIdoHydratedInfo)
  const connected = useWallet((s) => s.connected)
  const stakingHydratedInfo = useStaking((s) => s.stakeDialogInfo)

  const [currentTab, setCurrentTab] = useState<'Project Details' | 'How to join?'>('How to join?')

  if (!idoInfo) return null

  const renderProjectDetails = (
    <>
      <Markdown className="py-6">{idoInfo.project.detailText}</Markdown>
      <Row className="justify-between">
        <Row className="gap-6">
          {Object.entries(idoInfo.project.officialSites).map(([docName, linkAddress]) => (
            <Link key={docName} href={linkAddress} className="text-[#ABC4FF] opacity-50">
              {docName}
            </Link>
          ))}
        </Row>
        <Row className="gap-6">
          {Object.entries(idoInfo.project.socialsSites ?? {}).map(([socialName, link]) => (
            <Link key={socialName} href={link} className="flex items-center gap-2">
              <Icon
                className="frosted-glass-skygray p-2.5 rounded-lg text"
                iconClassName="w-3 h-3 opacity-50"
                iconSrc={socialIconSrcMap[socialName.toLowerCase()]}
              />
            </Link>
          ))}
        </Row>
      </Row>
    </>
  )
  const renderHowToJoin = (
    <div>
      {/* wrapbox(have scroll bar) */}
      <Row>
        {/* card row */}
        <Row className="overflow-auto gap-6 grow w-0">
          {/* step 1 */}
          <Card
            size="lg"
            className="shrink-0 flex flex-col py-5 px-4 gap-3 bg-[#1B1659] grow w-[206px] cyberpunk-bg-acceleraytor-prject-step-1"
          >
            <Col className="items-center gap-3">
              <StepBadge n={1} />
              <div className="text-sm text-center text-[#ABC4FF] font-semibold">Stake RAY</div>
            </Col>

            <Col className="grow gap-3">
              <div className="text-xs text-center text-[#ABC4FF] opacity-50">
                Stake and Earn RAY to participate in pools. The more and longer you stake the more lottery tickets
                you'll be eligible to join with.
              </div>
              <Col className="items-center">
                <Button
                  className="frosted-glass-skygray"
                  size="xs"
                  validators={[
                    {
                      should: connected,
                      forceActive: true,
                      fallbackProps: {
                        onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                        children: 'Connect Wallet'
                      }
                    }
                  ]}
                  onClick={() => {
                    useStaking.setState({
                      isStakeDialogOpen: true,
                      stakeDialogMode: 'deposit'
                    })
                  }}
                >
                  Stake
                </Button>

                <div className="text-xs text-center text-[#ABC4FF] opacity-50 mt-1">
                  APR: {toPercentString(stakingHydratedInfo?.totalApr)}
                </div>
              </Col>
            </Col>
          </Card>

          {/* step 2 */}
          <Card
            size="lg"
            className="shrink-0 flex flex-col py-5 px-4 gap-3 bg-[#1B1659] grow w-[206px] cyberpunk-bg-acceleraytor-prject-step-2"
          >
            <Col className="items-center gap-3">
              <StepBadge n={2} />
              <div className="text-sm text-center text-[#ABC4FF] font-semibold">Deposit {idoInfo.quote?.symbol}</div>
            </Col>

            <Col className="grow gap-3">
              <div className="text-xs text-center text-[#ABC4FF] opacity-50 space-y-3">
                <p>
                  When the pool opens, deposit {idoInfo.quote?.symbol} for each ticket in order for it to be counted in
                  the lottery.
                </p>
                <p>
                  The lottery will be done on-chain, with lottery numbers assigned to tickets in the order that users
                  deposit.
                </p>
              </div>
            </Col>
          </Card>

          {/* step 3 */}
          <Card
            size="lg"
            className="shrink-0 flex flex-col py-5 px-4 gap-3 bg-[#1B1659] grow w-[206px] cyberpunk-bg-acceleraytor-prject-step-3"
          >
            <Col className="items-center gap-3">
              <StepBadge n={3} />
              <div className="text-sm text-center text-[#ABC4FF] font-semibold">Claim tokens</div>
            </Col>

            <Col className="grow gap-3">
              <div className="text-xs text-center text-[#ABC4FF] opacity-50 space-y-3">
                <p>
                  If you have winning tickets you can claim your token allocation. You can then stake these tokens to
                  earn yield on them.
                </p>
                <p>For the non-winning tickets you can withdraw your {idoInfo.quote?.symbol}.</p>
              </div>
            </Col>
          </Card>
        </Row>
      </Row>
      <Link
        className="pt-4 rounded-none flex-grow font-medium text-[#ABC4FF] text-xs flex justify-center gap-1 items-center"
        href={idoInfo.project.detailDocLink}
      >
        <Icon size="sm" inline heroIconName="information-circle" />
        Read full details on Medium
      </Link>
    </div>
  )
  return (
    <Card
      className={twMerge('py-8 px-6 rounded-3xl border-1.5 border-[rgba(171,196,255,0.1)] bg-[#141041]', className)}
      size="lg"
    >
      <Tabs
        className="mb-6"
        currentValue={currentTab}
        values={shakeFalsyItem(['Project Details', 'How to join?'] as const)}
        onChange={(tab) => setCurrentTab(tab)}
      />

      {currentTab === 'Project Details' ? renderProjectDetails : renderHowToJoin}
      <StakingPageStakeLpDialog />
    </Card>
  )
}

function IdoInfoItem({
  fieldName,
  fieldValue,
  className
}: {
  className?: string
  fieldName?: ReactNode
  fieldValue?: ReactNode
}) {
  return (
    <div className={`py-3 px-4 ${className ?? ''}`}>
      <div>{fieldValue}</div>
      <div className="text-[#ABC4FF] font-bold text-xs opacity-50 mt-1">{fieldName}</div>
    </div>
  )
}

function IdoInputPanel({ className }: { className?: string }) {
  const idoInfo = useIdo((s) => s.currentIdoHydratedInfo)
  const { connected, balances, checkWalletHasEnoughBalance } = useWallet()
  const refreshIdo = useIdo((s) => s.refreshIdo)
  const refreshSelf = () => refreshIdo(idoInfo?.id)

  const [ticketAmount, setTicketAmount] = useState<Numberish | undefined>(undefined)
  const quoteTokenAmount =
    idoInfo?.quote && toTokenAmount(idoInfo.quote, mul(ticketAmount, idoInfo.ticketPrice), { alreadyDecimaled: true })

  const haveEnoughQuoteCoin = useMemo(
    () => Boolean(quoteTokenAmount && checkWalletHasEnoughBalance(quoteTokenAmount)),
    [quoteTokenAmount, checkWalletHasEnoughBalance, balances]
  )

  const clickPurchase = async () => {
    if (!idoInfo || !ticketAmount) return
    try {
      await txIdoPurchase({
        idoInfo,
        amount: toBN(ticketAmount),
        onTxSuccess: () => {
          refreshSelf()
        }
      })
      // eslint-disable-next-line no-empty
    } catch (err) {}
  }

  if (!idoInfo) return null
  const renderPoolUpcoming = (
    <div>
      Pool opens in{' '}
      <CountDownClock
        type="text"
        showDays="auto"
        showHours="auto"
        endTime={idoInfo.state.endTime.toNumber()}
        onEnd={refreshSelf}
      />
    </div>
  )
  const renderPoolOpen = (
    <div>
      Pool opens in{' '}
      <CountDownClock
        type="text"
        showDays="auto"
        showHours="auto"
        endTime={idoInfo.state.endTime.toNumber()}
        onEnd={refreshSelf}
      />
    </div>
  )
  const renderPoolClosed = (
    <div>
      Pool opens in{' '}
      <CountDownClock
        type="text"
        showDays="auto"
        showHours="auto"
        endTime={idoInfo.state.endTime.toNumber()}
        onEnd={refreshSelf}
      />
    </div>
  )

  return (
    <CyberpunkStyleCard className="flex flex-col p-6 gap-5" wrapperClassName={className}>
      <div className="font-semibold text-base text-white">
        {idoInfo.status === 'upcoming'
          ? renderPoolUpcoming
          : idoInfo.status === 'open'
          ? renderPoolOpen
          : renderPoolClosed}
      </div>

      <AlertText
        className="p-3 bg-[rgba(171,196,255,0.1)] rounded-xl text-[#ABC4FF80] text-xs font-semibold"
        iconSize="sm"
      >
        Once deposited USDC can be claimed after lottery ends and tokens after 2022.03.10 14.00 UTC.
      </AlertText>

      <div className="space-y-3">
        <CoinInputBox
          className="px-4"
          topLeftLabel="Tickets"
          topRightLabel={`Eligible tickets: ${toString(idoInfo.userEligibleTicketAmount ?? 0)}`}
          maxValue={idoInfo.userEligibleTicketAmount}
          hideTokenPart
          hidePricePredictor
          onUserInput={(input) => setTicketAmount(input)}
        />
        <CoinInputBox
          className="px-4"
          topLeftLabel="Deposit"
          token={idoInfo.quote}
          value={toString(quoteTokenAmount)}
          disabled
          haveCoinIcon
        />
      </div>

      <Button
        className="block w-full frosted-glass-teal"
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
            should: idoInfo?.isEligible,
            fallbackProps: { children: 'Wallet not eligible for this pool' }
          },
          {
            should: !idoInfo.ledger?.quoteDeposited || eq(idoInfo.ledger.quoteDeposited, 0),
            fallbackProps: { children: 'Joined' }
          },
          {
            should: (idoInfo.ledger?.depositedTickets?.length ?? 0) === 0,
            fallbackProps: { children: 'You have already deposited' }
          },
          {
            should: gt(ticketAmount, 0),
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
            should: ticketAmount && lte(ticketAmount, idoInfo.state.perUserMaxLotteries),
            fallbackProps: { children: `Max. tickets amount is ${idoInfo.userEligibleTicketAmount}` }
          },
          {
            should: ticketAmount && lte(ticketAmount, idoInfo.userEligibleTicketAmount),
            fallbackProps: { children: `Not enough eligible tickets` }
          },
          {
            should: haveEnoughQuoteCoin,
            fallbackProps: { children: `Not enough ${idoInfo.quote?.symbol ?? ''}` }
          }
        ]}
        onClick={clickPurchase}
      >
        Join Lottery
      </Button>
      <Link className="text-xs text-center text-[#ABC4FF] opacity-50 font-semibold py-3 border-t border-[rgba(171,196,255,0.1)]">
        When can I withdraw?
      </Link>
    </CyberpunkStyleCard>
  )
}

function StepBadge(props: { n: number }) {
  return (
    <CyberpunkStyleCard wrapperClassName="w-8 h-8" className="grid place-content-center bg-[#2f2c78]">
      <div className="font-semibold text-white">{props.n}</div>
    </CyberpunkStyleCard>
  )
}
