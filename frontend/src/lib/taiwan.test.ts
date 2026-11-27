import { describe, expect, it } from 'vitest'
import { CITIES, DISTRICTS, districtsOf, postalCode, postalCodeHint, postalCodeOfAddress, splitAddress } from './taiwan'

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

  it('splits a free-text address the same way as the backend', () => {
    expect(splitAddress('台中市大里區向學路100巷7號4樓')).toEqual({ city: '臺中市', district: '大里區' })
    expect(splitAddress('412 台灣省台中縣大里市中興路二段816巷7號')).toEqual({ city: '臺中市', district: '大里區' })
    expect(splitAddress('嘉義市荖藤里忠孝路762號')).toEqual({ city: '嘉義市', district: undefined })
    expect(splitAddress('上海市復興中路1340弄1號')).toEqual({})
    expect(postalCodeOfAddress('新北市三重區重新路1號')).toBe('241')
    expect(postalCodeOfAddress('大里區中興路二段')).toBeUndefined()
  })
})

describe('city and district fields', () => {
  it('offers the districts of the chosen city only', () => {
    expect(districtsOf('臺北市')).toContain('大同區')
    expect(districtsOf(null)).toEqual([])
    expect(districtsOf('火星市')).toEqual([])
  })

  it('shows the postal code or asks to check the district name', () => {
    expect(postalCodeHint('臺北市', '大同區')).toBe('郵遞區號 103')
    expect(postalCodeHint('臺北市', '不存在區')).toBe('查無郵遞區號，請確認鄉鎮市區名稱')
    expect(postalCodeHint(null, '大同區')).toBe('查無郵遞區號，請確認鄉鎮市區名稱')
  })
})
