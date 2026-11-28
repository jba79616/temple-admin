import type { WenshuPerson } from '../api/types'
import { BRANCHES, ganzhiOfYear, isValidGanzhi } from './roc'

const DIGITS = '〇一二三四五六七八九'
const ZODIAC = '鼠牛虎兔龍蛇馬羊猴雞狗豬'
/** 系統的生庚空值一律印「吉」，與戶頁、疏文名單一致。 */
const UNKNOWN = '吉'

export function chineseNumber(n: number): string {
  if (n <= 10) return n === 10 ? '十' : DIGITS[n]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return (tens === 1 ? '' : DIGITS[tens]) + '十' + (ones ? DIGITS[ones] : '')
}

export function lunarMonthText(month: number, leap = false): string {
  return (leap ? '閏' : '') + (month === 1 ? '正' : chineseNumber(month))
}

export function lunarDayText(day: number): string {
  if (day <= 10) return '初' + chineseNumber(day)
  if (day < 20 || day % 10 === 0) return chineseNumber(day)
  return '廿' + DIGITS[day - 20]
}

export interface BirthText {
  year: string
  month: string
  day: string
  hour: string
  zodiac: string
}

export function birthTextOf(p: Pick<WenshuPerson, 'ganzhi' | 'leap' | 'month' | 'day' | 'hour'>): BirthText {
  const branch = p.ganzhi && isValidGanzhi(p.ganzhi) ? BRANCHES.indexOf(p.ganzhi[1]) : -1
  return {
    year: p.ganzhi ?? UNKNOWN,
    month: p.month ? lunarMonthText(p.month, p.leap) : UNKNOWN,
    day: p.day ? lunarDayText(p.day) : UNKNOWN,
    hour: p.hour ?? UNKNOWN,
    zodiac: branch < 0 ? '' : ZODIAC[branch],
  }
}

/** 直書時阿拉伯數字會橫躺或擠成一團，逐位換成國字；「5-6號」的連字號照門牌慣例念成「之」。 */
export function verticalAddress(text: string): string {
  return text
    .replace(/[0-9０-９]/g, (d) => DIGITS[Number(d.normalize('NFKC'))])
    .replace(/(?<=[〇一二三四五六七八九])[-－‐–—](?=[〇一二三四五六七八九])/g, '之')
}

export type Believer = '信士' | '信女' | '信士信女'

export function believerOf(gender: string | null): Believer {
  if (gender === 'M') return '信士'
  if (gender === 'F') return '信女'
  return '信士信女'
}

export interface LunarDate {
  year: string
  month: string
  day: string
}

/** 用瀏覽器內建的農曆（ICU chinese calendar）換算，廟裡的日期以臺北時間為準；沒有農曆資料的環境回空白，讓人手填而不是印錯。 */
export function lunarDateOf(date: Date): LunarDate {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-chinese', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(date)
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const year = Number(part('relatedYear'))
  const month = parseInt(part('month'), 10)
  const day = Number(part('day'))
  if (!year || !month || !day) return { year: '', month: '', day: '' }
  return {
    year: ganzhiOfYear(year),
    month: lunarMonthText(month, part('month').endsWith('bis')),
    day: lunarDayText(day),
  }
}

export type WenshuDates = { ritual: LunarDate; petition: LunarDate }

export const DATE_PARTS = ['year', 'month', 'day'] as const

export function dateParamKey(key: keyof WenshuDates, part: keyof LunarDate) {
  return key + part[0].toUpperCase() + part.slice(1)
}

/** PDF 轉檔的路徑只收英數與 %-encoded；URLSearchParams 不編碼的符號（空白、*）會被擋，所以只留文字與數字。 */
export function toDatePart(raw: string) {
  return raw.replace(/[^\p{L}\p{N}]/gu, '')
}

/** 列印頁把今涓、天運帶進文疏頁的網址；文疏頁和伺服器轉 PDF 都照網址上的日期印。 */
export function wenshuDateQuery(dates: WenshuDates) {
  const query = new URLSearchParams()
  for (const key of ['ritual', 'petition'] as const) {
    DATE_PARTS.forEach((part) => query.set(dateParamKey(key, part), toDatePart(dates[key][part])))
  }
  return query.toString()
}

export function householdRangeText(from: number, to: number) {
  return from === to ? `第 ${from} 戶` : `第 ${from}–${to} 戶`
}
