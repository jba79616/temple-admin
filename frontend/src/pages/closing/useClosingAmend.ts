import { useState } from 'react'
import { closings as closingsApi } from '../../api'
import type { ClosingView } from '../../api/types'
import { cashError, parseCash } from '../../lib/closing'

export type ClosingAmend = ReturnType<typeof useClosingAmend>

export function useClosingAmend(onDone: () => Promise<void>, onError: (message: string) => void) {
  const [date, setDate] = useState<string | null>(null)
  const [cash, setCash] = useState('')
  const [systemCash, setSystemCash] = useState(0)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const cashValue = parseCash(cash)
  const error = cashError(cash, systemCash)
  const canSubmit = cashValue !== null && error === null && reason.trim() !== '' && !busy

  function start(h: ClosingView) {
    setCash(String(h.countedCash))
    setSystemCash(h.systemCash)
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

  return { date, cash, setCash, cashError: error, reason, setReason, busy, canSubmit, start, submit, cancel: () => setDate(null) }
}
