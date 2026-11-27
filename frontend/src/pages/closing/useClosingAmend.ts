import { useState } from 'react'
import { closings as closingsApi } from '../../api'
import type { ClosingView } from '../../api/types'
import { amendedCash } from '../../lib/closing'

export type ClosingAmend = ReturnType<typeof useClosingAmend>

export function useClosingAmend(onDone: () => Promise<void>, onError: (message: string) => void) {
  const [date, setDate] = useState<string | null>(null)
  const [cash, setCash] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const cashValue = amendedCash(cash)
  const canSubmit = cashValue !== null && reason.trim() !== '' && !busy

  function start(h: ClosingView) {
    setCash(String(h.countedCash))
    setReason('')
    setDate(h.closingDate)
  }

  async function submit() {
    if (!date || !canSubmit || cashValue === null) return
    setBusy(true)
    onError('')
    try {
      await closingsApi.amend(date, cashValue, reason.trim())
      setDate(null)
      await onDone()
    } catch (e) {
      onError(e instanceof Error ? e.message : '修改失敗')
    } finally {
      setBusy(false)
    }
  }

  return { date, cash, setCash, reason, setReason, busy, canSubmit, start, submit, cancel: () => setDate(null) }
}
