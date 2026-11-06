import { useCallback, useEffect, useState } from 'react'
import { users as api } from '../api'
import type { Role, UserView } from '../api/types'

export default function UsersPage() {
  const [list, setList] = useState<UserView[]>([])
  const [form, setForm] = useState({ username: '', password: '', displayName: '', role: 'STAFF' as Role })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => setList(await api.list()), [])
  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  async function run(action: () => Promise<unknown>, ok: string) {
    setError('')
    setMessage('')
    try {
      await action()
      setMessage(ok)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失敗')
    }
  }

  return (
    <main className="page page-narrow">
      <h1>使用者</h1>
      {message && <div className="banner banner-ok">{message}</div>}
      {error && <div className="banner banner-bad">{error}</div>}
      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2>新增使用者</h2>
        <div className="grid-3">
          <div className="fld"><label className="lbl">帳號</label><input className="inp" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" /></div>
          <div className="fld"><label className="lbl">顯示名稱</label><input className="inp" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
          <div className="fld"><label className="lbl">角色</label><select className="inp" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}><option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option></select></div>
          <div className="fld"><label className="lbl">密碼（至少 6 碼）</label><input className="inp" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></div>
        </div>
        <div><button type="button" className="btn" disabled={!form.username.trim() || form.password.length < 6 || !form.displayName.trim()}
          onClick={() => run(async () => { await api.create(form); setForm({ username: '', password: '', displayName: '', role: 'STAFF' }) }, '已新增')}>新增</button></div>
      </section>
      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 600 }}>
            <thead><tr><th>帳號</th><th>顯示名稱</th><th>角色</th><th>狀態</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.username}</td><td>{u.displayName}</td>
                  <td><select className="inp" style={{ minHeight: 36, width: 'auto' }} value={u.role} onChange={(e) => run(() => api.update(u.id, { displayName: u.displayName, role: e.target.value as Role, active: u.active }), '已更新角色')}><option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option></select></td>
                  <td>{u.active ? <span className="tag tag-ok">啟用</span> : <span className="tag">停用</span>}</td>
                  <td className="row" style={{ gap: 6 }}>
                    <button type="button" className="btn btn-sm" onClick={() => run(() => api.update(u.id, { displayName: u.displayName, role: u.role, active: !u.active }), u.active ? '已停用' : '已啟用')}>{u.active ? '停用' : '啟用'}</button>
                    <button type="button" className="btn btn-sm" onClick={() => { const p = window.prompt(`重設 ${u.username} 的密碼（至少 6 碼）`); if (p && p.length >= 6) run(() => api.resetPassword(u.id, p), '已重設密碼') }}>重設密碼</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
