import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { mailing as api } from '../api'
import type { MailingInput, MailingView } from '../api/types'
import { useAuth } from '../lib/auth'
import { compareForMail, mailable, zipOf } from '../lib/mailing'
import { usePdfDownload } from '../lib/pdf'
import { postalCodeOfAddress } from '../lib/taiwan'

type Form = { householdNumber: string; recipientName: string; zip: string; address: string; note: string; active: boolean; version: number | null }
const empty: Form = { householdNumber: '', recipientName: '', zip: '', address: '', note: '', active: true, version: null }
const PAGE_SIZES = [10, 20, 50, 100]
const PAGE_SIZE_KEY = 'mailing.pageSize'

function storedPageSize(): number {
  try {
    const n = Number(localStorage.getItem(PAGE_SIZE_KEY))
    return PAGE_SIZES.includes(n) ? n : PAGE_SIZES[0]
  } catch {
    return PAGE_SIZES[0]
  }
}

function toInput(f: Form): MailingInput {
  return {
    householdNumber: f.householdNumber.trim() === '' ? null : Number(f.householdNumber),
    recipientName: f.recipientName.trim() || null,
    zip: f.zip.trim() || null,
    address: f.address.trim() || null,
    note: f.note.trim() || null,
    active: f.active,
    version: f.version,
  }
}

function toForm(r: MailingView): Form {
  return {
    householdNumber: r.householdNumber === null ? '' : String(r.householdNumber),
    recipientName: r.recipientName ?? '',
    zip: r.zip ?? '',
    address: r.householdId === null ? (r.address ?? '') : '',
    note: r.note ?? '',
    active: r.active,
    version: r.version,
  }
}

function RecipientForm({ title, form, onChange, onSave, onCancel, saving }: {
  title: string; form: Form; onChange: (patch: Partial<Form>) => void; onSave: () => void; onCancel: () => void; saving: boolean
}) {
  const linked = form.householdNumber.trim() !== ''
  const canSave = linked || (form.recipientName.trim() !== '' && form.address.trim() !== '')
  const autoZip = linked ? undefined : postalCodeOfAddress(form.address)
  const zipHint = linked ? '依戶地址自動查' : autoZip ? `自動 ${autoZip}` : form.address.trim() ? '地址查不到，請手動填' : ''
  return (
    <div className="panel">
      <strong>{title}</strong>
      <div className="grid-3">
        <div className="fld"><label className="lbl">戶號（連到戶，寄給戶長、用戶地址）</label><input className="inp" inputMode="numeric" value={form.householdNumber} onChange={(e) => onChange({ householdNumber: e.target.value.replace(/\D/g, '') })} /></div>
        <div className="fld"><label className="lbl">{linked ? '收件人（空白＝戶長）' : '收件人'}</label><input className="inp" value={form.recipientName} onChange={(e) => onChange({ recipientName: e.target.value })} /></div>
        <div className="fld"><label className="lbl">郵遞區號（留空會依地址自動查）</label><input className="inp" inputMode="numeric" placeholder={zipHint} value={form.zip} onChange={(e) => onChange({ zip: e.target.value })} /></div>
      </div>
      {!linked && <div className="fld"><label className="lbl">地址（含縣市鄉鎮）</label><input className="inp" value={form.address} onChange={(e) => onChange({ address: e.target.value })} /></div>}
      <div className="fld"><label className="lbl">備註</label><input className="inp" value={form.note} onChange={(e) => onChange({ note: e.target.value })} /></div>
      <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={form.active} onChange={(e) => onChange({ active: e.target.checked })} />寄送（取消就暫停，不會刪掉）</label>
      <div className="row">
        <button type="button" className="btn" onClick={onSave} disabled={saving || !canSave}>{saving ? '儲存中…' : '儲存'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}

function Pager({ page, pages, total, onPage, pageSize, onPageSize }: {
  page: number; pages: number; total: number; onPage: (p: number) => void; pageSize?: number; onPageSize?: (n: number) => void
}) {
  return (
    <div className="row" style={{ alignItems: 'center', gap: 8, padding: '10px 16px' }}>
      <span className="small muted">共 {total} 筆 · 第 {page + 1} / {Math.max(1, pages)} 頁</span>
      <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>上一頁</button>
      <button type="button" className="btn btn-sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>下一頁</button>
      {onPageSize && (
        <select className="inp" aria-label="每頁筆數" style={{ width: 'auto', minHeight: 0, height: 36, padding: '0 8px' }} value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
          {PAGE_SIZES.map((n) => <option key={n} value={n}>每頁 {n} 筆</option>)}
        </select>
      )}
    </div>
  )
}

export default function MailingPage() {
  const { me } = useAuth()
  const isAdmin = me?.role === 'ADMIN'
  const [list, setList] = useState<MailingView[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'overseas' | 'standalone'>('all')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(storedPageSize)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const pdf = usePdfDownload(setError)

  const load = useCallback(async () => setList((await api.list()).sort(compareForMail)), [])
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : '讀取名單失敗')) }, [load])

  const stats = useMemo(() => ({
    mail: list.filter(mailable).length,
    paused: list.filter((r) => !r.active).length,
    overseas: list.filter((r) => r.overseas).length,
    linked: list.filter((r) => r.householdId !== null).length,
    noZip: list.filter((r) => mailable(r) && zipOf(r) === '').length,
  }), [list])

  const shown = useMemo(() => {
    const kw = q.trim()
    return list.filter((r) => {
      if (filter === 'active' && !r.active) return false
      if (filter === 'paused' && r.active) return false
      if (filter === 'overseas' && !r.overseas) return false
      if (filter === 'standalone' && r.householdId !== null) return false
      if (kw === '') return true
      return [r.name, r.headName, r.recipientName, r.address, r.note, r.source, r.householdNumber === null ? '' : String(r.householdNumber)]
        .some((v) => v?.includes(kw))
    })
  }, [list, q, filter])

  const pages = Math.ceil(shown.length / pageSize)
  const safePage = Math.min(page, Math.max(0, pages - 1))
  const pageRows = shown.slice(safePage * pageSize, (safePage + 1) * pageSize)
  const changePageSize = (n: number) => {
    setPageSize(n)
    setPage(0)
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(n))
    } catch {
      // 私密視窗存不了就只記在這次畫面
    }
  }
  const changeQuery = (patch: { q?: string; filter?: typeof filter }) => {
    if (patch.q !== undefined) setQ(patch.q)
    if (patch.filter !== undefined) setFilter(patch.filter)
    setPage(0)
  }

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))

  async function save() {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') await api.create(toInput(form))
      else if (editing !== null) await api.update(editing, toInput(form))
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
        <span className="small muted">寄 {stats.mail} · 暫停 {stats.paused}{stats.overseas > 0 ? ` · 國外 ${stats.overseas}（不寄）` : ''} · 連到戶 {stats.linked}{stats.noZip > 0 ? ` · ${stats.noZip} 筆查不到郵遞區號` : ''}</span>
        <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
          <button type="button" className="btn btn-ghost" disabled={pdf.busy} onClick={() => window.open('/print/labels', '_blank', 'noopener')}>標籤列印頁</button>
          <button type="button" className="btn btn-ghost" disabled={pdf.busy} onClick={() => { setError(''); pdf.download('/print/labels') }}>{pdf.busy ? '轉檔中…' : '下載標籤 PDF'}</button>
          <button type="button" className="btn" onClick={() => { setEditing('new'); setForm(empty) }}>新增收件人</button>
        </div>
      </div>
      {error && <div className="banner banner-bad">{error}</div>}
      {editing === 'new' && <RecipientForm title="新增收件人" form={form} onChange={set} onSave={save} onCancel={() => setEditing(null)} saving={saving} />}
      <section className="card card-pad row" style={{ alignItems: 'center', gap: 12 }}>
        <input className="inp" placeholder="搜尋姓名、地址、戶號、備註" value={q} onChange={(e) => changeQuery({ q: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
        <div className="row" style={{ gap: 4 }}>
          {([['all', '全部'], ['active', '寄送'], ['paused', '暫停'], ['overseas', '國外'], ['standalone', '沒連到戶']] as const).map(([k, label]) => (
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
                <tr style={mailable(r) ? undefined : { opacity: 0.55 }}>
                  <td className="num">{zipOf(r) || <span className="muted">—</span>}</td>
                  <td style={{ fontWeight: 500 }}>{r.name}{r.householdId !== null && r.recipientName && r.headName && r.recipientName !== r.headName && <span className="small muted" style={{ display: 'block' }}>戶長 {r.headName}</span>}</td>
                  <td>{r.address}</td>
                  <td>{r.householdId !== null ? <Link to={`/households/${r.householdId}`}>戶 {r.householdNumber}</Link> : <span className="muted">—</span>}</td>
                  <td className="small muted">{[r.source, r.note].filter(Boolean).join(' · ')}</td>
                  <td>{r.overseas ? <span className="tag" title="地址不是臺灣，標籤不印">國外不寄</span> : r.active ? <span className="tag tag-ok">寄送</span> : <span className="tag">暫停</span>}</td>
                  <td>
                    <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                      <button type="button" className={`btn btn-sm ${editing === r.id ? 'btn-on' : ''}`} onClick={() => { if (editing === r.id) setEditing(null); else { setEditing(r.id); setForm(toForm(r)) } }}>編輯</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => toggleActive(r)}>{r.active ? '暫停' : '恢復'}</button>
                      {isAdmin && <button type="button" className="btn btn-sm btn-ghost btn-danger" onClick={() => remove(r)}>刪除</button>}
                    </div>
                  </td>
                </tr>
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
