import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { WenshuPerson } from '../../api/types'
import { Sheet } from './WenshuPrint'

const person: WenshuPerson = {
  memberId: 1, name: '林戶長', gender: 'M', ganzhi: '壬辰', leap: false, month: 12, day: 9, hour: '子',
  cityDistrict: '臺北市大安區', address: '復興南路一段120巷3號2樓',
}
const date = { year: '丙午', month: '十', day: '十九' }

function sheetText(p: WenshuPerson) {
  return renderToStaticMarkup(<Sheet person={p} ritual={date} petition={date} />).replace(/<[^>]+>/g, '')
}

describe('Sheet', () => {
  it('prints the address after 中華民國 without the province', () => {
    const text = sheetText(person)
    expect(text).toContain('中華民國臺北市大安區復興南路一段一二〇巷三號二樓')
    expect(sheetText({ ...person, cityDistrict: '雲林縣元長鄉', address: '內寮村好收路5-6號' })).toContain('中華民國雲林縣元長鄉內寮村')
    expect(text).not.toContain('臺灣省')
  })

  it('prints the corrected fixed text', () => {
    const text = sheetText(person)
    for (const phrase of ['聖德巍峨　', '延生整斗', '植福延生', '一四天下', '延禧', '延壽', '經筵', '坎坷', '慧眼垂青恩准', '壽命延長', '北斗水神', '暨閤家人等稽首']) {
      expect(text).toContain(phrase)
    }
    expect(text).not.toMatch(/廷|峩|一泗|筳|坎柯|重青|恩準|比斗|合家/)
  })
})
