import type { MailingInput, MailingView } from '../api/types'
import { postalCode, postalCodeOfAddress } from './taiwan'

/** 連到戶的列以戶的縣市鄉鎮查郵遞區號（戶搬家就跟著變），查不到才用名單上的；獨立列相反，名單上的最準。 */
export function zipOf(r: MailingView): string {
  const derived = postalCode(r.city, r.district)
  return (r.householdId !== null ? derived ?? r.zip : r.zip ?? derived) ?? ''
}

export function mailable(r: MailingView): boolean {
  return r.active && !r.overseas
}

/** 寄送順序：郵遞區號、地址、姓名；沒郵遞區號的排最後，方便人工補。 */
export function compareForMail(a: MailingView, b: MailingView): number {
  const za = zipOf(a)
  const zb = zipOf(b)
  if (za !== zb) {
    if (za === '') return 1
    if (zb === '') return -1
    return za.localeCompare(zb)
  }
  return (a.address ?? '').localeCompare(b.address ?? '', 'zh-Hant') || (a.name ?? '').localeCompare(b.name ?? '', 'zh-Hant')
}

export type MailingForm = { householdNumber: string; recipientName: string; zip: string; address: string; note: string; active: boolean; version: number | null }
export type MailingFilter = 'all' | 'active' | 'paused' | 'overseas' | 'standalone'

export const EMPTY_MAILING_FORM: MailingForm = { householdNumber: '', recipientName: '', zip: '', address: '', note: '', active: true, version: null }

export function toMailingInput(f: MailingForm): MailingInput {
  return {
    householdNumber: f.householdNumber.trim() === '' ? null : Number(f.householdNumber),
    recipientName: f.recipientName.trim() || null,
    zip: f.zip.trim() || null,
    address: f.address.trim() || null,
    note: f.note.trim() || null,
    active: f.active,
    version: f.version,
  }
}

export function toMailingForm(r: MailingView): MailingForm {
  return {
    householdNumber: r.householdNumber === null ? '' : String(r.householdNumber),
    recipientName: r.recipientName ?? '',
    zip: r.zip ?? '',
    address: r.householdId === null ? (r.address ?? '') : '',
    note: r.note ?? '',
    active: r.active,
    version: r.version,
  }
}

export function recipientFormState(form: MailingForm) {
  const linked = form.householdNumber.trim() !== ''
  const canSave = linked || (form.recipientName.trim() !== '' && form.address.trim() !== '')
  const autoZip = linked ? undefined : postalCodeOfAddress(form.address)
  const zipHint = linked ? '依戶地址自動查' : autoZip ? `自動 ${autoZip}` : form.address.trim() ? '地址查不到，請手動填' : ''
  return { linked, canSave, zipHint }
}

export function mailingStats(list: MailingView[]) {
  return {
    mail: list.filter(mailable).length,
    paused: list.filter((r) => !r.active).length,
    overseas: list.filter((r) => r.overseas).length,
    linked: list.filter((r) => r.householdId !== null).length,
    noZip: list.filter((r) => mailable(r) && zipOf(r) === '').length,
  }
}

export function mailingStatsText(stats: ReturnType<typeof mailingStats>): string {
  return `寄 ${stats.mail} · 暫停 ${stats.paused}${stats.overseas > 0 ? ` · 國外 ${stats.overseas}（不寄）` : ''} · 連到戶 ${stats.linked}${stats.noZip > 0 ? ` · ${stats.noZip} 筆查不到郵遞區號` : ''}`
}

export function filterMailing(list: MailingView[], query: string, filter: MailingFilter): MailingView[] {
  const kw = query.trim()
  return list.filter((r) => {
    if (filter === 'active' && !r.active) return false
    if (filter === 'paused' && r.active) return false
    if (filter === 'overseas' && !r.overseas) return false
    if (filter === 'standalone' && r.householdId !== null) return false
    if (kw === '') return true
    return [r.name, r.headName, r.recipientName, r.address, r.note, r.source, r.householdNumber === null ? '' : String(r.householdNumber)]
      .some((v) => v?.includes(kw))
  })
}

export function pageOf<T>(rows: T[], page: number, pageSize: number) {
  const pages = Math.ceil(rows.length / pageSize)
  const safePage = Math.min(page, Math.max(0, pages - 1))
  return { pages, safePage, rows: rows.slice(safePage * pageSize, (safePage + 1) * pageSize) }
}
