import { describe, expect, it } from 'vitest'
import type { LightType } from '../api/types'
import { money } from './roc'
import { correctionDiff, correctionItems, dueText, effectiveSettlement, orderStatusText, settleOptions } from './correction'

const types = new Map([[1, { id: 1, price: 300 } as LightType], [2, { id: 2, price: 500 } as LightType]])

describe('correctionDiff', () => {
  it('charges current price for adds and refunds what was paid for removes', () => {
    const paid = new Map([['10:2', 450]])
    expect(correctionDiff({ '10:1': 'add', '11:1': 'add', '10:2': 'remove', '12:1': 'existing' }, types, paid))
      .toEqual({ adds: 2, removes: 1, addSum: 600, removeSum: 450, due: 150 })
  })

  it('falls back to the type price when nothing was paid and ignores unknown types', () => {
    expect(correctionDiff({ '10:2': 'remove', '10:9': 'add' }, types, new Map()))
      .toEqual({ adds: 0, removes: 1, addSum: 0, removeSum: 500, due: -500 })
  })
})

describe('settleOptions', () => {
  it('offers cash or pending when the devotee owes money', () => {
    expect(settleOptions(300)).toEqual([
      { id: 'CASH', label: `收現 ${money(300)}（入帳今天）` },
      { id: 'PENDING', label: '留待處理（先不收，單列入差額待處理）' },
    ])
  })

  it('offers refund, forfeit or pending when the temple owes money', () => {
    expect(settleOptions(-200).map((o) => o.id)).toEqual(['CASH', 'FORFEIT', 'PENDING'])
    expect(settleOptions(-200)[0].label).toBe(`退現 ${money(200)}（入帳今天）`)
  })

  it('only offers pending when nothing is owed', () => {
    expect(settleOptions(0)).toEqual([{ id: 'PENDING', label: '差額為零，無需收退款' }])
  })

  it('keeps the chosen settlement only while it is still an option', () => {
    expect(effectiveSettlement(settleOptions(-1), 'FORFEIT')).toBe('FORFEIT')
    expect(effectiveSettlement(settleOptions(1), 'FORFEIT')).toBe('CASH')
    expect(effectiveSettlement(settleOptions(0), 'CASH')).toBe('PENDING')
  })
})

describe('correctionItems', () => {
  it('sends only added and removed cells', () => {
    expect(correctionItems({ '10:1': 'add', '11:2': 'remove', '12:1': 'existing' })).toEqual([
      { memberId: 10, lightTypeId: 1, action: 'ADD' },
      { memberId: 11, lightTypeId: 2, action: 'REMOVE' },
    ])
  })
})

describe('texts', () => {
  it('describes the due amount from the temple side', () => {
    expect(dueText(-300)).toBe(`應退 ${money(300)}`)
    expect(dueText(300)).toBe(`應補收 ${money(300)}`)
    expect(dueText(0)).toBe(money(0))
  })

  it('describes order status including later corrections', () => {
    expect(orderStatusText({ status: 'VOIDED', correctedByOrderIds: [3] })).toBe('已作廢')
    expect(orderStatusText({ status: 'ACTIVE', correctedByOrderIds: [3, 5] })).toBe('有效，已被更正單 #3、#5 調整')
    expect(orderStatusText({ status: 'ACTIVE', correctedByOrderIds: [] })).toBe('有效')
  })
})
