import type { DaySummary } from '../api/types'
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

export const INVALID_CASH_MESSAGE = '金額只能輸入數字，不含小數點、正負號或其他符號'

export function parseCash(input: string): number | null {
  const trimmed = input.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

export function isInvalidCash(input: string): boolean {
  return input.trim() !== '' && parseCash(input) === null
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
