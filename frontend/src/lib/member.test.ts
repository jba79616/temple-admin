import { describe, expect, it } from 'vitest'
import type { HouseholdDetail, HouseholdSummary, MemberView } from '../api/types'
import { birthPreview, hasInvalidGanzhi, isMemberDirty, moveConfirmText, moveTargets, otherMembers, savedMemberMessage, toMemberInput, withBirthMonth, zodiacOf } from './member'

const member = (over: Partial<MemberView> = {}): MemberView => ({
  id: 1, householdId: 10, name: '王小明', gender: 'M', head: false, sortOrder: 1, city: null, district: null, address: null, phone: null,
  birthGanzhi: null, birthBranch: null, birthMonth: null, birthMonthIsLeap: false, birthDay: null, birthHourBranch: null,
  zodiac: null, taisui: null, birthText: '', deleted: false, ...over,
})

const summary = (id: number, headName: string | null = '戶長'): HouseholdSummary =>
  ({ id, householdNumber: 100 + id, headName, cityDistrict: '', memberCount: 1, lanternCount: 0, phone: null })

describe('member form', () => {
  it('copies only editable fields into the form', () => {
    const input = toMemberInput(member({ birthGanzhi: '甲子', birthMonth: 3, birthMonthIsLeap: true, birthDay: 5, birthHourBranch: '午', zodiac: '鼠' }))
    expect(input).toEqual({ name: '王小明', gender: 'M', city: null, district: null, address: null, phone: null, birthGanzhi: '甲子',
      birthMonth: 3, birthMonthIsLeap: true, birthDay: 5, birthHourBranch: '午' })
  })

  it('is dirty only when a field differs from the saved member', () => {
    const m = member()
    expect(isMemberDirty(null, m)).toBe(false)
    expect(isMemberDirty(toMemberInput(m), null)).toBe(false)
    expect(isMemberDirty(toMemberInput(m), m)).toBe(false)
    expect(isMemberDirty({ ...toMemberInput(m), name: '王大明' }, m)).toBe(true)
  })

  it('flags a non-empty ganzhi that is not one of the sixty', () => {
    expect(hasInvalidGanzhi({ name: 'a', birthGanzhi: null })).toBe(false)
    expect(hasInvalidGanzhi({ name: 'a', birthGanzhi: '' })).toBe(false)
    expect(hasInvalidGanzhi({ name: 'a', birthGanzhi: '甲子' })).toBe(false)
    expect(hasInvalidGanzhi({ name: 'a', birthGanzhi: '甲丑' })).toBe(true)
  })
})

describe('birth month field', () => {
  it('keeps the leap flag while a month is set and clears it with the month', () => {
    expect(withBirthMonth({ name: 'a', birthMonth: 3, birthMonthIsLeap: true }, '4')).toEqual({ name: 'a', birthMonth: 4, birthMonthIsLeap: true })
    expect(withBirthMonth({ name: 'a', birthMonth: 3, birthMonthIsLeap: true }, '')).toEqual({ name: 'a', birthMonth: null, birthMonthIsLeap: false })
  })
})

describe('member check panel', () => {
  it('derives the zodiac from a valid ganzhi branch', () => {
    expect(zodiacOf('甲子')).toBe('鼠')
    expect(zodiacOf('癸亥')).toBe('豬')
    expect(zodiacOf('甲丑')).toBe('—')
    expect(zodiacOf('')).toBe('—')
    expect(zodiacOf(null)).toBe('—')
  })

  it('prints blank birth fields as 吉', () => {
    expect(birthPreview({ name: 'a' })).toBe('吉年 吉月 吉日 吉時 生')
    expect(birthPreview({ name: 'a', birthGanzhi: '甲子', birthMonth: 2, birthMonthIsLeap: true, birthDay: 9, birthHourBranch: '子' }))
      .toBe('甲子年 閏2月 9日 子時 生')
  })

  it('mentions taisui only when the saved member clashes', () => {
    expect(savedMemberMessage(member({ zodiac: '鼠', taisui: '正沖' }))).toBe('已儲存。生肖 鼠，正沖，矩陣會提示太歲燈。')
    expect(savedMemberMessage(member())).toBe('已儲存。生肖 —，不犯太歲。')
  })
})

describe('member delete and move', () => {
  it('lists the other members of the household', () => {
    const me = member({ id: 1 })
    const household = { members: [me, member({ id: 2, name: '王二' })] } as HouseholdDetail
    expect(otherMembers(household, me).map((m) => m.id)).toEqual([2])
  })

  it('drops the current household from move targets', () => {
    expect(moveTargets([summary(10), summary(11)], 10).map((h) => h.id)).toEqual([11])
  })

  it('confirms the move with the target household', () => {
    expect(moveConfirmText(member(), summary(11, null))).toBe('把 王小明 移到戶 111 ？今年已安的燈會跟著過去，歷年紀錄保留。')
  })
})
