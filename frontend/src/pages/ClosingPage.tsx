import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { closings as closingsApi, orders as ordersApi } from '../api'
import type { ClosingView, DaySummary, OrderView } from '../api/types'
import { money, rocDate, rocDateTime } from '../lib/roc'

export default function ClosingPage() {
  const [summary, setSummary] = useState<DaySummary | null>(null)
  const [history, setHistory] = useState<ClosingView[]>([])
  const [unsettled, setUnsettled] = useState<OrderView[]>([])
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [s, h, u] = await Promise.all([closingsApi.summary(), closingsApi.history(), ordersApi.unsettled()])
    setSummary(s)
    setHistory(h)
    setUnsettled(u)
  }, [])

  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  async function close() {
    if (!summary) return
    setError('')
    try {
      await closingsApi.close(Number(counted), note)
      setConfirming(false)
      setCounted('')
      setNote('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '日結失敗')
    }
  }

  if (!summary) return <main className="page muted">{error || '載入中…'}</main>
  const countedNum = counted === '' ? null : Number(counted)
  const diff = countedNum === null ? null : countedNum - summary.systemCash

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
        <section className="card main" style={{ overflow: 'hidden' }}>
          <div className="card-title">今日收款（入帳日 {rocDate(summary.date)}）</div>
          <div className="scroll-x">
            <table className="table" style={{ minWidth: 640 }}>
              <thead><tr><th>時間</th><th>戶</th><th>單號</th><th>種類</th><th className="right">金額</th><th>收款人 / 備註</th></tr></thead>
              <tbody>
                {summary.payments.map((p) => (
                  <tr key={p.id} style={{ color: p.kind !== 'CASH' ? 'var(--muted)' : p.amount < 0 ? 'var(--danger-text)' : undefined }}>
                    <td>{rocDateTime(p.createdAt).slice(-5)}</td><td>{p.householdNumber} {p.headName ?? ''}</td>
                    <td><Link to={`/orders/${p.orderId}`}>#{p.orderId}</Link></td><td><span className="tag">{p.kind}</span></td>
                    <td className="num right" style={{ fontWeight: 500 }}>{p.amount > 0 ? '+' : ''}{p.amount.toLocaleString()}</td>
                    <td className="small muted">{p.receivedBy} {p.note}</td>
                  </tr>
                ))}
                {summary.payments.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>今天還沒有收款</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="line line-total" style={{ padding: '12px 16px', fontSize: 17 }}><span>系統合計（只算 CASH）</span><span>{money(summary.systemCash)}</span></div>
          <div className="small muted" style={{ padding: '0 16px 12px' }}>FORFEIT 不動現金，不計入；IMPORT 不計入。</div>
        </section>

        <aside className="card side card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>日結</h2>
          <label className="lbl" htmlFor="cc">實點現金</label>
          <input id="cc" className="inp inp-lg right" type="number" inputMode="numeric" value={counted} disabled={summary.closed} placeholder="數完抽屜後輸入" onChange={(e) => setCounted(e.target.value)} />
          <div className="line" style={{ borderTop: 0 }}><span>系統合計</span><span className="num">{money(summary.systemCash)}</span></div>
          <div className="line" style={{ fontSize: 18, fontWeight: 700, color: diff === null || diff === 0 ? 'var(--success-text)' : 'var(--danger-text)' }}><span>長短款</span><span className="num">{diff === null ? '—' : diff === 0 ? 'NT$ 0' : diff > 0 ? `長款 +${diff}` : `短款 ${diff}`}</span></div>
          <div className="small muted">{diff === null ? '輸入實點金額後即時計算' : diff === 0 ? '帳平' : '差額會記入日結，不改任何單據；事後查明用更正單對銷'}</div>
          <label className="lbl" htmlFor="nt">備註</label>
          <input id="nt" className="inp" value={note} disabled={summary.closed} onChange={(e) => setNote(e.target.value)} />
          {confirming ? (
            <div className="panel">
              <strong>確認日結 {rocDate(summary.date)}？</strong>
              <span className="small muted">日結後今天的單不能再作廢，補登也只能入帳在明天以後。</span>
              <div className="row"><button type="button" className="btn" onClick={close}>確認日結</button><button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>返回</button></div>
            </div>
          ) : (
            <button type="button" className="btn btn-lg" disabled={countedNum === null || summary.closed} onClick={() => setConfirming(true)}>完成日結</button>
          )}
        </aside>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="card-title">差額待處理<span className="hint">結清狀態不為零的單</span></div>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr><th>入帳日</th><th>戶</th><th>單號</th><th>種類</th><th className="right">差額</th><th>備註</th></tr></thead>
            <tbody>
              {unsettled.map((o) => (
                <tr key={o.id}><td>{rocDate(o.postedOn)}</td><td>{o.householdNumber} {o.headName ?? ''}</td><td><Link to={`/orders/${o.id}`}>#{o.id}</Link></td>
                  <td><span className="tag">{o.kind === 'CORRECTION' ? '更正' : o.kind === 'COUNTER' ? '櫃台' : '匯入'}</span></td>
                  <td className="num right" style={{ fontWeight: 500 }}>{money(o.balance)}</td><td className="small muted">{o.note}</td></tr>
              ))}
              {unsettled.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>沒有待處理的差額</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="card-title">日結歷史</div>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 600 }}>
            <thead><tr><th>日期</th><th className="right">系統合計</th><th className="right">實點</th><th className="right">長短款</th><th>日結人 / 備註</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.closingDate}><td>{rocDate(h.closingDate)}</td><td className="num right">{h.systemCash.toLocaleString()}</td><td className="num right">{h.countedCash.toLocaleString()}</td>
                  <td className="num right" style={{ fontWeight: 500, color: h.difference === 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>{h.difference > 0 ? `+${h.difference}` : h.difference}</td>
                  <td className="small muted">{h.closedBy} {h.note}</td></tr>
              ))}
              {history.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 24 }}>尚未日結過</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
