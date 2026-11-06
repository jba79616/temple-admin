import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { households } from '../api'
import type { HouseholdInput, MemberInput } from '../api/types'
import Crumbs from '../components/Crumbs'
import MemberFields from '../components/MemberFields'
import { CITIES, DISTRICTS, postalCode } from '../lib/taiwan'

const emptyHead: MemberInput = { name: '', gender: 'M', birthMonthIsLeap: false }

export default function HouseholdFormPage() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const [form, setForm] = useState<HouseholdInput>({ city: '新北市', district: null, address: '', phone: '', contactNote: '', notes: '' })
  const [head, setHead] = useState<MemberInput>(emptyHead)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(!editing)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!editing) return
    households.get(Number(id)).then((d) => {
      setForm({ city: d.city, district: d.district, address: d.address ?? '', phone: d.phone ?? '', contactNote: d.contactNote ?? '', notes: d.notes ?? '' })
      setTitle(`戶 ${d.householdNumber} ${d.members.find((m) => m.head)?.name ?? ''}`)
      setLoaded(true)
    }).catch((e) => setError(e.message))
  }, [editing, id])

  async function save() {
    setError('')
    try {
      if (editing) {
        await households.update(Number(id), form)
        navigate(`/households/${id}`)
      } else {
        const created = await households.create({ ...form, head })
        navigate(`/households/${created.id}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    }
  }

  if (!loaded) return <main className="page muted">{error || '載入中…'}</main>
  const set = (patch: Partial<HouseholdInput>) => setForm({ ...form, ...patch })
  const districts = form.city ? DISTRICTS[form.city] ?? [] : []

  return (
    <main className="page page-narrow">
      <Crumbs items={editing ? [{ to: `/households/${id}`, label: title }, { label: '改地址電話' }] : [{ label: '新增戶' }]} />
      {error && <div className="banner banner-bad">{error}</div>}
      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2>{editing ? '地址與聯絡方式' : '戶資料'}</h2>
        <div className="grid-3">
          <div className="fld"><label className="lbl" htmlFor="h-city">縣市</label>
            <select id="h-city" className="inp" value={form.city ?? ''} onChange={(e) => set({ city: e.target.value || null, district: null })}>
              <option value="">（未填）</option>{CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="fld"><label className="lbl" htmlFor="h-dist">鄉鎮市區</label>
            <input id="h-dist" className="inp" list="h-distlist" value={form.district ?? ''} disabled={!form.city} onChange={(e) => set({ district: e.target.value || null })} />
            <datalist id="h-distlist">{districts.map((d) => <option key={d} value={d} />)}</datalist>
            {form.district && <span className="small muted">{postalCode(form.city, form.district) ? `郵遞區號 ${postalCode(form.city, form.district)}` : '查無郵遞區號，請確認鄉鎮市區名稱'}</span>}
          </div>
          <div className="fld"><label className="lbl" htmlFor="h-phone">電話（選填）</label><input id="h-phone" className="inp" type="tel" value={form.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} /></div>
        </div>
        <div className="fld"><label className="lbl" htmlFor="h-addr">地址（街路門牌）</label><input id="h-addr" className="inp" value={form.address ?? ''} onChange={(e) => set({ address: e.target.value })} /></div>
        <div className="grid-2">
          <div className="fld"><label className="lbl" htmlFor="h-contact">聯絡備註（LINE、代辦人等，選填）</label><input id="h-contact" className="inp" value={form.contactNote ?? ''} onChange={(e) => set({ contactNote: e.target.value })} /></div>
          <div className="fld"><label className="lbl" htmlFor="h-notes">備註</label><input id="h-notes" className="inp" value={form.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} /></div>
        </div>
      </section>
      {!editing && (
        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>第一位成員（自動設為戶長）</h2>
          <MemberFields value={head} onChange={setHead} />
        </section>
      )}
      <div className="row">
        <button type="button" className="btn btn-lg" onClick={save} disabled={!editing && !head.name.trim()}>{editing ? '儲存' : '建立戶'}</button>
        <Link to={editing ? `/households/${id}` : '/'} className="btn btn-ghost">取消</Link>
      </div>
    </main>
  )
}
