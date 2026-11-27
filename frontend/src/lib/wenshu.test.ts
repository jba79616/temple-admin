import { describe, expect, it } from 'vitest'
import { believerOf, birthTextOf, chineseNumber, lunarDateOf, lunarDayText, lunarMonthText, verticalAddress } from './wenshu'

describe('chinese numerals', () => {
  it('writes numbers up to ninety-nine', () => {
    expect([1, 9, 10, 11, 20, 21, 30, 99].map(chineseNumber)).toEqual(['一', '九', '十', '十一', '二十', '二十一', '三十', '九十九'])
  })

  it('writes lunar months and days the way the shrine does', () => {
    expect(lunarMonthText(1)).toBe('正')
    expect(lunarMonthText(12)).toBe('十二')
    expect(lunarMonthText(6, true)).toBe('閏六')
    expect([1, 9, 10, 11, 19, 20, 21, 29, 30].map(lunarDayText)).toEqual(['初一', '初九', '初十', '十一', '十九', '二十', '廿一', '廿九', '三十'])
  })
})

describe('birthTextOf', () => {
  it('turns stored birth fields into printed text with the zodiac', () => {
    expect(birthTextOf({ ganzhi: '壬辰', leap: false, month: 12, day: 9, hour: '子' }))
      .toEqual({ year: '壬辰', month: '十二', day: '初九', hour: '子', zodiac: '龍' })
  })

  it('prints 吉 for unknown parts and leaves the zodiac blank without a year', () => {
    expect(birthTextOf({ ganzhi: null, leap: true, month: 4, day: null, hour: null }))
      .toEqual({ year: '吉', month: '閏四', day: '吉', hour: '吉', zodiac: '' })
  })

  it('leaves the zodiac blank when the stored ganzhi is not a real stem-branch pair', () => {
    expect(birthTextOf({ ganzhi: '甲丑', leap: false, month: 1, day: 1, hour: null }).zodiac).toBe('')
  })
})

describe('verticalAddress', () => {
  it('spells digits one by one and reads a hyphen between numbers as 之', () => {
    expect(verticalAddress('內寮村好收路5-6號')).toBe('內寮村好收路五之六號')
    expect(verticalAddress('重新路一段120巷３號2樓')).toBe('重新路一段一二〇巷三號二樓')
    expect(verticalAddress('A-1')).toBe('A-一')
  })
})

describe('believerOf', () => {
  it('keeps only the title matching the gender, or both when unknown', () => {
    expect(believerOf('M')).toBe('信士')
    expect(believerOf('F')).toBe('信女')
    expect(believerOf(null)).toBe('信士信女')
  })
})

describe('lunarDateOf', () => {
  it('converts to the lunar date in Taipei time', () => {
    expect(lunarDateOf(new Date('2012-01-02T12:00:00+08:00'))).toEqual({ year: '辛卯', month: '十二', day: '初九' })
    expect(lunarDateOf(new Date('2026-11-26T16:30:00Z'))).toEqual({ year: '丙午', month: '十', day: '十九' })
  })

  it('marks leap months', () => {
    expect(lunarDateOf(new Date('2025-08-01T12:00:00+08:00'))).toEqual({ year: '乙巳', month: '閏六', day: '初八' })
  })
})
