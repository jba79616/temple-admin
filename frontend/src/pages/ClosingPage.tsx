import { useCallback, useEffect, useState } from 'react'
import { closings as closingsApi, orders as ordersApi } from '../api'
import type { ClosingView, DaySummary, OrderView } from '../api/types'
import { closingPeriod } from '../lib/closing'
import { rocDate } from '../lib/roc'
import CloseForm from './closing/CloseForm'
import ClosingHistory from './closing/ClosingHistory'
import TodayPayments from './closing/TodayPayments'
import UnsettledOrders from './closing/UnsettledOrders'
import { useClosingAmend } from './closing/useClosingAmend'

export default function ClosingPage() {
  const [summary, setSummary] = useState<DaySummary | null>(null)
  const [history, setHistory] = useState<ClosingView[]>([])
  const [unsettled, setUnsettled] = useState<OrderView[]>([])
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [s, h, u] = await Promise.all([closingsApi.summary(), closingsApi.history(), ordersApi.unsettled()])
    setSummary(s)
    setHistory(h)
    setUnsettled(u)
  }, [])
  const amend = useClosingAmend(load, setError)

  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  async function close() {
    if (!summary || closing) return
    setClosing(true)
    setError('')
    try {
      await closingsApi.close(Number(counted), note)
      setConfirming(false)
      setCounted('')
      setNote('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '日結失敗')
    } finally {
      setClosing(false)
    }
  }

  if (!summary) return <main className="page muted">{error || '載入中…'}</main>
  const period = closingPeriod(summary)

  return (
    <main className="page page-narrow">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h1>收款與日結</h1>
        <span className="muted">今天 {rocDate(summary.date)}（入帳日）</span>
        <span className="tag" style={{ marginLeft: 'auto' }}>關帳日 {summary.closedThrough ? rocDate(summary.closedThrough) : '尚未日結過'}</span>
      </div>
      {error && <div className="banner banner-bad">{error}</div>}
      {summary.closed && <div className="banner banner-ok">{rocDate(summary.date)} 已日結。今日單據已不可作廢，之後的更正走更正單。</div>}

      <div className="split">
        <TodayPayments summary={summary} title={period.title} />
        <CloseForm summary={summary} confirmNote={period.confirmNote} counted={counted} onCounted={setCounted} note={note} onNote={setNote}
          confirming={confirming} onConfirming={setConfirming} closing={closing} onClose={close} />
      </div>

      <UnsettledOrders orders={unsettled} />
      <ClosingHistory history={history} amend={amend} />
    </main>
  )
}
