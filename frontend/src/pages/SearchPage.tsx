import { useEffect, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { closings, households } from '../api'
import type { DayStatus, HouseholdSummary } from '../api/types'
import { money, rocDate } from '../lib/roc'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ q: string; rows: HouseholdSummary[] }>({ q: '', rows: [] })
  const [today, setToday] = useState<DayStatus | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const idle = q.trim() === ''

  useEffect(() => { closings.status().then(setToday).catch(() => setToday(null)) }, [])

  useEffect(() => {
    let stale = false
    const handle = setTimeout(() => {
      households.search(q)
        .then((rows) => { if (!stale) { setResults({ q, rows }); setError('') } })
        .catch((e) => { if (!stale) setError(e.message) })
    }, 150)
    return () => { stale = true; clearTimeout(handle) }
  }, [q])

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || idle) return
    if (results.q === q) {
      openFirst(results.rows)
      return
    }
    households.search(q).then((rows) => { setResults({ q, rows }); openFirst(rows) }).catch((err) => setError(err.message))
  }

  function openFirst(rows: HouseholdSummary[]) {
    if (rows.length > 0) navigate(`/households/${rows[0].id}`)
  }

  return (
    <main className="page page-narrow">
      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="q" style={{ fontWeight: 700, fontSize: 18 }}>安燈、改資料、看紀錄：先找這一戶</label>
        <input id="q" type="search" className="inp inp-lg" placeholder="戶長或成員姓名、電話、戶號" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} autoComplete="off" autoFocus />
        <div className="small muted">鍵盤：任何畫面按「/」跳回搜尋，「Enter」開啟第一筆。</div>
        <ol className="steps">
          <li><b>1</b>找到戶，點戶長姓名進去</li>
          <li><b>2</b>點成員的燈種按鈕：安燈或取消</li>
          <li><b>3</b>存檔並收款，印安燈卡</li>
        </ol>
        {error && <div className="error">{error}</div>}
      </section>

      {idle && (
        <div className="grid-2">
          <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2>今天{today ? ` ${rocDate(today.date)}` : ''}</h2>
            {today ? (
              <div>
                <div className="line" style={{ borderTop: 0 }}><span>{today.closed ? '今日收款' : '未日結收款'}</span><span>{today.payments} 筆</span></div>
                <div className="line"><span>現金合計</span><span className="num" style={{ fontWeight: 700 }}>{money(today.systemCash)}</span></div>
                <div className="line"><span>日結</span>{today.closed ? <span className="tag tag-ok">已日結</span> : <span className="tag tag-info">尚未日結</span>}</div>
              </div>
            ) : <div className="small muted">讀取中…</div>}
            <div className="row"><Link to="/closing" className="btn btn-ghost">去日結</Link><Link to="/print" className="btn btn-ghost">去列印</Link></div>
          </section>
          <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2>第一次來的信眾</h2>
            <div className="small muted">先建一戶：填地址電話和第一位成員（自動設為戶長），建好直接進戶頁安燈。</div>
            <div style={{ marginTop: 'auto' }}><Link to="/households/new" className="btn">新增戶</Link></div>
          </section>
        </div>
      )}

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="card-title">{idle ? '戶號最前的 50 戶' : `符合「${q.trim()}」的戶`}<span className="hint">{idle ? '其他戶請輸入姓名、電話或戶號搜尋' : '點戶長姓名進戶頁'}</span></div>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 700 }}>
            <thead>
              <tr><th>戶號</th><th>戶長</th><th>縣市鄉鎮市區</th><th>成員</th><th>今年已安</th><th>電話</th></tr>
            </thead>
            <tbody>
              {results.rows.map((h) => (
                <tr key={h.id}>
                  <td className="num muted">{h.householdNumber}</td>
                  <td><Link to={`/households/${h.id}`} style={{ fontWeight: 700, fontSize: 16 }}>{h.headName ?? '（無戶長）'}</Link></td>
                  <td>{h.cityDistrict || '—'}</td>
                  <td>{h.memberCount} 人</td>
                  <td>{h.lanternCount} 盞</td>
                  <td className="muted">{h.phone ?? '—'}</td>
                </tr>
              ))}
              {results.rows.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 32 }}>找不到符合的戶</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {!idle && <div className="row"><Link to="/households/new" className="btn btn-ghost">找不到這一戶？新增戶</Link></div>}
    </main>
  )
}
