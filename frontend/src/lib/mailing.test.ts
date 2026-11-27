import { describe, expect, it } from 'vitest'
import type { MailingView } from '../api/types'
import { EMPTY_MAILING_FORM, filterMailing, mailingStats, mailingStatsText, pageOf, recipientFormState, toMailingForm, toMailingInput } from './mailing'

const row = (over: Partial<MailingView> = {}): MailingView => ({
  id: 1, householdId: null, householdNumber: null, headName: null, recipientName: '王收件', name: '王收件', zip: null, city: null, district: null,
  address: '臺北市大同區重慶北路1號', active: true, overseas: false, version: 3, source: null, note: null, ...over,
})

describe('recipient form', () => {
  it('trims blanks to null and parses the household number', () => {
    expect(toMailingInput({ ...EMPTY_MAILING_FORM, householdNumber: ' ', recipientName: '  ', note: ' 備 ' }))
      .toEqual({ householdNumber: null, recipientName: null, zip: null, address: null, note: '備', active: true, version: null })
    expect(toMailingInput({ ...EMPTY_MAILING_FORM, householdNumber: '12' }).householdNumber).toBe(12)
  })

  it('drops the stored address for a linked row so the household address is used', () => {
    expect(toMailingForm(row({ householdId: 5, householdNumber: 12, address: '戶地址' })))
      .toEqual({ householdNumber: '12', recipientName: '王收件', zip: '', address: '', note: '', active: true, version: 3 })
    expect(toMailingForm(row()).address).toBe('臺北市大同區重慶北路1號')
  })

  it('needs name and address unless linked, and hints the zip lookup', () => {
    expect(recipientFormState({ ...EMPTY_MAILING_FORM, householdNumber: '12' })).toEqual({ linked: true, canSave: true, zipHint: '依戶地址自動查' })
    expect(recipientFormState({ ...EMPTY_MAILING_FORM, recipientName: '王' })).toEqual({ linked: false, canSave: false, zipHint: '' })
    expect(recipientFormState({ ...EMPTY_MAILING_FORM, recipientName: '王', address: '某處' })).toEqual({ linked: false, canSave: true, zipHint: '地址查不到，請手動填' })
    expect(recipientFormState({ ...EMPTY_MAILING_FORM, address: '臺北市大同區重慶北路1號' }).zipHint).toBe('自動 103')
  })
})

describe('mailing list', () => {
  const list = [
    row({ id: 1 }),
    row({ id: 2, active: false, name: '李暫停', recipientName: null, address: '某處' }),
    row({ id: 3, overseas: true, name: 'Overseas', address: 'Tokyo' }),
    row({ id: 4, householdId: 9, householdNumber: 77, headName: '陳戶長', name: '陳戶長', address: null, city: '臺北市', district: '大同區' }),
  ]

  it('counts mailable, paused, overseas, linked and missing zip rows', () => {
    const stats = mailingStats(list)
    expect(stats).toEqual({ mail: 2, paused: 1, overseas: 1, linked: 1, noZip: 1 })
    expect(mailingStatsText(stats)).toBe('寄 2 · 暫停 1 · 國外 1（不寄） · 連到戶 1 · 1 筆查不到郵遞區號')
    expect(mailingStatsText({ mail: 1, paused: 0, overseas: 0, linked: 0, noZip: 0 })).toBe('寄 1 · 暫停 0 · 連到戶 0')
  })

  it('filters by status and searches text fields and household number', () => {
    const ids = (q: string, f: Parameters<typeof filterMailing>[2]) => filterMailing(list, q, f).map((r) => r.id)
    expect(ids('', 'all')).toEqual([1, 2, 3, 4])
    expect(ids('', 'active')).toEqual([1, 3, 4])
    expect(ids('', 'paused')).toEqual([2])
    expect(ids('', 'overseas')).toEqual([3])
    expect(ids('', 'standalone')).toEqual([1, 2, 3])
    expect(ids(' 77 ', 'all')).toEqual([4])
    expect(ids('暫停', 'all')).toEqual([2])
    expect(ids('暫停', 'active')).toEqual([])
  })

  it('clamps the page into range', () => {
    const rows = [1, 2, 3, 4, 5]
    expect(pageOf(rows, 1, 2)).toEqual({ pages: 3, safePage: 1, rows: [3, 4] })
    expect(pageOf(rows, 9, 2)).toEqual({ pages: 3, safePage: 2, rows: [5] })
    expect(pageOf([], 3, 10)).toEqual({ pages: 0, safePage: 0, rows: [] })
  })
})
