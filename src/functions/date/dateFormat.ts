import { TimeStamp } from './interface'

/**
 * @example
 * toUTC() // => '2021-09-09 10:25 UTC'
 * toUTC('Thu, 09 Sep 2021 10:26:33 GMT') // => '2021-09-09 10:25 UTC'
 */
export function toUTC(timestamp?: TimeStamp, options?: { hideUTCBadge?: boolean; showSeconds?: boolean }): string {
  const utcString = (timestamp ? new Date(Number(timestamp)) : new Date()).toISOString() // '2021-09-09T10:32:32.498Z'
  const matchInfo = utcString.match(/^([\d-]+)T(\d+):(\d+):(\d+)/)
  const [, date, hour, minutes, seconds] = matchInfo ?? []
  return options?.showSeconds
    ? `${date} ${hour}:${minutes}:${seconds}${options.hideUTCBadge ? '' : ' UTC'}`
    : `${date} ${hour}:${minutes}${options?.hideUTCBadge ? '' : ' UTC'}`
}

export function toTimestampNumber(a: TimeStamp) {
  try {
    return new Date(a).getTime()
  } catch {
    return NaN
  }
}
export function toTimestampJsonString(a: TimeStamp) {
  try {
    return JSON.stringify(new Date(a))
  } catch {
    return NaN
  }
}

export type DateParam = string | number | Date | undefined

export const getDate = (value?: DateParam) => (value ? new Date(value) : new Date())
export const getTime = (value?: DateParam) => getDate(value).getTime()
export const getISO = (value?: DateParam) => getDate(value).toISOString()

const mapToEnglishDay = (dayNumber: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayNumber] ?? ''
const mapToChineseDay = (dayNumber: number) => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayNumber] ?? ''

const mapToAmPmHour = (hourNumber: number) =>
  hourNumber > 12 ? { hour: hourNumber - 12, flag: 'PM' } : { hour: hourNumber, flag: 'AM' }

/**
 * date format string list:
 *
 * YYYY	2018	(year)
 * YY	  18	  (year)
 * MM	  01-12 (mounth)
 * M	    1-12	(mounth)
 * DD	  01-31	 (day)
 * D 	  1-31	 (day)
 * dd	  Sun / Mon / Tue / Wed / Thu / Fri / Sat (day)
 * d	    0-6	 (week)
 * HH	  00-23	(hour)
 * H 	  0-23	(hour)
 * hh	  01-12	(hour)
 * h   	1-12	(hour)
 * mm  	00-59	(minutes), 2-digits
 * m	    0-59	(minutes)
 * ss  	00-59	(seconds), 2-digits
 * s   	0-59	(seconds)
 * SSS	  000-999	(milliseconds), 3-digits
 * A	    AM PM
 * a	    am pm
 * @example
 * formatDate('2020-08-24 18:54', 'YYYY-MM-DD HH:mm:ss') // 2020-08-24 18:54:00
 */
export function formatDate(
  inputDate: string | number | Date | undefined,
  formatString: /* 'YY-MM-DD hh:mm:ss' & */ string,
  options?: { /** default is 'en' */ weekNameStyle?: 'en' | 'zh-cn' }
) {
  const dateObj = getDate(inputDate)

  return formatString
    .replace('YYYY', `${dateObj.getFullYear()}`)
    .replace('YY', `${dateObj.getFullYear()}`.slice(2))
    .replace('MM', `${dateObj.getMonth() + 1}`.padStart(2, '0'))
    .replace('M', `${dateObj.getMonth() + 1}`)
    .replace('DD', `${dateObj.getDate()}`.padStart(2, '0'))
    .replace('D', `${dateObj.getDate()}`)
    .replace(
      'dd',
      `${options?.weekNameStyle === 'zh-cn' ? mapToChineseDay(dateObj.getDay()) : mapToEnglishDay(dateObj.getDay())}`
    )
    .replace('d', `${dateObj.getDay()}`)
    .replace('HH', `${dateObj.getHours()}`.padStart(2, '0'))
    .replace('H', `${dateObj.getHours()}`)
    .replace('hh', `${mapToAmPmHour(dateObj.getHours()).hour}`.padStart(2, '0'))
    .replace('h', `${mapToAmPmHour(dateObj.getHours()).hour}`)
    .replace('mm', `${dateObj.getMinutes()}`.padStart(2, '0'))
    .replace('m', `${dateObj.getMinutes()}`)
    .replace('ss', `${dateObj.getSeconds()}`.padStart(2, '0'))
    .replace('s', `${dateObj.getSeconds()}`)
    .replace('SSS', `${dateObj.getMilliseconds()}`.padStart(3, '0'))
    .replace('A', mapToAmPmHour(dateObj.getMilliseconds()).flag)
    .replace('SSS', mapToAmPmHour(dateObj.getMilliseconds()).flag.toLocaleLowerCase())
}
export function offsetDateTime(
  baseDate: DateParam,
  offset: number,
  options: { unit: 'minutes' | 'seconds' | 'milliseconds' }
) {
  const timestamp = getTime(baseDate)
  const offsetedTimestamp =
    timestamp + (options.unit === 'minutes' ? offset * 60 * 1000 : options.unit === 'seconds' ? offset * 1000 : offset)
  return getDate(offsetedTimestamp)
}
