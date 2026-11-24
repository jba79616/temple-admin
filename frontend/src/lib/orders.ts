import type { OrderView } from '../api/types'

/** 匯入單是舊系統的年度，卡早就印過，不給印。 */
export function hasCardsToPrint(order: Pick<OrderView, 'kind' | 'status' | 'items'>): boolean {
  return order.kind !== 'IMPORT' && order.status === 'ACTIVE' && order.items.some((i) => i.action === 'ADD' && !i.reversal)
}

export function orderCardsPath(orderId: number): string {
  return `/print/cards?orderId=${orderId}`
}
