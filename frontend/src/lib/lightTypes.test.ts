import { describe, expect, it } from 'vitest'
import type { LightType } from '../api/types'
import { EMPTY_LIGHT_TYPE_FORM, lightTypeFormErrors, toLightTypeForm, toLightTypeInput } from './lightTypes'

const form = { ...EMPTY_LIGHT_TYPE_FORM, name: '光明燈', shortName: '光明' }

describe('light type form', () => {
  it('round-trips a light type through the text form', () => {
    const type: LightType = { id: 1, category: 'GENERAL', name: '光明燈', shortName: '光明', price: 300, taisui: false, sortOrder: 2, active: true, legacyCode: 'gm' }
    const { id: _id, ...input } = type
    expect(toLightTypeInput(toLightTypeForm(type))).toEqual(input)
  })

  it('accepts full-width digits for price and sort order', () => {
    expect(toLightTypeInput({ ...form, price: '５００', sortOrder: '１２' })).toMatchObject({ price: 500, sortOrder: 12 })
    expect(lightTypeFormErrors({ ...form, price: '５００', sortOrder: '１２' })).toEqual({ price: null, sortOrder: null })
  })

  it.each(['', '-1', '+1', '1.5', '1e3', '0x10', '2147483648'])('rejects %j as price or sort order', (input) => {
    expect(toLightTypeInput({ ...form, price: input })).toBeNull()
    expect(toLightTypeInput({ ...form, sortOrder: input })).toBeNull()
  })

  it('explains each invalid number', () => {
    expect(lightTypeFormErrors({ ...form, price: ' ', sortOrder: '-1' }))
      .toEqual({ price: '價格必填', sortOrder: '排序只能輸入數字，不含小數點、正負號或其他符號' })
    expect(lightTypeFormErrors({ ...form, price: '2147483648', sortOrder: '2147483647' }))
      .toEqual({ price: '價格不能超過 2,147,483,647', sortOrder: null })
  })

  it('still needs a name and short name', () => {
    expect(toLightTypeInput({ ...form, name: ' ' })).toBeNull()
    expect(toLightTypeInput({ ...form, shortName: '' })).toBeNull()
  })
})
