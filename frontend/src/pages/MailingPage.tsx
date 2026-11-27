import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { mailing as api } from '../api'
import type { MailingView } from '../api/types'
import { useAuth } from '../lib/auth'
import { compareForMail, EMPTY_MAILING_FORM, filterMailing, mailingStats, mailingStatsText, pageOf, recipientFormState, toMailingForm, toMailingInput, type MailingFilter, type MailingForm } from '../lib/mailing'
import { usePdfDownload } from '../lib/pdf'
import MailingRow from './mailing/MailingRow'
import Pager from './mailing/Pager'
import RecipientForm from './mailing/RecipientForm'
import { usePageSize } from './mailing/usePageSize'

const FILTERS = [['all', '全部'], ['active', '寄送'], ['paused', '暫停'], ['overseas', '國外'], ['standalone', '沒連到戶']] as const

export default function MailingPage() {
  const { me } = useAuth()
  const isAdmin = me?.role === 'ADMIN'
  const [list, setList] = useState<MailingView[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<MailingFilter>('all')
  const [page, setPage] = useState(0)
  const [pageSize, storePageSize] = usePageSize()
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<MailingForm>(EMPTY_MAILING_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pdf = usePdfDownload(setError)

  const load = useCallback(async () => setList((await api.list()).sort(compareForMail)), [])
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : '讀取名單失敗')) }, [load])

  const stats = useMemo(() => mailingStats(list), [list])
  const shown = useMemo(() => filterMailing(list, q, filter), [list, q, filter])

  const { pages, safePage, rows: pageRows } = pageOf(shown, page, pageSize)
  const changePageSize = (n: number) => {
    storePageSize(n)
    setPage(0)
  }
  const changeQuery = (patch: { q?: string; filter?: typeof filter }) => {
    if (patch.q !== undefined) setQ(patch.q)
    if (patch.filter !== undefined) setFilter(patch.filter)
    setPage(0)
  }

  const set = (patch: Partial<MailingForm>) => setForm((f) => ({ ...f, ...patch }))

  async function save() {
    if (saving || !recipientFormState(form).canSave) return
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') await api.create(toMailingInput(form))
      else if (editing !== null) await api.update(editing, toMailingInput(form))
      setEditing(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(r: MailingView) {
    setError('')
    try {
      await api.setActive(r.id, !r.active)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失敗')
    }
  }

  async function remove(r: MailingView) {
    if (!window.confirm(`確定從帖子名單刪除「${r.name ?? ''}」？`)) return
    setError('')
    try {
      await api.remove(r.id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  return (
    <main className="page">
      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
        <h1>帖子名單</h1>
        <span className="small muted">{mailingStatsText(stats)}</span>
        <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
          <button type="button" className="btn btn-ghost" disabled={pdf.busy} onClick={() => window.open('/print/labels', '_blank', 'noopener')}>標籤列印頁</button>
          <button type="button" className="btn btn-ghost" disabled={pdf.busy} onClick={() => { setError(''); pdf.download('/print/labels') }}>{pdf.busy ? '轉檔中…' : '下載標籤 PDF'}</button>
          <button type="button" className="btn" onClick={() => { setEditing('new'); setForm(EMPTY_MAILING_FORM) }}>新增收件人</button>
        </div>
      </div>
      {error && <div className="banner banner-bad">{error}</div>}
      {editing === 'new' && <RecipientForm title="新增收件人" form={form} onChange={set} onSave={save} onCancel={() => setEditing(null)} saving={saving} />}
      <section className="card card-pad row" style={{ alignItems: 'center', gap: 12 }}>
        <input className="inp" placeholder="搜尋姓名、地址、戶號、備註" value={q} onChange={(e) => changeQuery({ q: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
        <div className="row" style={{ gap: 4 }}>
          {FILTERS.map(([k, label]) => (
            <button key={k} type="button" className={`btn btn-sm ${filter === k ? 'btn-on' : 'btn-ghost'}`} onClick={() => changeQuery({ filter: k })}>{label}</button>
          ))}
        </div>
      </section>
      <section className="card" style={{ overflow: 'hidden' }}>
        <Pager page={safePage} pages={pages} total={shown.length} onPage={setPage} pageSize={pageSize} onPageSize={changePageSize} />
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 820 }}>
            <thead><tr><th style={{ width: 70 }}>郵遞</th><th style={{ width: 120 }}>收件人</th><th>地址</th><th style={{ width: 90 }}>戶</th><th>來源／備註</th><th style={{ width: 70 }}>狀態</th><th style={{ width: 200 }}></th></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <Fragment key={r.id}>
                <MailingRow row={r} editing={editing === r.id} canDelete={isAdmin}
                  onEdit={() => { if (editing === r.id) setEditing(null); else { setEditing(r.id); setForm(toMailingForm(r)) } }}
                  onToggleActive={() => toggleActive(r)} onRemove={() => remove(r)} />
                {editing === r.id && (
                  <tr className="sub-row"><td colSpan={7} style={{ padding: 12 }}>
                    <div style={{ position: 'sticky', left: 0, maxWidth: 'calc(100vw - 56px)' }}>
                    <RecipientForm title={`編輯收件人：${r.name ?? ''}`} form={form} onChange={set} onSave={save} onCancel={() => setEditing(null)} saving={saving} />
                    </div>
                  </td></tr>
                )}
                </Fragment>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 24 }}>{list.length === 0 ? '名單是空的，按「新增收件人」、在戶頁勾「寄帖」，或由管理員在「舊資料匯入」上傳 CSV。' : '沒有符合的收件人'}</td></tr>}
            </tbody>
          </table>
        </div>
        {pages > 1 && <Pager page={safePage} pages={pages} total={shown.length} onPage={(p) => { setPage(p); window.scrollTo({ top: 0 }) }} />}
      </section>
    </main>
  )
}
