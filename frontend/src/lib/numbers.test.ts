import { describe, expect, it } from 'vitest'
import { MAX_AMOUNT, MAX_INT, amountError, parseAmount, parseWholeNumber, toHalfWidthDigits, wholeNumberError } from './numbers'

describe('toHalfWidthDigits', () => {
  it('converts full-width digits and leaves everything else alone', () => {
    expect(toHalfWidthDigits('０１２３４５６７８９')).toBe('0123456789')
    expect(toHalfWidthDigits('１２.0 號')).toBe('12.0 號')
  })
})

describe('parseWholeNumber', () => {
  it('accepts plain digits, full-width digits and surrounding spaces', () => {
    expect(parseWholeNumber('4300')).toBe(4300)
    expect(parseWholeNumber('0')).toBe(0)
    expect(parseWholeNumber('007')).toBe(7)
    expect(parseWholeNumber(' 4300 ')).toBe(4300)
    expect(parseWholeNumber('４３００')).toBe(4300)
    expect(parseWholeNumber('４3０0')).toBe(4300)
    expect(parseWholeNumber('　１２　')).toBe(12)
  })

  it.each([null, undefined, '', '  ', '-1', '+5', '－5', '＋5', '12.5', '12.0', '1e2', '0x10', '0b11', 'abc', '1 000', '1,000', 'Infinity', '٣'])(
    'rejects %j', (input) => {
      expect(parseWholeNumber(input)).toBeNull()
    })

  it('stops at the INT upper bound of the database columns', () => {
    expect(parseWholeNumber('2147483647')).toBe(MAX_INT)
    expect(parseWholeNumber('2147483648')).toBeNull()
    expect(parseWholeNumber('99999999999999999999999')).toBeNull()
    expect(parseWholeNumber('101', 100)).toBeNull()
    expect(parseWholeNumber('100', 100)).toBe(100)
  })
})

describe('wholeNumberError', () => {
  it('leaves blank and valid input to the caller', () => {
    expect(wholeNumberError('', '金額')).toBeNull()
    expect(wholeNumberError('   ', '金額')).toBeNull()
    expect(wholeNumberError('4300', '金額')).toBeNull()
    expect(wholeNumberError('４３００', '金額')).toBeNull()
    expect(wholeNumberError('2147483647', '金額')).toBeNull()
  })

  it('explains malformed and out-of-range input', () => {
    expect(wholeNumberError('-5', '金額')).toBe('金額只能輸入數字，不含小數點、正負號或其他符號')
    expect(wholeNumberError('12.5', '價格')).toBe('價格只能輸入數字，不含小數點、正負號或其他符號')
    expect(wholeNumberError('2147483648', '金額')).toBe('金額不能超過 2,147,483,647')
  })
})

describe('parseAmount', () => {
  it('stops at the business limit of a single amount', () => {
    expect(MAX_AMOUNT).toBe(1_000_000)
    expect(parseAmount('1000000')).toBe(MAX_AMOUNT)
    expect(parseAmount('１００００００')).toBe(MAX_AMOUNT)
    expect(parseAmount('1000001')).toBeNull()
    expect(parseAmount('2147483648')).toBeNull()
    expect(parseAmount('-1')).toBeNull()
    expect(parseAmount(null)).toBeNull()
  })
})

describe('amountError', () => {
  it('leaves blank and in-range input to the caller', () => {
    expect(amountError('', '金額')).toBeNull()
    expect(amountError('0', '金額')).toBeNull()
    expect(amountError(' 1000000 ', '金額')).toBeNull()
  })

  it('names the field for malformed input and states the limit for oversized input', () => {
    expect(amountError('-1', '單價')).toBe('單價只能輸入數字，不含小數點、正負號或其他符號')
    expect(amountError('1000001', '單價')).toBe('金額不能超過 1,000,000')
    expect(amountError('99999999999999999999999', '價格')).toBe('金額不能超過 1,000,000')
  })
})
