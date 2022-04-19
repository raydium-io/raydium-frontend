import { currentIsAfter, currentIsBefore } from '@/functions/date/judges'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { Percent, Price } from '@raydium-io/raydium-sdk'

import { BackendApiIdoListItem, HydratedIdoInfo, SdkIdoInfo, TicketInfo, TicketTailNumberInfo } from '../type'
import { eq, isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, getMin, mul } from '@/functions/numberish/operations'
import { usdCurrency } from '@/functions/format/toTokenPrice'

function isLotteryUpcoming(idoInfo: SdkIdoInfo): boolean {
  return currentIsBefore(idoInfo.startTime)
}

function isLotteryOpen(idoInfo: SdkIdoInfo): boolean {
  return currentIsAfter(idoInfo.startTime) && currentIsBefore(idoInfo.endTime)
}

function isLotteryClosed(idoInfo: SdkIdoInfo): boolean {
  return currentIsAfter(idoInfo.startWithdrawTime)
}

function canLotteryWithdrawBase(idoInfo: SdkIdoInfo): boolean {
  return currentIsAfter(idoInfo.startWithdrawTime)
}

function getDepositedTickets(idoInfo: SdkIdoInfo): TicketInfo[] {
  if (!idoInfo.ledger) return []
  const begin = Number(idoInfo.ledger.startNumber)
  const end = Number(idoInfo.ledger.endNumber)
  return Array.from({ length: end - begin + 1 }, (_, i) => ({ no: begin + i }))
}

function isTicketWin(ticketNumber: number, idoInfo: SdkIdoInfo): boolean | undefined {
  const luckyNumbers = idoInfo.state?.luckyNumbers
  const isTargeted = luckyNumbers?.some(
    ({ digits, number, endRange }) =>
      Number(digits) &&
      Number(ticketNumber) <= Number(endRange) &&
      String(ticketNumber)
        .padStart(Number(digits), '0')
        .endsWith(String(number).padStart(Number(digits), '0'))
  )
  return isTargeted
}

function getWinningTickets(idoInfo: SdkIdoInfo) {
  const isWinning = idoInfo.state?.isWinning.toNumber()
  // 0 not roll
  if (isWinning === 0) return []
  // 1 hit not win
  if (isWinning === 1) return getDepositedTickets(idoInfo).filter((ticket) => !isTicketWin(ticket.no, idoInfo))
  // 2 hit is win
  if (isWinning === 2) return getDepositedTickets(idoInfo).filter((ticket) => isTicketWin(ticket.no, idoInfo))
  // 3 all win
  if (isWinning === 3) return getDepositedTickets(idoInfo)
}

function getWinningTicketsTailNumbers(idoInfo: SdkIdoInfo): HydratedIdoInfo['winningTicketsTailNumber'] | undefined {
  if (!idoInfo.state) return
  const isWinning = idoInfo.state?.isWinning.toNumber() as 0 | 1 | 2 | 3
  const luckyNumberRawList: TicketTailNumberInfo[] = idoInfo.state.luckyNumbers
    .filter(({ digits }) => digits.toNumber() !== 0)
    .map(({ number, digits, endRange }) => ({
      no: String(number).padStart(Number(digits), '0'),
      isPartial: idoInfo.state!.raisedLotteries.toNumber() !== endRange.toNumber()
    }))
  // 1 hit not win
  if (isWinning === 1) return { tickets: luckyNumberRawList, isWinning }
  // 2 hit is win
  if (isWinning === 2) return { tickets: luckyNumberRawList, isWinning }
  // 3 all win
  if (isWinning === 3) return { tickets: [], isWinning }
  // 0 not roll
  return { tickets: [], isWinning }
}

/**
 *  computed from raw idoInfo
 */
export function hydrateIdoInfo(idoInfo: SdkIdoInfo): HydratedIdoInfo {
  const isUpcoming = isLotteryUpcoming(idoInfo)
  const isOpen = isLotteryOpen(idoInfo)
  const isClosed = isLotteryClosed(idoInfo)
  const canWithdrawBase = canLotteryWithdrawBase(idoInfo)

  const depositedTickets = getDepositedTickets(idoInfo).map((ticketInfo) => ({
    ...ticketInfo,
    isWinning: isTicketWin(ticketInfo.no, idoInfo)
  }))
  const winningTickets = getWinningTickets(idoInfo)
  const userEligibleTicketAmount = idoInfo.snapshot?.maxLotteries
  const isEligible = isMeaningfulNumber(userEligibleTicketAmount)

  const totalRaise = idoInfo.base && idoInfo.state && toTokenAmount(idoInfo.base, idoInfo.state.baseSupply)
  const coinPrice =
    idoInfo.base &&
    idoInfo.state &&
    new Price(idoInfo.base, idoInfo.state.denominator, usdCurrency, idoInfo.state.numerator)
  const ticketPrice =
    idoInfo.quote && idoInfo.state && toTokenAmount(idoInfo.quote, idoInfo.state.perLotteryQuoteAmount)
  const depositedTicketCount = idoInfo.state && idoInfo.state.raisedLotteries.toNumber()

  const userAllocation =
    idoInfo.state &&
    depositedTicketCount &&
    mul(div(winningTickets?.length, getMin(idoInfo.state.maxWinLotteries, depositedTicketCount)), totalRaise)

  const claimableQuote =
    (isClosed &&
      idoInfo.ledger &&
      eq(0, idoInfo.ledger.quoteWithdrawn) &&
      idoInfo.quote &&
      toTokenAmount(idoInfo.quote, idoInfo.ledger.quoteDeposited)) ||
    undefined

  const filled = idoInfo.state && new Percent(idoInfo.state.raisedLotteries, idoInfo.state.maxWinLotteries).toFixed()
  return {
    ...idoInfo,
    winningTicketsTailNumber: getWinningTicketsTailNumbers(idoInfo),
    depositedTickets,
    userAllocation,
    depositedTicketCount,

    isUpcoming,
    isOpen,
    isClosed,
    canWithdrawBase,

    totalRaise,
    coinPrice,
    ticketPrice,

    filled,

    claimableQuote,
    userEligibleTicketAmount,
    isEligible
  } as HydratedIdoInfo
}
