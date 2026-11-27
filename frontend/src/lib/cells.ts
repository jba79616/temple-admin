import type { LightType, MemberView, RecordView } from '../api/types'

export type CellStatus = 'none' | 'existing' | 'add' | 'remove'
export type Cells = Record<string, CellStatus>

export const cellKey = (memberId: number, lightTypeId: number) => `${memberId}:${lightTypeId}`

export function cellIds(key: string): { memberId: number; lightTypeId: number } {
  const [memberId, lightTypeId] = key.split(':').map(Number)
  return { memberId, lightTypeId }
}

export const statusOf = (cells: Cells, memberId: number, lightTypeId: number): CellStatus => cells[cellKey(memberId, lightTypeId)] ?? 'none'

export function visibleLightTypes(lightTypes: LightType[], members: MemberView[], cells: Cells): LightType[] {
  return lightTypes.filter((t) => t.active || members.some((m) => statusOf(cells, m.id, t.id) !== 'none'))
}

export function nextStatus(current: CellStatus): CellStatus {
  switch (current) {
    case 'none': return 'add'
    case 'add': return 'none'
    case 'existing': return 'remove'
    case 'remove': return 'existing'
  }
}

export function toggleCell(cells: Cells, memberId: number, lightTypeId: number): Cells {
  const key = cellKey(memberId, lightTypeId)
  const next = nextStatus(cells[key] ?? 'none')
  const copy = { ...cells }
  if (next === 'none') delete copy[key]; else copy[key] = next
  return copy
}

export function cellsFromRecords(records: RecordView[]): Cells {
  return markRecordsExisting({}, records)
}

export function markRecordsExisting(cells: Cells, records: RecordView[]): Cells {
  const next = { ...cells }
  records.forEach((r) => { next[cellKey(r.memberId, r.lightTypeId)] = 'existing' })
  return next
}

/** 已經勾選的格子保留原狀，只把新出現的紀錄補標成已安。 */
export function markNewRecordsExisting(cells: Cells, records: RecordView[]): Cells {
  const next = { ...cells }
  records.forEach((r) => { next[cellKey(r.memberId, r.lightTypeId)] ??= 'existing' })
  return next
}

export function withoutMembers(cells: Cells, members: Pick<MemberView, 'id'>[]): Cells {
  const next = { ...cells }
  Object.keys(next).filter((key) => members.some((m) => m.id === cellIds(key).memberId)).forEach((key) => delete next[key])
  return next
}

export function paidPrices(records: RecordView[]): Map<string, number> {
  return new Map(records.map((r) => [cellKey(r.memberId, r.lightTypeId), r.unitPrice]))
}
