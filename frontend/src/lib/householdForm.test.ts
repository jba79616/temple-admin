import { describe, expect, it } from 'vitest'
import type { HouseholdDetail, MemberView } from '../api/types'
import { householdLabel, toHouseholdForm } from './householdForm'

const detail = (over: Partial<HouseholdDetail> = {}): HouseholdDetail => ({
  id: 1, householdNumber: 42, city: '臺北市', district: '大同區', address: null, phone: null, contactNote: null, notes: null,
  year: 2026, members: [], records: [], deletedMembers: [], ...over,
})

describe('household form', () => {
  it('turns missing text fields into empty inputs but keeps city and district', () => {
    expect(toHouseholdForm(detail({ district: null })))
      .toEqual({ city: '臺北市', district: null, address: '', phone: '', contactNote: '', notes: '' })
    expect(toHouseholdForm(detail({ address: '重慶北路1號', phone: '02', contactNote: 'LINE', notes: '備' })))
      .toEqual({ city: '臺北市', district: '大同區', address: '重慶北路1號', phone: '02', contactNote: 'LINE', notes: '備' })
  })

  it('labels the household by number and head name', () => {
    const members = [{ name: '王二', head: false }, { name: '王大', head: true }] as MemberView[]
    expect(householdLabel(detail({ members }))).toBe('戶 42 王大')
    expect(householdLabel(detail())).toBe('戶 42 ')
  })
})
