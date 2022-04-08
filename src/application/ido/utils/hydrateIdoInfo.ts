import BN from 'bn.js'

import { currentIsAfter, currentIsBefore } from '@/functions/date/judges'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { Percent, Price } from '@raydium-io/raydium-sdk'

import { HydratedIdoInfo, SdkParsedIdoInfo, TicketInfo, TicketTailNumberInfo } from '../type'
import { eq, isMeaningfulNumber } from '@/functions/numberish/compare'
import { div, getMin, mul } from '@/functions/numberish/operations'
import { usdCurrency } from '@/functions/format/toTokenPrice'

function isLotteryUpcoming(idoInfo: SdkParsedIdoInfo): boolean {
  return currentIsBefore(idoInfo.state.startTime.toNumber())
}

function isLotteryOpen(idoInfo: SdkParsedIdoInfo): boolean {
  return currentIsAfter(idoInfo.state.startTime.toNumber()) && currentIsBefore(idoInfo.state.endTime.toNumber())
}

function isLotteryClosed(idoInfo: SdkParsedIdoInfo): boolean {
  return currentIsAfter(idoInfo.state.startWithdrawTime.toNumber())
}

function canLotteryWithdrawBase(idoInfo: SdkParsedIdoInfo): boolean {
  return currentIsAfter(idoInfo.state.startWithdrawTime.toNumber())
}

function getDepositedTickets(idoInfo: SdkParsedIdoInfo): TicketInfo[] {
  if (!idoInfo.ledger) return []
  const begin = Number(idoInfo.ledger.startNumber)
  const end = Number(idoInfo.ledger.endNumber)
  return Array.from({ length: end - begin + 1 }, (_, i) => ({ no: begin + i }))
}

function isTicketWin(ticketNumber: number, idoInfo: SdkParsedIdoInfo): boolean {
  const luckyNumbers = idoInfo.state.luckyNumbers
  const isTargeted = luckyNumbers.some(
    ({ digits, number, endRange }) =>
      Number(digits) &&
      Number(ticketNumber) <= Number(endRange) &&
      String(ticketNumber)
        .padStart(Number(digits), '0')
        .endsWith(String(number).padStart(Number(digits), '0'))
  )
  return isTargeted
}

function getWinningTickets(idoInfo: SdkParsedIdoInfo) {
  const isWinning = idoInfo.state.isWinning.toNumber()
  // 0 not roll
  if (isWinning === 0) return []
  // 1 hit not win
  if (isWinning === 1) return getDepositedTickets(idoInfo).filter((ticket) => !isTicketWin(ticket.no, idoInfo))
  // 2 hit is win
  if (isWinning === 2) return getDepositedTickets(idoInfo).filter((ticket) => isTicketWin(ticket.no, idoInfo))
  // 3 all win
  if (isWinning === 3) return getDepositedTickets(idoInfo)
}

function getWinningTicketsTailNumbers(idoInfo: SdkParsedIdoInfo): HydratedIdoInfo['state']['winningTicketsTailNumber'] {
  const isWinning = idoInfo.state.isWinning.toNumber() as 0 | 1 | 2 | 3
  const luckyNumberRawList: TicketTailNumberInfo[] = idoInfo.state.luckyNumbers
    .filter(({ digits }) => digits.toNumber() !== 0)
    .map(({ number, digits, endRange }) => ({
      no: String(number).padStart(Number(digits), '0'),
      isPartial: idoInfo.state.raisedLotteries.toNumber() !== endRange.toNumber()
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
export function hydrateIdoInfo(idoInfo: SdkParsedIdoInfo): HydratedIdoInfo {
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

  const totalRaise = idoInfo.base && toTokenAmount(idoInfo.base, idoInfo.state.baseSupply)
  const coinPrice =
    idoInfo.base && new Price(idoInfo.base, idoInfo.state.denominator, usdCurrency, idoInfo.state.numerator)
  const ticketPrice = idoInfo.quote && toTokenAmount(idoInfo.quote, idoInfo.state.perLotteryQuoteAmount)
  const depositedTicketCount = idoInfo.state.raisedLotteries.toNumber()
  const idoLedger = idoInfo.ledger
    ? {
        ...(idoInfo.ledger ?? {}),
        winningTickets,
        userAllocation: mul(
          div(winningTickets?.length, getMin(idoInfo.state.maxWinLotteries, depositedTicketCount)),
          totalRaise
        ),
        depositedTickets: depositedTickets
      }
    : undefined

  const claimableQuote =
    (isClosed &&
      idoLedger &&
      eq(0, idoLedger.quoteWithdrawn) &&
      idoInfo.quote &&
      toTokenAmount(idoInfo.quote, idoLedger.quoteDeposited)) ||
    undefined

  return {
    ...(idoInfo ?? {}),
    state: {
      ...idoInfo.state,
      winningTicketsTailNumber: getWinningTicketsTailNumbers(idoInfo)
    },
    ledger: idoLedger,

    isUpcoming: true,
    isOpen,
    isClosed,
    canWithdrawBase,

    totalRaise,
    coinPrice,
    ticketPrice,

    filled: getIdoFilled(idoInfo),
    depositedTicketCount,

    claimableQuote,
    userEligibleTicketAmount,
    isEligible
  } as HydratedIdoInfo
}

function getIdoFilled(idoInfo: SdkParsedIdoInfo) {
  return new Percent(idoInfo.state.raisedLotteries, idoInfo.state.maxWinLotteries).toFixed()
}
