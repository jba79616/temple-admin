import { describe, expect, it } from 'vitest'
import { money } from './roc'
import { cashDifference, closingPeriod, differenceHint, differenceText, isInvalidCash, parseCash, signedMoney } from './closing'

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
    expect(parseCash('')).toBeNull()
    expect(parseCash('0')).toBe(0)
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

describe('parseCash', () => {
  it('accepts plain digits, ignoring surrounding spaces', () => {
    expect(parseCash('4300')).toBe(4300)
    expect(parseCash('0')).toBe(0)
    expect(parseCash('007')).toBe(7)
    expect(parseCash(' 4300 ')).toBe(4300)
  })

  it.each(['', '  ', '-1', '+5', '12.5', '12.0', '1e2', '0x10', '0b11', 'abc', '1 000', '1,000', 'Infinity'])('rejects %j', (input) => {
    expect(parseCash(input)).toBeNull()
  })
})

describe('isInvalidCash', () => {
  it('flags non-empty input that is not plain digits', () => {
    expect(isInvalidCash('')).toBe(false)
    expect(isInvalidCash('   ')).toBe(false)
    expect(isInvalidCash('4300')).toBe(false)
    expect(isInvalidCash(' 4300 ')).toBe(false)
    expect(isInvalidCash('1e2')).toBe(true)
    expect(isInvalidCash('-5')).toBe(true)
    expect(isInvalidCash('12.5')).toBe(true)
  })
})
