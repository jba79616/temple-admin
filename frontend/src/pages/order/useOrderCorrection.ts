import { useMemo, useState } from 'react'
import { households, lightTypes as lightTypesApi } from '../../api'
import type { HouseholdDetail, HouseholdSummary, LightType, OrderView, Settlement } from '../../api/types'
import { cellsFromRecords, markRecordsExisting, paidPrices, toggleCell, visibleLightTypes, withoutMembers, type Cells } from '../../lib/cells'
import { correctionDiff, correctionItems, effectiveSettlement, settleOptions } from '../../lib/correction'

export type OrderCorrection = ReturnType<typeof useOrderCorrection>

export function useOrderCorrection(order: OrderView | null) {
  const [correcting, setCorrecting] = useState(false)
  const [detail, setDetail] = useState<HouseholdDetail | null>(null)
  const [types, setTypes] = useState<LightType[]>([])
  const [cells, setCells] = useState<Cells>({})
  const [settlement, setSettlement] = useState<Settlement>('CASH')
  const [reason, setReason] = useState('')
  const [extra, setExtra] = useState<HouseholdDetail[]>([])
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<HouseholdSummary[]>([])

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types])
  const allHouseholds = useMemo(() => (detail ? [detail, ...extra] : extra), [detail, extra])
  const paidPrice = useMemo(() => paidPrices(allHouseholds.flatMap((h) => h.records)), [allHouseholds])
  const visibleTypes = useMemo(() => visibleLightTypes(types, allHouseholds.flatMap((h) => h.members), cells), [types, allHouseholds, cells])
  const diff = useMemo(() => correctionDiff(cells, typeById, paidPrice), [cells, typeById, paidPrice])
  const options = settleOptions(diff.due)
  const chosenSettlement = effectiveSettlement(options, settlement)
  const touched = diff.adds + diff.removes > 0 || reason.trim() !== ''

  async function open() {
    if (!order) return
    const [d, t] = await Promise.all([households.get(order.householdId, order.year), lightTypesApi.list(true)])
    setDetail(d)
    setTypes(t)
    setCells(cellsFromRecords(d.records))
    setExtra([])
    setHits([])
    setQuery('')
    setReason('')
    setSettlement('CASH')
    setCorrecting(true)
  }

  function cancel() {
    if (touched && !window.confirm('放棄這張更正單的修改？')) return
    setCorrecting(false)
  }

  function toggle(memberId: number, lightTypeId: number) {
    setCells((prev) => toggleCell(prev, memberId, lightTypeId))
  }

  async function searchHouseholds() {
    if (!order || !query.trim()) return
    const found = await households.search(query.trim())
    setHits(found.filter((h) => h.id !== order.householdId && !extra.some((x) => x.id === h.id)))
  }

  async function addHousehold(id: number) {
    if (!order) return
    const d = await households.get(id, order.year)
    setExtra((prev) => [...prev, d])
    setCells((prev) => markRecordsExisting(prev, d.records))
    setHits([])
    setQuery('')
  }

  function removeHousehold(h: HouseholdDetail) {
    setExtra((prev) => prev.filter((x) => x.id !== h.id))
    setCells((prev) => withoutMembers(prev, h.members))
  }

  function request() {
    return { reason: reason.trim(), settlement: chosenSettlement, items: correctionItems(cells) }
  }

  return {
    correcting, setCorrecting, detail, extra, cells, visibleTypes, diff, options, chosenSettlement, setSettlement,
    reason, setReason, query, setQuery, hits, touched,
    open, cancel, toggle, searchHouseholds, addHousehold, removeHousehold, request,
  }
}
