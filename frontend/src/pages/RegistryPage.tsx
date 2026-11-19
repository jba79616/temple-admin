import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { registry } from '../api'
import type { HouseholdRow, MemberRow, PageView } from '../api/types'
import { useConfig } from '../lib/config'
import { genderLabel } from '../lib/labels'
import { rocYear } from '../lib/roc'

function Pager({ p, onPage }: { p: PageView<unknown>; onPage: (n: number) => void }) {
  return (
    <div className="row" style={{ gap: 8, marginLeft: 'auto' }}>
      <span className="small muted">共 {p.total} 筆 · 第 {p.page + 1} / {Math.max(1, p.totalPages)} 頁</span>
      <button type="button" className="btn btn-sm" disabled={p.page === 0} onClick={() => onPage(p.page - 1)}>上一頁</button>
      <button type="button" className="btn btn-sm" disabled={p.page + 1 >= p.totalPages} onClick={() => onPage(p.page + 1)}>下一頁</button>
    </div>
  )
}

function Zodiac({ zodiac, taisui }: { zodiac: string | null; taisui: string | null }) {
  if (!zodiac) return <>—</>
  return <span className={`zodiac ${taisui ? 'zodiac-ts' : ''}`} title={taisui ?? undefined}>{zodiac}</span>
}

const gender = (g: string | null) => genderLabel(g)

function MemberCells({ m, householdCell }: { m: MemberRow; householdCell?: ReactNode }) {
  return (
    <>
      <td>{householdCell ?? <Link to={`/households/${m.householdId}`} className="num">{m.householdNumber}</Link>}</td>
      <td><Link to={`/members/${m.id}`} style={{ fontWeight: 700 }}>{m.name}</Link>{m.head && <span className="tag" style={{ marginLeft: 6 }}>戶長</span>}</td>
      <td>{gender(m.gender)}</td>
      <td style={{ whiteSpace: 'nowrap' }}>{m.birthText}</td>
      <td><Zodiac zodiac={m.zodiac} taisui={m.taisui} /></td>
      <td>{m.cityDistrict}{m.address}</td>
      <td>{m.lanterns.length ? m.lanterns.join('、') : '—'}</td>
      <td className="muted">{m.phone ?? '—'}</td>
    </>
  )
}

const HEADERS = <><th>戶號</th><th>姓名</th><th>性別</th><th>生辰</th><th>生肖</th><th>住址</th><th>今年安燈</th><th>電話</th></>

function HouseholdRows({ h, open, onToggle }: { h: HouseholdRow; open: boolean; onToggle: () => void }) {
  const head = h.members.find((m) => m.head)
  const others = h.members.filter((m) => !m.head)
  const householdCell = (
    <>
      <Link to={`/households/${h.id}`} className="num" style={{ fontWeight: 700 }}>{h.householdNumber}</Link>
      <div className="small muted" style={{ whiteSpace: 'nowrap' }}>{h.memberCount} 人 · {h.lanternCount} 盞</div>
    </>
  )
  return (
    <>
      <tr>
        <td>
          {others.length > 0 && (
            <button type="button" className="expander" aria-expanded={open} aria-label={open ? '收起同戶成員' : '展開同戶成員'} onClick={onToggle}>{open ? '▾' : '▸'}</button>
          )}
        </td>
        {head
          ? <MemberCells m={head} householdCell={householdCell} />
          : <><td>{householdCell}</td><td colSpan={7} className="muted">（無戶長）</td></>}
      </tr>
      {open && others.map((m) => (
        <tr key={m.id} className="sub-row"><td></td><MemberCells m={m} householdCell={<Link to={`/households/${h.id}`} className="num muted">{h.householdNumber}</Link>} /></tr>
      ))}
    </>
  )
}

export default function RegistryPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'households' ? 'households' : 'members'
  const lit = params.get('lit') === 'true'
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0)
  const { currentYear } = useConfig()
  const [memberPage, setMemberPage] = useState<PageView<MemberRow> | null>(null)
  const [householdPage, setHouseholdPage] = useState<PageView<HouseholdRow> | null>(null)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    let stale = false
    setError('')
    setExpanded({})
    const load = view === 'members'
      ? registry.members(page, lit).then((p) => { if (!stale) setMemberPage(p) })
      : registry.households(page, lit).then((p) => { if (!stale) setHouseholdPage(p) })
    load.catch((e) => { if (!stale) setError(e.message) })
    return () => { stale = true }
  }, [view, lit, page])

  const set = (patch: Record<string, string>) => setParams({ view, lit: String(lit), page: String(page), ...patch })
  const toggle = (id: number) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  const current = view === 'members' ? memberPage : householdPage

  return (
    <main className="page">
      <div>
        <h1>戶籍</h1>
        <div className="small muted" style={{ marginTop: 4 }}>全部成員的生辰與住址。點姓名改資料，點戶號進戶頁安燈。生肖黃底是今年犯太歲。</div>
      </div>
      <section className="card card-pad row" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className={`seg ${view === 'members' ? 'seg-on' : ''}`} onClick={() => set({ view: 'members', page: '0' })}>人員（照編號）</button>
          <button type="button" className={`seg ${view === 'households' ? 'seg-on' : ''}`} onClick={() => set({ view: 'households', page: '0' })}>戶（點箭頭展開）</button>
        </div>
        <label className="row" style={{ gap: 8, minHeight: 44 }}>
          <input type="checkbox" checked={lit} onChange={(e) => set({ lit: String(e.target.checked), page: '0' })} style={{ width: 20, height: 20 }} />
          只看今年（民國 {rocYear(currentYear)} 年）有安燈的
        </label>
        {current && <Pager p={current} onPage={(n) => set({ page: String(n) })} />}
      </section>
      {error && <div className="banner banner-bad">{error}</div>}

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 960 }}>
            <thead><tr><th style={{ width: 44 }}>{view === 'members' ? '編號' : ''}</th>{HEADERS}</tr></thead>
            <tbody>
              {view === 'members' && memberPage?.items.map((m) => (
                <tr key={m.id}><td className="num muted">{m.id}</td><MemberCells m={m} /></tr>
              ))}
              {view === 'households' && householdPage?.items.map((h) => (
                <HouseholdRows key={h.id} h={h} open={!!expanded[h.id]} onToggle={() => toggle(h.id)} />
              ))}
              {current && current.items.length === 0 && <tr><td colSpan={9} className="muted" style={{ textAlign: 'center', padding: 32 }}>沒有資料</td></tr>}
              {!current && <tr><td colSpan={9} className="muted" style={{ padding: 24 }}>載入中…</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {current && <div className="row"><Pager p={current} onPage={(n) => set({ page: String(n) })} /></div>}
    </main>
  )
}
