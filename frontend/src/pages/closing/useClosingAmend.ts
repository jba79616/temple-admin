import { useRef, useState } from 'react'
import { closings as closingsApi } from '../../api'
import type { ClosingView } from '../../api/types'
import { cashError, confirmLargeDifference, parseCash } from '../../lib/closing'

export type ClosingAmend = ReturnType<typeof useClosingAmend>

export interface AmendChange {
  date: string
  countedCash: number
  systemCash: number
  reason: string
}

type AmendRequest = (date: string, countedCash: number, reason: string) => Promise<unknown>

export async function amendIfConfirmed(change: AmendChange, ask: (message: string) => boolean, amend: AmendRequest): Promise<boolean> {
  if (!confirmLargeDifference(change.countedCash, change.systemCash, ask)) return false
  await amend(change.date, change.countedCash, change.reason)
  return true
}

export function useClosingAmend(onDone: () => Promise<void>, onError: (message: string) => void) {
  const [date, setDate] = useState<string | null>(null)
  const [cash, setCash] = useState('')
  const [systemCash, setSystemCash] = useState(0)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const cashInput = useRef<HTMLInputElement>(null)

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
    try {
      const change = { date, countedCash: cashValue, systemCash, reason: reason.trim() }
      const amended = await amendIfConfirmed(change, (message) => window.confirm(message), (...args) => {
        onError('')
        return closingsApi.amend(...args)
      })
      if (!amended) {
        cashInput.current?.focus()
        return
      }
      setDate(null)
      await onDone()
    } catch (e) {
      onError(e instanceof Error ? e.message : '修改失敗')
    } finally {
      setBusy(false)
    }
  }

  return { date, cash, setCash, cashInput, cashError: error, reason, setReason, busy, canSubmit, start, submit, cancel: () => setDate(null) }
}
