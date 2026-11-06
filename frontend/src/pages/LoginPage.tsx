import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <h1>安燈系統</h1>
        <div className="fld">
          <label className="lbl" htmlFor="u">帳號</label>
          <input id="u" className="inp" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
        </div>
        <div className="fld">
          <label className="lbl" htmlFor="p">密碼</label>
          <input id="p" className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn btn-lg" type="submit" disabled={busy || !username || !password}>登入</button>
      </form>
    </div>
  )
}
