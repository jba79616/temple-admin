import { describe, expect, it } from 'vitest'
import type { ItemView, LightType, MemberView, PaymentView } from '../api/types'
import { money } from './roc'
import { orderContentText, overridePriceError, overrideReasonError, parseOverride, paymentsText, registrationChanges, registrationItems, withoutOverride } from './registration'

const alice = { id: 10, name: '甲' } as MemberView
const bob = { id: 11, name: '乙' } as MemberView
const guangming = { id: 1, name: '光明燈', price: 300 } as LightType
const taisui = { id: 2, name: '太歲燈', price: 500 } as LightType
const members = new Map([[10, alice], [11, bob]])
const types = new Map([[1, guangming], [2, taisui]])

describe('registrationChanges', () => {
  it('prices adds by override or type price and removes by what was paid', () => {
    const override = { price: 0, reason: '同年取消後再加回' }
    const changes = registrationChanges(
      { '10:1': 'add', '11:1': 'add', '10:2': 'remove', '11:2': 'remove', '10:9': 'add', '99:1': 'add', '12:1': 'existing' },
      { '11:1': override }, members, types, new Map([['10:2', 450]]))

    expect(changes.adds).toEqual([
      { key: '10:1', member: alice, type: guangming, price: 300, override: undefined },
      { key: '11:1', member: bob, type: guangming, price: 0, override },
    ])
    expect(changes.removes).toEqual([
      { key: '10:2', member: alice, type: taisui, price: 450 },
      { key: '11:2', member: bob, type: taisui, price: 500 },
    ])
    expect(changes).toMatchObject({ addSum: 300, removeSum: 950, due: -650 })
  })

  it('sends overrides only on overridden adds', () => {
    const changes = registrationChanges({ '10:1': 'add', '11:1': 'add', '10:2': 'remove' }, { '11:1': { price: 100, reason: '改' } },
      members, types, new Map())
    expect(registrationItems(changes)).toEqual([
      { memberId: 10, lightTypeId: 1, action: 'ADD', unitPrice: null, overrideReason: null },
      { memberId: 11, lightTypeId: 1, action: 'ADD', unitPrice: 100, overrideReason: '改' },
      { memberId: 10, lightTypeId: 2, action: 'REMOVE' },
    ])
  })
})

describe('price overrides', () => {
  it('gives up the override when the price prompt is cancelled or left blank', () => {
    expect(parseOverride('補', null)).toBeNull()
    expect(parseOverride('補', '')).toBeNull()
    expect(parseOverride('補', '   ')).toBeNull()
  })

  it('keeps an explicit 0 as a free override', () => {
    expect(parseOverride('補', '0')).toEqual({ price: 0, reason: '補' })
  })

  it('needs a reason and a whole non-negative price', () => {
    expect(parseOverride(' 補 ', '150')).toEqual({ price: 150, reason: '補' })
    expect(parseOverride('補', ' 150 ')).toEqual({ price: 150, reason: '補' })
    expect(parseOverride(null, '150')).toBeNull()
    expect(parseOverride('  ', '150')).toBeNull()
    expect(parseOverride('補', '-1')).toBeNull()
    expect(parseOverride('補', '1.5')).toBeNull()
    expect(parseOverride('補', 'abc')).toBeNull()
    expect(parseOverride('補', '1e2')).toBeNull()
    expect(parseOverride('補', '0x10')).toBeNull()
    expect(parseOverride('補', '+150')).toBeNull()
  })

  it('reads full-width digits and stops at the INT column bound', () => {
    expect(parseOverride('補', '１５０')).toEqual({ price: 150, reason: '補' })
    expect(parseOverride('補', '2147483647')).toEqual({ price: 2147483647, reason: '補' })
    expect(parseOverride('補', '2147483648')).toBeNull()
  })

  it('limits the reason to the 100 characters the column holds, after trimming', () => {
    const longest = '補'.repeat(100)
    expect(overrideReasonError(longest)).toBeNull()
    expect(overrideReasonError(` ${longest} `)).toBeNull()
    expect(overrideReasonError(`${longest}補`)).toBe('改價原因不能超過 100 字')
    expect(parseOverride(longest, '150')).toEqual({ price: 150, reason: longest })
    expect(parseOverride(`${longest}補`, '150')).toBeNull()
  })

  it('explains a malformed or out-of-range price but not a cancelled or blank one', () => {
    expect(overridePriceError(null)).toBeNull()
    expect(overridePriceError('')).toBeNull()
    expect(overridePriceError('  ')).toBeNull()
    expect(overridePriceError('１５０')).toBeNull()
    expect(overridePriceError('-1')).toBe('改後單價只能輸入數字，不含小數點、正負號或其他符號')
    expect(overridePriceError('2147483648')).toBe('改後單價不能超過 2,147,483,647')
  })

  it('removes one override and keeps the rest', () => {
    const a = { price: 1, reason: 'a' }
    expect(withoutOverride({ '1:1': a, '2:1': { price: 2, reason: 'b' } }, '2:1')).toEqual({ '1:1': a })
  })
})

describe('order texts', () => {
  it('lists the non-reversal items with removals marked', () => {
    const items = [
      { action: 'ADD', reversal: false, memberName: '甲', lightTypeName: '光明燈' },
      { action: 'REMOVE', reversal: false, memberName: '乙', lightTypeName: '太歲燈' },
      { action: 'REMOVE', reversal: true, memberName: '丙', lightTypeName: '光明燈' },
    ] as ItemView[]
    expect(orderContentText({ items })).toBe('甲 光明燈；取消 乙 太歲燈')
  })

  it('lists payments or says there are none', () => {
    const payments = [{ kind: 'CASH', amount: 300 }, { kind: 'FORFEIT', amount: -50 }] as PaymentView[]
    expect(paymentsText({ payments })).toBe(`現金 ${money(300)}、轉功德金 ${money(-50)}`)
    expect(paymentsText({ payments: [] })).toBe('無收款')
  })
})
