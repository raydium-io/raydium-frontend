import BN from 'bn.js'

import { SplToken, Token } from '@/application/token/type'
import { currentIsAfter, currentIsBefore } from '@/functions/date/judges'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { divide, greaterThan, multiply } from '@/functions/numberish/stringNumber'
import { StringNumber } from '@/types/constants'
import { Percent } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { HydratedIdoInfo, SdkParsedIdoInfo, TicketInfo, TicketTailNumberInfo } from '../type'
import { gt } from '@/functions/numberish/compare'
import { mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'

export function isLotteryUpcoming(idoInfo: SdkParsedIdoInfo): boolean {
  return currentIsBefore(idoInfo.state.startTime.toNumber())
}

export function isLotteryOpen(idoInfo: SdkParsedIdoInfo): boolean {
  return currentIsAfter(idoInfo.state.startTime.toNumber()) && currentIsBefore(idoInfo.state.endTime.toNumber())
}

export function isLotteryClosed(idoInfo: SdkParsedIdoInfo): boolean {
  return currentIsAfter(idoInfo.state.endTime.toNumber())
}

function getDepositedTickets(idoInfo: SdkParsedIdoInfo): TicketInfo[] {
  if (!idoInfo.ledger) return []
  const begin = Number(idoInfo.ledger.startNumber)
  const end = Number(idoInfo.ledger.endNumber)
  return Array.from({ length: end - begin + 1 }, (_, i) => ({ no: begin + i }))
}

function getUserAllocation(idoInfo: SdkParsedIdoInfo): StringNumber {
  if (!idoInfo.ledger) return `0 ${idoInfo.base?.symbol ?? ''}`
  return gt(idoInfo.state.quoteDeposited, mul(idoInfo.state.perLotteryQuoteAmount, idoInfo.state.perLotteryMinStake))
    ? multiply(divide(idoInfo.ledger.quoteDeposited, idoInfo.state.quoteDeposited), idoInfo.state.baseSupply)
    : divide(idoInfo.ledger.quoteDeposited, idoInfo.state.perLotteryMinStake)
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
  return {
    ...(idoInfo ?? {}),
    state: {
      ...idoInfo.state,
      winningTicketsTailNumber: getWinningTicketsTailNumbers(idoInfo)
    },
    ledger: idoInfo.ledger
      ? {
          ...(idoInfo.ledger ?? {}),
          winningTickets: getWinningTickets(idoInfo),
          userAllocation: getUserAllocation(idoInfo),
          depositedTickets: getDepositedTickets(idoInfo)
        }
      : undefined,
    status: isLotteryUpcoming(idoInfo) ? 'upcoming' : isLotteryOpen(idoInfo) ? 'open' : 'closed',
    raise: getIdoRaise(idoInfo.base, idoInfo.state.maxWinLotteries),
    price: getIdoPrice(idoInfo.quote, idoInfo.state.perLotteryQuoteAmount),
    filled: getIdoFilled(idoInfo),
    ...getEligibleInfo(idoInfo)
  }
}

function getIdoRaise(
  base: SplToken | undefined,
  maxWinLotteries: SdkParsedIdoInfo['state']['maxWinLotteries'] | undefined
): string | undefined {
  const value = base && maxWinLotteries ? toString(toTokenAmount(base, maxWinLotteries)) : undefined
  return value
}

function getIdoPrice(
  quote: SplToken | undefined,
  perLotteryQuoteAmount: SdkParsedIdoInfo['state']['perLotteryQuoteAmount'] | undefined
): string | undefined {
  const price = quote && perLotteryQuoteAmount ? toString(toTokenAmount(quote, perLotteryQuoteAmount)) : undefined
  return price
}

function getIdoFilled(idoInfo: SdkParsedIdoInfo) {
  return new Percent(idoInfo.state.raisedLotteries, idoInfo.state.maxWinLotteries).toFixed()
}

function getEligibleInfo(idoInfo: SdkParsedIdoInfo): { userEligibleTicketAmount: BN; isEligible: boolean } {
  const needSnapshot = !new PublicKey(0).equals(new PublicKey(idoInfo.snapshotProgramId))
  const userEligibleTicketAmount = needSnapshot
    ? (idoInfo.snapshot?.maxLotteries ?? new BN(0)).add(idoInfo.state.perUserMaxLotteries)
    : idoInfo.state.perUserMaxLotteries
  const isEligible = isLotteryClosed(idoInfo) || !userEligibleTicketAmount.isZero()
  return { userEligibleTicketAmount, isEligible }
}
