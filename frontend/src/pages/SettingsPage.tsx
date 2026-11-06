import { useEffect, useState } from 'react'
import { admin as adminApi, configs as api } from '../api'
import type { RebuildReport, TaisuiView } from '../api/types'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'
import { ganzhiOfYear, rocYear } from '../lib/roc'

const RELATIONS = ['值', '沖', '刑', '害', '破']
const LABELS: Record<string, string> = { current_year: '目前安燈年度（西元）', temple_name: '寺廟名稱（列印用）', temple_address: '寺廟地址', taisui_relations: '犯太歲的關係', prayer_month: '祈福文月份' }

export default function SettingsPage() {
  const { me } = useAuth()
  const isAdmin = me?.role === 'ADMIN'
  const { configs, reload } = useConfig()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [taisui, setTaisui] = useState<TaisuiView | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [report, setReport] = useState<RebuildReport | null>(null)

  useEffect(() => {
    const next: Record<string, string> = {}
    configs.forEach((c) => { next[c.key] = c.value })
    setDraft(next)
    api.taisui().then(setTaisui).catch(() => setTaisui(null))
  }, [configs])

  async function save(key: string) {
    setError('')
    setMessage('')
    if (key === 'current_year' && !window.confirm(`確定把年度切換到西元 ${draft[key]}（民國 ${rocYear(Number(draft[key]))} 年 ${ganzhiOfYear(Number(draft[key]))}）？安燈操作會自動帶入新年度，矩陣一開始全空，歷史年度完整保留。`)) return
    try {
      await api.update(key, draft[key])
      await reload()
      setMessage(`${LABELS[key] ?? key} 已更新`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    }
  }

  function toggleRelation(r: string) {
    const current = (draft.taisui_relations ?? '').split(/[,，\s]+/).filter(Boolean)
    const next = current.includes(r) ? current.filter((x) => x !== r) : [...current, r]
    setDraft({ ...draft, taisui_relations: RELATIONS.filter((x) => next.includes(x)).join(',') })
  }

  async function rebuild(fix: boolean) {
    setError('')
    try {
      setReport(await adminApi.rebuild(fix))
    } catch (e) {
      setError(e instanceof Error ? e.message : '核對失敗')
    }
  }

  return (
    <main className="page page-narrow">
      <h1>設定</h1>
      {message && <div className="banner banner-ok">{message}</div>}
      {error && <div className="banner banner-bad">{error}</div>}
      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {configs.map((c) => (
          <div key={c.key} className="fld">
            <label className="lbl" htmlFor={`cfg-${c.key}`}>{LABELS[c.key] ?? c.key}<span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>{c.description}</span></label>
            {c.key === 'taisui_relations' ? (
              <div className="row">
                {RELATIONS.map((r) => (
                  <label key={r} className="row" style={{ gap: 6, minHeight: 44 }}><input type="checkbox" disabled={!isAdmin} checked={(draft.taisui_relations ?? '').includes(r)} onChange={() => toggleRelation(r)} />{r}</label>
                ))}
                {isAdmin && <button type="button" className="btn btn-sm" onClick={() => save(c.key)}>儲存</button>}
              </div>
            ) : (
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input id={`cfg-${c.key}`} className="inp" disabled={!isAdmin} value={draft[c.key] ?? ''} onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })} />
                {isAdmin && <button type="button" className="btn btn-sm" onClick={() => save(c.key)} disabled={draft[c.key] === c.value}>儲存</button>}
              </div>
            )}
            {c.key === 'current_year' && draft.current_year && <div className="small muted">顯示為 民國 {rocYear(Number(draft.current_year))} 年 {ganzhiOfYear(Number(draft.current_year))}</div>}
          </div>
        ))}
      </section>
      {taisui && (
        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2>今年犯太歲的生肖（民國 {taisui.rocYear} 年 {taisui.ganzhi}，年支 {taisui.yearBranch}）</h2>
          <div className="row">{Object.entries(taisui.flaggedBranches).map(([b, rel]) => <span key={b} className="tag tag-ts">{b} {rel}</span>)}</div>
        </section>
      )}
      {isAdmin && (
        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2>核對工具</h2>
          <div className="small muted">從明細重算狀態表、應收與日結合計，列出不一致的地方。「核對並修正」會依明細修正狀態表，不動單據與收款。</div>
          <div className="row"><button type="button" className="btn btn-ghost" onClick={() => rebuild(false)}>只核對</button><button type="button" className="btn" onClick={() => rebuild(true)}>核對並修正</button></div>
          {report && (
            <div className="small" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>單據 {report.ordersChecked} 張、狀態表 {report.recordsChecked} 筆、日結 {report.closingsChecked} 天{report.fixed ? '，已修正' : ''}。</div>
              {[...report.totalDueMismatches, ...report.recordMismatches, ...report.closingMismatches].map((m, i) => <div key={i} className="error">{m}</div>)}
              {report.totalDueMismatches.length + report.recordMismatches.length + report.closingMismatches.length === 0 && <div style={{ color: 'var(--success-text)' }}>全部一致</div>}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
