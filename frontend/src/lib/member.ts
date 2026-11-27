import type { HouseholdDetail, HouseholdSummary, MemberInput, MemberView } from '../api/types'
import { isValidGanzhi } from './roc'

const ZODIAC: Record<string, string> = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龍', 巳: '蛇', 午: '馬', 未: '羊', 申: '猴', 酉: '雞', 戌: '狗', 亥: '豬' }

export function toMemberInput(m: MemberView): MemberInput {
  return { name: m.name, gender: m.gender, city: m.city, district: m.district, address: m.address, phone: m.phone, birthGanzhi: m.birthGanzhi,
    birthMonth: m.birthMonth, birthMonthIsLeap: m.birthMonthIsLeap, birthDay: m.birthDay, birthHourBranch: m.birthHourBranch }
}

export function isMemberDirty(form: MemberInput | null, member: MemberView | null): boolean {
  return form !== null && member !== null && JSON.stringify(form) !== JSON.stringify(toMemberInput(member))
}

export function hasInvalidGanzhi(form: MemberInput): boolean {
  return !!form.birthGanzhi && !isValidGanzhi(form.birthGanzhi)
}

export function zodiacOf(birthGanzhi: string | null | undefined): string {
  return birthGanzhi && isValidGanzhi(birthGanzhi) ? ZODIAC[birthGanzhi[1]] : '—'
}

export function birthPreview(form: MemberInput): string {
  return `${form.birthGanzhi || '吉'}年 ${form.birthMonthIsLeap ? '閏' : ''}${form.birthMonth ?? '吉'}月 ${form.birthDay ?? '吉'}日 ${form.birthHourBranch ?? '吉'}時 生`
}

export function savedMemberMessage(updated: MemberView): string {
  return `已儲存。生肖 ${updated.zodiac ?? '—'}，${updated.taisui ? `${updated.taisui}，矩陣會提示太歲燈。` : '不犯太歲。'}`
}

export function otherMembers(household: HouseholdDetail, member: MemberView): MemberView[] {
  return household.members.filter((m) => m.id !== member.id)
}

export function moveTargets(found: HouseholdSummary[], currentHouseholdId: number): HouseholdSummary[] {
  return found.filter((h) => h.id !== currentHouseholdId)
}

export function moveConfirmText(member: MemberView, target: HouseholdSummary): string {
  return `把 ${member.name} 移到戶 ${target.householdNumber} ${target.headName ?? ''}？今年已安的燈會跟著過去，歷年紀錄保留。`
}
