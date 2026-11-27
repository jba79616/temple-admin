import type { LightType } from '../api/types'
import { amountError, parseAmount, parseWholeNumber, wholeNumberError } from './numbers'

export type LightTypeInput = Omit<LightType, 'id'>
export type LightTypeForm = Omit<LightTypeInput, 'price' | 'sortOrder'> & { price: string; sortOrder: string }

export const EMPTY_LIGHT_TYPE_FORM: LightTypeForm = {
  category: 'GENERAL', name: '', shortName: '', price: '300', taisui: false, sortOrder: '0', active: true, legacyCode: null,
}

export function toLightTypeForm(t: LightType): LightTypeForm {
  return { category: t.category, name: t.name, shortName: t.shortName, price: String(t.price), taisui: t.taisui,
    sortOrder: String(t.sortOrder), active: t.active, legacyCode: t.legacyCode }
}

function requiredError(input: string, label: string, check: (input: string, label: string) => string | null): string | null {
  return input.trim() === '' ? `${label}必填` : check(input, label)
}

export function lightTypeFormErrors(f: LightTypeForm): { price: string | null; sortOrder: string | null } {
  return { price: requiredError(f.price, '價格', amountError), sortOrder: requiredError(f.sortOrder, '排序', wholeNumberError) }
}

export function toLightTypeInput(f: LightTypeForm): LightTypeInput | null {
  const price = parseAmount(f.price)
  const sortOrder = parseWholeNumber(f.sortOrder)
  if (price === null || sortOrder === null || !f.name.trim() || !f.shortName.trim()) return null
  return { ...f, price, sortOrder }
}
