import { useEffect, useState } from 'react'
import { audit as api } from '../api'
import type { AuditView } from '../api/types'
import { rocDateTime } from '../lib/roc'

const TABLES = ['', 'members', 'households', 'light_types', 'system_configs']

function diff(before: string | null, after: string | null): string {
  try {
    const b = before ? (JSON.parse(before) as Record<string, unknown>) : {}
    const a = after ? (JSON.parse(after) as Record<string, unknown>) : {}
    const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]))
    return keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
      .map((k) => `${k}: ${b[k] === undefined ? '—' : String(b[k])} → ${a[k] === undefined ? '—' : String(a[k])}`)
      .join('；')
  } catch {
    return after ?? ''
  }
}

export default function AuditPage() {
  const [table, setTable] = useState('')
  const [rowId, setRowId] = useState('')
  const [logs, setLogs] = useState<AuditView[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.list(table || undefined, rowId ? Number(rowId) : undefined).then(setLogs).catch((e) => setError(e.message))
  }, [table, rowId])

  return (
    <main className="page page-narrow">
      <h1>稽核日誌</h1>
      {error && <div className="banner banner-bad">{error}</div>}
      <section className="card card-pad row">
        <label className="fld small muted">表<select className="inp" value={table} onChange={(e) => setTable(e.target.value)}>{TABLES.map((t) => <option key={t} value={t}>{t || '全部'}</option>)}</select></label>
        <label className="fld small muted">對象 ID<input className="inp" type="number" value={rowId} onChange={(e) => setRowId(e.target.value)} /></label>
      </section>
      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 700 }}>
            <thead><tr><th>時間</th><th>表</th><th>ID</th><th>動作</th><th>使用者</th><th>變更</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}><td className="small">{rocDateTime(l.changedAt)}</td><td>{l.tableName}</td><td className="num">{l.rowId}</td><td><span className="tag">{l.action}</span></td><td className="num">{l.changedBy ?? '—'}</td><td className="small" style={{ color: 'var(--text-2)' }}>{diff(l.before, l.after)}</td></tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>沒有紀錄</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
