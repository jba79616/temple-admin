import { describe, expect, it, vi } from 'vitest'
import { money } from './roc'
import { DIFFERENCE_OUT_OF_RANGE, LARGE_DIFFERENCE_THRESHOLD, SYSTEM_CASH_OUT_OF_RANGE, cashDifference, closingPeriod, differenceHint, differenceText, cashError, confirmLargeDifference, isLargeDifference, largeDifferenceConfirmText, parseCash, signedMoney } from './closing'

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
    expect(parseCash('４３００')).toBe(4300)
    expect(parseCash('1000000')).toBe(1_000_000)
    expect(parseCash('１００００００')).toBe(1_000_000)
  })

  it('accepts accumulated cash above the per-item amount limit up to INT', () => {
    expect(parseCash('1000001')).toBe(1_000_001)
    expect(parseCash('2147483647')).toBe(2_147_483_647)
  })

  it.each(['', '  ', '-1', '+5', '12.5', '12.0', '1e2', '0x10', '0b11', 'abc', '1 000', '1,000', 'Infinity', '2147483648', '99999999999999999999', '－5'])('rejects %j', (input) => {
    expect(parseCash(input)).toBeNull()
  })
})

describe('cashError', () => {
  it('flags a difference the INT column cannot hold', () => {
    expect(cashError('2147483647', -1)).toBe(DIFFERENCE_OUT_OF_RANGE)
    expect(cashError('2147483647', 0)).toBeNull()
    expect(cashError('0', 2_147_483_647)).toBeNull()
  })

  it('flags system cash beyond INT even before cash is entered', () => {
    expect(cashError('', 2_147_483_648)).toBe(SYSTEM_CASH_OUT_OF_RANGE)
    expect(cashError('0', 3_000_000_000)).toBe(SYSTEM_CASH_OUT_OF_RANGE)
    expect(cashError('0', -2_147_483_649)).toBe(SYSTEM_CASH_OUT_OF_RANGE)
    expect(cashError('', -2_147_483_648)).toBeNull()
  })

  it('flags non-empty input that is not plain digits or exceeds INT', () => {
    expect(cashError('', 0)).toBeNull()
    expect(cashError('   ', 0)).toBeNull()
    expect(cashError('4300', 0)).toBeNull()
    expect(cashError(' ４３００ ', 0)).toBeNull()
    expect(cashError('1e2', 0)).toBe('金額只能輸入數字，不含小數點、正負號或其他符號')
    expect(cashError('-5', 0)).toBe('金額只能輸入數字，不含小數點、正負號或其他符號')
    expect(cashError('12.5', 0)).toBe('金額只能輸入數字，不含小數點、正負號或其他符號')
    expect(cashError('1000001', 0)).toBeNull()
    expect(cashError('2147483647', 0)).toBeNull()
    expect(cashError('2147483648', 0)).toBe('金額不能超過 2,147,483,647')
    expect(cashError('99999999999999999999', 0)).toBe('金額不能超過 2,147,483,647')
  })
})

describe('isLargeDifference', () => {
  it('asks again only when the difference is beyond 10,000', () => {
    expect(LARGE_DIFFERENCE_THRESHOLD).toBe(10_000)
    expect(isLargeDifference(9_999)).toBe(false)
    expect(isLargeDifference(10_000)).toBe(false)
    expect(isLargeDifference(10_001)).toBe(true)
  })

  it('treats short drawers the same as over drawers', () => {
    expect(isLargeDifference(-9_999)).toBe(false)
    expect(isLargeDifference(-10_000)).toBe(false)
    expect(isLargeDifference(-10_001)).toBe(true)
    expect(isLargeDifference(-45_000)).toBe(true)
  })

  it('does not ask for a balanced or uncounted drawer', () => {
    expect(isLargeDifference(0)).toBe(false)
    expect(isLargeDifference(null)).toBe(false)
  })
})

describe('largeDifferenceConfirmText', () => {
  it('shows system cash, counted cash and the difference with thousands separators', () => {
    const text = largeDifferenceConfirmText(5_000, 50_000)
    expect(text).toContain('系統現金：NT$ 50,000')
    expect(text).toContain('實點現金：NT$ 5,000')
    expect(text).toContain(`差額：短款 ${money(-45_000)}`)
    expect(text).toContain('是否多打或少打了位數')
  })

  it('labels an over drawer with a plus sign', () => {
    expect(largeDifferenceConfirmText(150_000, 15_000)).toContain('差額：長款 +NT$ 135,000')
  })
})

describe('confirmLargeDifference', () => {
  it('lets a small difference through without asking', () => {
    const ask = vi.fn(() => false)
    expect(confirmLargeDifference(60_000, 50_000, ask)).toBe(true)
    expect(ask).not.toHaveBeenCalled()
  })

  it('asks once with the confirm text when the difference is large', () => {
    const ask = vi.fn(() => true)
    expect(confirmLargeDifference(5_000, 50_000, ask)).toBe(true)
    expect(ask).toHaveBeenCalledExactlyOnceWith(largeDifferenceConfirmText(5_000, 50_000))
  })

  it('stops the closing when the clerk cancels', () => {
    expect(confirmLargeDifference(5_000, 50_000, () => false)).toBe(false)
  })
})
