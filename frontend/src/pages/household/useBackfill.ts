import { useState } from 'react'
import { todayIso } from '../../lib/roc'

export type Backfill = ReturnType<typeof useBackfill>

export function useBackfill() {
  const [on, setOn] = useState(false)
  const [regDate, setRegDate] = useState(todayIso())
  const [payDate, setPayDate] = useState(todayIso())
  return {
    on, setOn, regDate, setRegDate, payDate, setPayDate,
    registeredOn: on ? regDate : null,
    receivedOn: on ? payDate : null,
  }
}
