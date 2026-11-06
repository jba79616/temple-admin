import { describe, expect, it } from 'vitest'
import { GANZHI_LIST, ganzhiOfYear, isValidGanzhi, money, rocDate, rocYear } from './roc'

describe('roc helpers', () => {
  it('converts years and dates to 民國', () => {
    expect(rocYear(2027)).toBe(116)
    expect(rocDate('2027-01-15')).toBe('116/01/15')
    expect(rocDate('2027-01-15T10:42:00+08:00')).toBe('116/01/15')
    expect(rocDate(null)).toBe('')
  })

  it('computes ganzhi of a year and validates the sixty cycle', () => {
    expect(ganzhiOfYear(2027)).toBe('丁未')
    expect(ganzhiOfYear(1984)).toBe('甲子')
    expect(GANZHI_LIST).toHaveLength(60)
    expect(isValidGanzhi('甲戌')).toBe(true)
    expect(isValidGanzhi('甲丑')).toBe(false)
  })

  it('formats money with sign', () => {
    expect(money(1400)).toBe('NT$ 1,400')
    expect(money(-300)).toBe('−NT$ 300')
  })
})
