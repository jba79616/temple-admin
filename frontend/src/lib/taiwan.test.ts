import { describe, expect, it } from 'vitest'
import { CITIES, DISTRICTS, postalCode } from './taiwan'

describe('taiwan districts', () => {
  it('covers all 22 cities and 368 townships', () => {
    expect(CITIES).toHaveLength(22)
    expect(Object.values(DISTRICTS).flat()).toHaveLength(368)
    expect(DISTRICTS['新北市']).toContain('三重區')
  })

  it('looks up the 3-digit postal code by city and district', () => {
    expect(postalCode('新北市', '三重區')).toBe('241')
    expect(postalCode('臺北市', '中正區')).toBe('100')
    expect(postalCode('基隆市', '中正區')).toBe('202')
    expect(postalCode('新竹市', '香山區')).toBe('300')
  })

  it('accepts 台 for 臺 and returns undefined when unknown', () => {
    expect(postalCode('台北市', '大安區')).toBe('106')
    expect(postalCode('雲林縣', '台西鄉')).toBe('636')
    expect(postalCode('新北市', '三重')).toBeUndefined()
    expect(postalCode(null, '三重區')).toBeUndefined()
    expect(postalCode('新北市', null)).toBeUndefined()
  })
})
