import { describe, expect, it } from 'vitest'
import type { LightType, MemberView } from '../api/types'
import {
  cellIds, cellKey, cellsFromRecords, markNewRecordsExisting, markRecordsExisting, nextStatus, paidPrices, toggleCell, visibleLightTypes,
  withoutMembers, type Cells,
} from './cells'

const record = (memberId: number, lightTypeId: number, unitPrice = 300) => ({ memberId, lightTypeId, unitPrice })

describe('cell keys', () => {
  it('round-trips member and light type ids', () => {
    expect(cellKey(12, 3)).toBe('12:3')
    expect(cellIds('12:3')).toEqual({ memberId: 12, lightTypeId: 3 })
  })
})

describe('nextStatus and toggleCell', () => {
  it('cycles new lamps between add and none, existing lamps between remove and existing', () => {
    expect(nextStatus('none')).toBe('add')
    expect(nextStatus('add')).toBe('none')
    expect(nextStatus('existing')).toBe('remove')
    expect(nextStatus('remove')).toBe('existing')
  })

  it('drops a cell that goes back to none and leaves the input untouched', () => {
    const start: Cells = { '1:1': 'existing' }
    const added = toggleCell(start, 2, 1)
    expect(added).toEqual({ '1:1': 'existing', '2:1': 'add' })
    expect(toggleCell(added, 2, 1)).toEqual({ '1:1': 'existing' })
    expect(toggleCell(start, 1, 1)).toEqual({ '1:1': 'remove' })
    expect(start).toEqual({ '1:1': 'existing' })
  })
})

describe('records to cells', () => {
  it('marks every record as existing', () => {
    expect(cellsFromRecords([record(1, 1), record(1, 2)])).toEqual({ '1:1': 'existing', '1:2': 'existing' })
  })

  it('overwrites pending edits when marking records existing', () => {
    expect(markRecordsExisting({ '1:1': 'remove', '2:2': 'add' }, [record(1, 1)])).toEqual({ '1:1': 'existing', '2:2': 'add' })
  })

  it('keeps pending edits and only adds records that are new', () => {
    expect(markNewRecordsExisting({ '1:1': 'remove' }, [record(1, 1), record(3, 1)])).toEqual({ '1:1': 'remove', '3:1': 'existing' })
  })

  it('removes the cells of the given members', () => {
    expect(withoutMembers({ '1:1': 'add', '10:1': 'existing', '2:5': 'remove' }, [{ id: 1 }, { id: 2 }])).toEqual({ '10:1': 'existing' })
  })

  it('maps each record to the price that was paid', () => {
    expect(paidPrices([record(1, 1, 250), record(2, 1, 0)])).toEqual(new Map([['1:1', 250], ['2:1', 0]]))
  })
})

describe('visibleLightTypes', () => {
  it('shows active types and inactive ones that still have a ticked cell', () => {
    const types = [{ id: 1, active: true }, { id: 2, active: false }, { id: 3, active: false }] as LightType[]
    const members = [{ id: 7 }] as MemberView[]
    expect(visibleLightTypes(types, members, { '7:2': 'existing', '8:3': 'add' }).map((t) => t.id)).toEqual([1, 2])
  })
})
