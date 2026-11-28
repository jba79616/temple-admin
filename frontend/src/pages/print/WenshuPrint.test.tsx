import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { WenshuPerson } from '../../api/types'
import { Sheet } from './WenshuPrint'

const person: WenshuPerson = {
  memberId: 1, householdNumber: 3, name: '林戶長', gender: 'M', ganzhi: '壬辰', leap: false, month: 12, day: 9, hour: '子',
  cityDistrict: '臺北市大安區', address: '復興南路一段120巷3號2樓',
}
const temple = { name: '無極聖殿', address: '雲林縣元長鄉內寮村好收路5-6號' }
const date = { year: '丙午', month: '十', day: '十九' }

function sheetText(p: WenshuPerson, t = temple) {
  return renderToStaticMarkup(<Sheet person={p} temple={t} ritual={date} petition={date} />).replace(/<[^>]+>/g, '')
}

describe('Sheet', () => {
  it('prints the address after 中華民國 without the province', () => {
    const text = sheetText(person)
    expect(text).toContain('中華民國臺北市大安區復興南路一段一二〇巷三號二樓')
    expect(sheetText({ ...person, cityDistrict: '雲林縣元長鄉', address: '內寮村好收路5-6號' })).toContain('中華民國雲林縣元長鄉內寮村')
    expect(text).not.toContain('臺灣省')
  })

  it('signs with the configured temple name and its address in Chinese numerals', () => {
    expect(sheetText(person, { name: '順天宮', address: '臺南市中西區民族路2段12-3號' })).toContain('順天宮　臺南市中西區民族路二段一二之三號全體主任委員敬上')
  })

  it('leaves the signature blank when the temple settings are empty', () => {
    const text = sheetText(person, { name: '', address: '' })
    expect(text).toMatch(/稽首頓首叩全體主任委員敬上$/)
    expect(sheetText(person, { name: '順天宮', address: '' })).toMatch(/稽首頓首叩順天宮全體主任委員敬上$/)
  })

  it('prints the corrected fixed text', () => {
    const text = sheetText(person)
    for (const phrase of ['聖德巍峨　', '延生整斗', '神功叵測', '植福延生', '一四天下', '延禧', '延壽', '經筵', '凶曜強侵', '坎坷', '慧眼垂青恩准', '壽命延長', '地官赦罪、水官解厄、南斗', '北斗水神', '暨閤家人等稽首']) {
      expect(text).toContain(phrase)
    }
    expect(text).not.toMatch(/廷|峩|巨測|一泗|筳|恐曜|坎柯|重青|恩準|水官　|比斗|合家/)
  })

  it('shrinks a long 天運 part so it ends before the fixed 年', () => {
    const markup = renderToStaticMarkup(<Sheet person={person} temple={temple} ritual={date} petition={{ ...date, year: '中華民國一百一十五' }} />)
    const pt = Number(markup.match(/font-size:([\d.]+)pt[^>]*>中華民國一百一十五</)?.[1])
    expect(pt * 9).toBeLessThanOrEqual(3.5 * 13)
    expect(markup).toMatch(/font-size:15pt[^>]*>十</)
  })
})
