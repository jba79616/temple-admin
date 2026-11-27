import type { ItemInput, LightType, OrderView, Settlement } from '../api/types'
import { cellIds, type Cells } from './cells'
import { money } from './roc'

export interface CorrectionDiff {
  adds: number
  removes: number
  addSum: number
  removeSum: number
  due: number
}

export interface SettleOption {
  id: Settlement
  label: string
}

/** 取消的燈折抵當初實付的價錢；沒有紀錄時才用燈種現價。 */
export function correctionDiff(cells: Cells, typeById: Map<number, LightType>, paidPrice: Map<string, number>): CorrectionDiff {
  let addSum = 0, removeSum = 0, adds = 0, removes = 0
  Object.entries(cells).forEach(([key, st]) => {
    const type = typeById.get(cellIds(key).lightTypeId)
    if (!type) return
    if (st === 'add') { adds++; addSum += type.price }
    if (st === 'remove') { removes++; removeSum += paidPrice.get(key) ?? type.price }
  })
  return { adds, removes, addSum, removeSum, due: addSum - removeSum }
}

export function settleOptions(due: number): SettleOption[] {
  if (due > 0) {
    return [{ id: 'CASH', label: `收現 ${money(due)}（入帳今天）` }, { id: 'PENDING', label: '留待處理（先不收，單列入差額待處理）' }]
  }
  if (due < 0) {
    return [{ id: 'CASH', label: `退現 ${money(-due)}（入帳今天）` }, { id: 'FORFEIT', label: '放棄退款，差額轉功德金' }, { id: 'PENDING', label: '留待處理' }]
  }
  return [{ id: 'PENDING', label: '差額為零，無需收退款' }]
}

/** 差額正負變了以後，原本選的結清方式可能不在選項裡，改用第一個選項。 */
export function effectiveSettlement(options: SettleOption[], chosen: Settlement): Settlement {
  return options.some((o) => o.id === chosen) ? chosen : options[0].id
}

export function correctionItems(cells: Cells): ItemInput[] {
  return Object.entries(cells).flatMap(([key, st]): ItemInput[] => {
    const { memberId, lightTypeId } = cellIds(key)
    if (st === 'add') return [{ memberId, lightTypeId, action: 'ADD' }]
    if (st === 'remove') return [{ memberId, lightTypeId, action: 'REMOVE' }]
    return []
  })
}

export function dueText(due: number): string {
  if (due < 0) return `應退 ${money(-due)}`
  if (due > 0) return `應補收 ${money(due)}`
  return money(0)
}

export function orderStatusText(order: Pick<OrderView, 'status' | 'correctedByOrderIds'>): string {
  if (order.status === 'VOIDED') return '已作廢'
  if (order.correctedByOrderIds.length) return `有效，已被更正單 ${order.correctedByOrderIds.map((x) => `#${x}`).join('、')} 調整`
  return '有效'
}
