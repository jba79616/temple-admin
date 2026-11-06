import { useCallback, useEffect, useState } from 'react'
import { lightTypes as api } from '../api'
import type { LightCategory, LightType } from '../api/types'
import { useAuth } from '../lib/auth'
import { money } from '../lib/roc'

type Form = Omit<LightType, 'id'>
const empty: Form = { category: 'GENERAL', name: '', shortName: '', price: 300, taisui: false, sortOrder: 0, active: true, legacyCode: null }

export default function LightTypesPage() {
  const { me } = useAuth()
  const isAdmin = me?.role === 'ADMIN'
  const [list, setList] = useState<LightType[]>([])
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [error, setError] = useState('')

  const load = useCallback(async () => setList(await api.list(true)), [])
  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  function startEdit(t: LightType) {
    setEditing(t.id)
    setForm({ category: t.category, name: t.name, shortName: t.shortName, price: t.price, taisui: t.taisui, sortOrder: t.sortOrder, active: t.active, legacyCode: t.legacyCode })
  }

  async function save() {
    setError('')
    try {
      if (editing === 'new') await api.create(form)
      else if (editing !== null) await api.update(editing, form)
      setEditing(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    }
  }

  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch })

  return (
    <main className="page page-narrow">
      <div className="row"><h1>燈種</h1>{isAdmin && <button type="button" className="btn" style={{ marginLeft: 'auto' }} onClick={() => { setEditing('new'); setForm({ ...empty, sortOrder: list.length + 1 }) }}>新增燈種</button>}</div>
      {error && <div className="banner banner-bad">{error}</div>}
      {editing !== null && (
        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>{editing === 'new' ? '新增燈種' : '編輯燈種'}</h2>
          <div className="grid-3">
            <div className="fld"><label className="lbl">分類</label><select className="inp" value={form.category} onChange={(e) => set({ category: e.target.value as LightCategory })}><option value="GENERAL">一般燈</option><option value="BAGUA">八卦轉運斗</option></select></div>
            <div className="fld"><label className="lbl">名稱</label><input className="inp" value={form.name} onChange={(e) => set({ name: e.target.value })} /></div>
            <div className="fld"><label className="lbl">縮寫（印在安燈卡）</label><input className="inp" value={form.shortName} onChange={(e) => set({ shortName: e.target.value })} /></div>
            <div className="fld"><label className="lbl">價格</label><input className="inp" type="number" min={0} value={form.price} onChange={(e) => set({ price: Number(e.target.value) })} /></div>
            <div className="fld"><label className="lbl">排序</label><input className="inp" type="number" value={form.sortOrder} onChange={(e) => set({ sortOrder: Number(e.target.value) })} /></div>
            <div className="fld"><label className="lbl">舊系統代碼</label><input className="inp" value={form.legacyCode ?? ''} onChange={(e) => set({ legacyCode: e.target.value || null })} /></div>
          </div>
          <div className="row" style={{ gap: 20 }}>
            <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={form.taisui} onChange={(e) => set({ taisui: e.target.checked })} />太歲燈（犯太歲提示用，只能一種）</label>
            <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} />啟用</label>
          </div>
          <div className="small muted">改價只影響之後的單，已安的燈保留當時價格。</div>
          <div className="row"><button type="button" className="btn" onClick={save} disabled={!form.name.trim() || !form.shortName.trim()}>儲存</button><button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>取消</button></div>
        </section>
      )}
      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 640 }}>
            <thead><tr><th>排序</th><th>分類</th><th>名稱</th><th>縮寫</th><th className="right">價格</th><th>太歲燈</th><th>狀態</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id}><td className="num muted">{t.sortOrder}</td><td>{t.category === 'GENERAL' ? '一般燈' : '八卦轉運斗'}</td><td style={{ fontWeight: 500 }}>{t.name}</td><td>{t.shortName}</td>
                  <td className="num right">{money(t.price)}</td><td>{t.taisui && <span className="tag tag-ts">太歲燈</span>}</td><td>{t.active ? <span className="tag tag-ok">啟用</span> : <span className="tag">停用</span>}</td>
                  {isAdmin && <td><button type="button" className="btn btn-sm" onClick={() => startEdit(t)}>編輯</button></td>}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
