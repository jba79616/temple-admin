import type { ItemInput, LightType, MemberView, OrderView } from '../api/types'
import { cellIds, type Cells } from './cells'
import { money } from './roc'
import { PAYMENT_KIND } from './labels'
import { parseWholeNumber, wholeNumberError } from './numbers'

export interface PriceOverride {
  price: number
  reason: string
}

export type Overrides = Record<string, PriceOverride>

export interface AddChange {
  key: string
  member: MemberView
  type: LightType
  price: number
  override?: PriceOverride
}

export interface RemoveChange {
  key: string
  member: MemberView
  type: LightType
  price: number
}

export interface RegistrationChanges {
  adds: AddChange[]
  removes: RemoveChange[]
  addSum: number
  removeSum: number
  due: number
}

/** 新增用改價或燈種現價；取消折抵當初實付的價錢。 */
export function registrationChanges(cells: Cells, overrides: Overrides, memberById: Map<number, MemberView>,
                                    typeById: Map<number, LightType>, paidPrice: Map<string, number>): RegistrationChanges {
  const adds: AddChange[] = []
  const removes: RemoveChange[] = []
  Object.entries(cells).forEach(([key, st]) => {
    const { memberId, lightTypeId } = cellIds(key)
    const member = memberById.get(memberId)
    const type = typeById.get(lightTypeId)
    if (!member || !type) return
    if (st === 'add') adds.push({ key, member, type, price: overrides[key]?.price ?? type.price, override: overrides[key] })
    if (st === 'remove') removes.push({ key, member, type, price: paidPrice.get(key) ?? type.price })
  })
  const addSum = adds.reduce((s, a) => s + a.price, 0)
  const removeSum = removes.reduce((s, r) => s + r.price, 0)
  return { adds, removes, addSum, removeSum, due: addSum - removeSum }
}

export function registrationItems(changes: Pick<RegistrationChanges, 'adds' | 'removes'>): ItemInput[] {
  return [
    ...changes.adds.map((a) => ({ memberId: a.member.id, lightTypeId: a.type.id, action: 'ADD' as const,
      unitPrice: a.override ? a.override.price : null, overrideReason: a.override ? a.override.reason : null })),
    ...changes.removes.map((r) => ({ memberId: r.member.id, lightTypeId: r.type.id, action: 'REMOVE' as const })),
  ]
}

export function withoutOverride(overrides: Overrides, key: string): Overrides {
  return Object.fromEntries(Object.entries(overrides).filter(([k]) => k !== key))
}

/** 對應 light_order_items.override_reason VARCHAR(100) 與 ItemInput 的 @Size(max = 100)。 */
export const OVERRIDE_REASON_MAX = 100

export function overrideReasonError(reason: string): string | null {
  return reason.trim().length > OVERRIDE_REASON_MAX ? `改價原因不能超過 ${OVERRIDE_REASON_MAX} 字` : null
}

export function parseOverride(reason: string | null, price: string | null): PriceOverride | null {
  if (!reason || !reason.trim() || overrideReasonError(reason)) return null
  const value = parseWholeNumber(price)
  return value === null ? null : { price: value, reason: reason.trim() }
}

/** 取消或留空表示放棄改價，不算錯。 */
export function overridePriceError(price: string | null): string | null {
  return price === null ? null : wholeNumberError(price, '改後單價')
}

export function orderContentText(order: Pick<OrderView, 'items'>): string {
  return order.items.filter((i) => !i.reversal).map((i) => `${i.action === 'REMOVE' ? '取消 ' : ''}${i.memberName} ${i.lightTypeName}`).join('；')
}

export function paymentsText(order: Pick<OrderView, 'payments'>): string {
  return order.payments.map((p) => `${PAYMENT_KIND[p.kind]} ${money(p.amount)}`).join('、') || '無收款'
}
