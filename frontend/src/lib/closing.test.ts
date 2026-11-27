import { describe, expect, it } from 'vitest'
import { money } from './roc'
import { amendedCash, cashDifference, closingPeriod, countedAmount, differenceHint, differenceText, signedMoney } from './closing'

describe('closingPeriod', () => {
  it('covers everything up to today before the first closing', () => {
    expect(closingPeriod({ from: null, date: '2026-11-27' })).toEqual({
      title: '尚未日結過，列出到今天為止所有入帳的收款',
      confirmNote: '第一次日結，會把到今天為止所有現金一起結掉。',
    })
  })

  it('spans the missed days since the last closing', () => {
    expect(closingPeriod({ from: '2026-11-25', date: '2026-11-27' })).toEqual({
      title: '115/11/25 至 115/11/27 入帳的收款（含中間漏結的日子）',
      confirmNote: '這次日結會把上次日結之後的現金一起結掉。',
    })
  })

  it('is just today when yesterday was closed', () => {
    expect(closingPeriod({ from: '2026-11-27', date: '2026-11-27' })).toEqual({ title: '今日收款（入帳日 115/11/27）', confirmNote: '' })
  })
})

describe('cash difference', () => {
  it('stays unknown until something is counted', () => {
    expect(countedAmount('')).toBeNull()
    expect(countedAmount('0')).toBe(0)
    expect(cashDifference(null, 500)).toBeNull()
    expect(cashDifference(450, 500)).toBe(-50)
  })

  it('labels over, short and balanced drawers', () => {
    expect(differenceText(null)).toBe('—')
    expect(differenceText(0)).toBe(money(0))
    expect(differenceText(30)).toBe(`長款 +${money(30)}`)
    expect(differenceText(-30)).toBe(`短款 ${money(-30)}`)
    expect(differenceHint(null)).toBe('輸入實點金額後即時計算')
    expect(differenceHint(0)).toBe('帳平')
    expect(differenceHint(-1)).toBe('差額會記入日結，不改任何單據；事後查明用更正單對銷')
  })

  it('prefixes positive history differences with a plus sign', () => {
    expect(signedMoney(20)).toBe(`+${money(20)}`)
    expect(signedMoney(0)).toBe(money(0))
    expect(signedMoney(-20)).toBe(money(-20))
  })
})

describe('amendedCash', () => {
  it('accepts whole non-negative amounts only', () => {
    expect(amendedCash('4300')).toBe(4300)
    expect(amendedCash('0')).toBe(0)
    expect(amendedCash('')).toBeNull()
    expect(amendedCash('  ')).toBeNull()
    expect(amendedCash('-1')).toBeNull()
    expect(amendedCash('12.5')).toBeNull()
    expect(amendedCash('abc')).toBeNull()
  })
})
