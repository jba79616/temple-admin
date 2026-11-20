import type { MailingView } from '../api/types'
import { postalCode } from './taiwan'

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
