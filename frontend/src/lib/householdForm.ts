import type { HouseholdDetail, HouseholdInput, MemberInput } from '../api/types'

export const NEW_HOUSEHOLD_FORM: HouseholdInput = { city: '新北市', district: null, address: '', phone: '', contactNote: '', notes: '' }
export const NEW_HEAD: MemberInput = { name: '', gender: 'M', birthMonthIsLeap: false }

export function toHouseholdForm(d: HouseholdDetail): HouseholdInput {
  return { city: d.city, district: d.district, address: d.address ?? '', phone: d.phone ?? '', contactNote: d.contactNote ?? '', notes: d.notes ?? '' }
}

export function householdLabel(d: HouseholdDetail): string {
  return `戶 ${d.householdNumber} ${d.members.find((m) => m.head)?.name ?? ''}`
}
