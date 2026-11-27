import { useCallback, useMemo, useState } from 'react'
import type { HouseholdDetail, LightType, RecordView } from '../../api/types'
import { cellsFromRecords, markNewRecordsExisting, paidPrices, toggleCell, visibleLightTypes, type Cells } from '../../lib/cells'
import { overridePriceError, parseOverride, registrationChanges, withoutOverride, type Overrides } from '../../lib/registration'

export function useLanternEdits(detail: HouseholdDetail | null, types: LightType[]) {
  const [cells, setCells] = useState<Cells>({})
  const [overrides, setOverrides] = useState<Overrides>({})

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types])
  const memberById = useMemo(() => new Map((detail?.members ?? []).map((m) => [m.id, m])), [detail])
  const paidPrice = useMemo(() => paidPrices(detail?.records ?? []), [detail])
  const visibleTypes = useMemo(() => visibleLightTypes(types, detail?.members ?? [], cells), [types, detail, cells])
  const changes = useMemo(() => registrationChanges(cells, overrides, memberById, typeById, paidPrice),
    [cells, overrides, memberById, typeById, paidPrice])

  const reset = useCallback((records: RecordView[]) => {
    setCells(cellsFromRecords(records))
    setOverrides({})
  }, [])

  const mergeNewRecords = useCallback((records: RecordView[]) => {
    setCells((prev) => markNewRecordsExisting(prev, records))
  }, [])

  function toggle(memberId: number, lightTypeId: number) {
    setCells((prev) => toggleCell(prev, memberId, lightTypeId))
  }

  function toggleOverride(key: string) {
    if (overrides[key]) {
      setOverrides((prev) => withoutOverride(prev, key))
      return
    }
    const reason = window.prompt('改價原因（必填）', '同年取消後再加回')
    if (!reason || !reason.trim()) return
    const price = window.prompt('改後單價', '0')
    const priceError = overridePriceError(price)
    if (priceError) {
      window.alert(priceError)
      return
    }
    const override = parseOverride(reason, price)
    if (!override) return
    setOverrides((prev) => ({ ...prev, [key]: override }))
  }

  return { cells, visibleTypes, changes, reset, mergeNewRecords, toggle, toggleOverride }
}
