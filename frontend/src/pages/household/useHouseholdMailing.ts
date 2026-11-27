import { useState } from 'react'
import { mailing as mailingApi } from '../../api'
import type { HouseholdDetail, MailingView } from '../../api/types'

export type HouseholdMailing = ReturnType<typeof useHouseholdMailing>

export function useHouseholdMailing(detail: HouseholdDetail | null, onError: (message: string) => void) {
  const [row, setRow] = useState<MailingView | null>(null)
  const [busy, setBusy] = useState(false)

  async function toggle(on: boolean) {
    if (busy) return
    setBusy(true)
    onError('')
    try {
      if (row) {
        setRow(await mailingApi.setActive(row.id, on))
      } else if (on && detail) {
        setRow(await mailingApi.create({ householdNumber: detail.householdNumber }))
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : '更新帖子名單失敗')
    } finally {
      setBusy(false)
    }
  }

  return { row, setRow, busy, toggle }
}
