import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { households } from '../api'
import type { HouseholdSummary } from '../api/types'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<HouseholdSummary[]>([])
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const handle = setTimeout(() => {
      households.search(q).then((r) => { setResults(r); setError('') }).catch((e) => setError(e.message))
    }, 150)
    return () => clearTimeout(handle)
  }, [q])

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && results.length > 0) navigate(`/households/${results[0].id}`)
  }

  return (
    <main className="page page-narrow">
      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="q" style={{ fontWeight: 700, fontSize: 18 }}>找戶</label>
        <input id="q" type="search" className="inp inp-lg" placeholder="戶長姓名、任一成員姓名、電話或戶號" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} autoComplete="off" autoFocus />
        <div className="small muted">輸入即時篩選，Enter 開啟第一筆。同名的戶並排顯示電話與地區供分辨。</div>
        {error && <div className="error">{error}</div>}
      </section>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 700 }}>
            <thead>
              <tr><th>戶號</th><th>戶長</th><th>縣市鄉鎮市區</th><th>成員</th><th>今年已安</th><th>電話</th></tr>
            </thead>
            <tbody>
              {results.map((h) => (
                <tr key={h.id}>
                  <td className="num muted">{h.householdNumber}</td>
                  <td><Link to={`/households/${h.id}`} style={{ fontWeight: 700, fontSize: 16 }}>{h.headName ?? '（無戶長）'}</Link></td>
                  <td>{h.cityDistrict || '—'}</td>
                  <td>{h.memberCount} 人</td>
                  <td>{h.lanternCount} 盞</td>
                  <td className="muted">{h.phone ?? '—'}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 32 }}>找不到符合的戶</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="row">
        <Link to="/households/new" className="btn">新增戶</Link>
        <span className="small muted">新增戶時在同一表單填第一位成員，自動設為戶長</span>
      </div>
    </main>
  )
}
