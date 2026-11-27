import type { DaySummary } from '../api/types'
import { MAX_INT, parseWholeNumber, wholeNumberError } from './numbers'
import { money, rocDate } from './roc'

export interface ClosingPeriod {
  title: string
  confirmNote: string
}

/** 上次日結之後若有漏結的日子，這次日結會把那幾天的現金一起結掉。 */
export function closingPeriod(summary: Pick<DaySummary, 'from' | 'date'>): ClosingPeriod {
  if (summary.from === null) {
    return { title: '尚未日結過，列出到今天為止所有入帳的收款', confirmNote: '第一次日結，會把到今天為止所有現金一起結掉。' }
  }
  if (summary.from !== summary.date) {
    return {
      title: `${rocDate(summary.from)} 至 ${rocDate(summary.date)} 入帳的收款（含中間漏結的日子）`,
      confirmNote: '這次日結會把上次日結之後的現金一起結掉。',
    }
  }
  return { title: `今日收款（入帳日 ${rocDate(summary.date)}）`, confirmNote: '' }
}

/** 實點現金是上次日結以來的累計，不是單筆金額，所以不套單筆上限，只擋到 INT。 */
export function parseCash(input: string): number | null {
  return parseWholeNumber(input)
}

export const SYSTEM_CASH_OUT_OF_RANGE = '上次日結以來的系統現金合計超出可記錄的範圍，無法日結，請聯絡管理員'
export const DIFFERENCE_OUT_OF_RANGE = '實點與系統合計的差額超出可記錄的範圍，請確認實點金額'

/** 日結的系統合計、差額在資料表都是 INT，超出就會被後端拒絕。 */
function outsideInt(value: number): boolean {
  return value < -MAX_INT - 1 || value > MAX_INT
}

export function cashError(input: string, systemCash: number): string | null {
  const malformed = wholeNumberError(input, '金額')
  if (malformed) return malformed
  if (outsideInt(systemCash)) return SYSTEM_CASH_OUT_OF_RANGE
  const diff = cashDifference(parseCash(input), systemCash)
  return diff !== null && outsideInt(diff) ? DIFFERENCE_OUT_OF_RANGE : null
}

export function cashDifference(counted: number | null, systemCash: number): number | null {
  return counted === null ? null : counted - systemCash
}

export function differenceText(diff: number | null): string {
  if (diff === null) return '—'
  if (diff === 0) return money(0)
  return diff > 0 ? `長款 +${money(diff)}` : `短款 ${money(diff)}`
}

export function differenceHint(diff: number | null): string {
  if (diff === null) return '輸入實點金額後即時計算'
  return diff === 0 ? '帳平' : '差額會記入日結，不改任何單據；事後查明用更正單對銷'
}

export function signedMoney(amount: number): string {
  return amount > 0 ? `+${money(amount)}` : money(amount)
}
