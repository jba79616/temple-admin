import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router'
import { households, lightTypes as lightTypesApi, members as membersApi, orders as ordersApi } from '../api'
import type { HouseholdDetail, ItemInput, LightType, MemberView, OrderView } from '../api/types'
import Crumbs from '../components/Crumbs'
import LanternMatrix, { cellKey, nextStatus, type Cells } from '../components/LanternMatrix'
import { useAuth } from '../lib/auth'
import { money, rocDate, rocYear, todayIso } from '../lib/roc'

export default function HouseholdPage() {
  const { id } = useParams()
  const householdId = Number(id)
  const { me } = useAuth()
  const isAdmin = me?.role === 'ADMIN'

  const [detail, setDetail] = useState<HouseholdDetail | null>(null)
  const [types, setTypes] = useState<LightType[]>([])
  const [history, setHistory] = useState<OrderView[]>([])
  const [cells, setCells] = useState<Cells>({})
  const [overrides, setOverrides] = useState<Record<string, { price: number; reason: string }>>({})
  const [showPrice, setShowPrice] = useState(false)
  const [showBagua, setShowBagua] = useState(() => window.matchMedia('(min-width: 721px)').matches)
  const [backfill, setBackfill] = useState(false)
  const [regDate, setRegDate] = useState(todayIso())
  const [payDate, setPayDate] = useState(todayIso())
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<OrderView | null>(null)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newGender, setNewGender] = useState('M')
  const asideRef = useRef<HTMLElement>(null)

  const load = useCallback(async () => {
    const [d, t, h] = await Promise.all([households.get(householdId), lightTypesApi.list(), ordersApi.byHousehold(householdId)])
    setDetail(d)
    setTypes(t)
    setHistory(h)
    const initial: Cells = {}
    d.records.forEach((r) => { initial[cellKey(r.memberId, r.lightTypeId)] = 'existing' })
    setCells(initial)
    setOverrides({})
  }, [householdId])

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [load])

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types])
  const memberById = useMemo(() => new Map((detail?.members ?? []).map((m) => [m.id, m])), [detail])

  const changes = useMemo(() => {
    const adds: { key: string; member: MemberView; type: LightType; price: number; override?: { price: number; reason: string } }[] = []
    const removes: { key: string; member: MemberView; type: LightType; price: number }[] = []
    Object.entries(cells).forEach(([key, st]) => {
      const [mid, tid] = key.split(':').map(Number)
      const member = memberById.get(mid)
      const type = typeById.get(tid)
      if (!member || !type) return
      if (st === 'add') adds.push({ key, member, type, price: overrides[key]?.price ?? type.price, override: overrides[key] })
      if (st === 'remove') removes.push({ key, member, type, price: type.price })
    })
    const addSum = adds.reduce((s, a) => s + a.price, 0)
    const removeSum = removes.reduce((s, r) => s + r.price, 0)
    return { adds, removes, addSum, removeSum, due: addSum - removeSum }
  }, [cells, overrides, memberById, typeById])

  function toggle(memberId: number, lightTypeId: number) {
    const key = cellKey(memberId, lightTypeId)
    setCells((prev) => {
      const next = nextStatus(prev[key] ?? 'none')
      const copy = { ...prev }
      if (next === 'none') delete copy[key]; else copy[key] = next
      return copy
    })
    setSaved(null)
    setConfirming(false)
  }

  function toggleOverride(key: string) {
    setOverrides((prev) => {
      const copy = { ...prev }
      if (copy[key]) delete copy[key]
      else {
        const reason = window.prompt('改價原因（必填）', '同年取消後再加回')
        if (!reason || !reason.trim()) return prev
        const priceText = window.prompt('改後單價', '0')
        const price = Number(priceText)
        if (!Number.isInteger(price) || price < 0) return prev
        copy[key] = { price, reason: reason.trim() }
      }
      return copy
    })
  }

  async function save() {
    if (!detail) return
    setSaving(true)
    setError('')
    try {
      const items: ItemInput[] = [
        ...changes.adds.map((a) => ({ memberId: a.member.id, lightTypeId: a.type.id, action: 'ADD' as const,
          unitPrice: a.override ? a.override.price : null, overrideReason: a.override ? a.override.reason : null })),
        ...changes.removes.map((r) => ({ memberId: r.member.id, lightTypeId: r.type.id, action: 'REMOVE' as const })),
      ]
      const order = await ordersApi.create({ householdId: detail.id, items, registeredOn: backfill ? regDate : null, receivedOn: backfill ? payDate : null })
      setSaved(order)
      setConfirming(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '存檔失敗')
    } finally {
      setSaving(false)
    }
  }

  async function addMember() {
    if (!detail || !newName.trim()) return
    try {
      await households.addMember(detail.id, { name: newName.trim(), gender: newGender })
      setNewName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失敗')
    }
  }

  async function setHead(memberId: number) {
    try {
      await membersApi.setHead(memberId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '設定失敗')
    }
  }

  function onNewKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addMember() }
  }

  if (!detail) return <main className="page muted">{error || '載入中…'}</main>
  const head = detail.members.find((m) => m.head)
  const noChanges = changes.adds.length + changes.removes.length === 0

  return (
    <>
    <main className="page">
      <Crumbs items={[{ label: `戶 ${detail.householdNumber} ${head?.name ?? ''}` }]} />

      <section className="card card-pad row" style={{ gap: 24 }}>
        <div className="kv"><span className="k">戶號</span><span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{detail.householdNumber}</span></div>
        <div className="kv"><span className="k">戶長</span><span style={{ fontSize: 18, fontWeight: 700 }}>{head?.name ?? '（未指定）'}</span></div>
        <div className="kv"><span className="k">縣市鄉鎮市區</span><span>{(detail.city ?? '') + (detail.district ?? '') || '—'}</span></div>
        <div className="kv"><span className="k">地址</span><span>{detail.address ?? '—'}</span></div>
        <div className="kv"><span className="k">電話</span><span>{detail.phone ?? '—'}</span></div>
        <div className="kv"><span className="k">聯絡備註</span><span>{detail.contactNote ?? '—'}</span></div>
        <Link to={`/households/${detail.id}/edit`} className="btn btn-ghost" style={{ marginLeft: 'auto' }}>改地址電話</Link>
      </section>

      {saved && (
        <section className="banner banner-ok">
          <div className="kv">
            <strong>已存檔並收款：單號 #{saved.id}</strong>
            <span className="small">應收 {money(saved.totalDue)}，{saved.payments.map((p) => `${p.kind} ${p.amount}`).join('、') || '無收款'}</span>
          </div>
          <div className="row" style={{ marginLeft: 'auto' }}>
            {saved.items.some((i) => i.action === 'ADD') && (
              <a className="btn" href={`/print/cards?orderId=${saved.id}`} target="_blank" rel="noreferrer">列印本戶安燈卡</a>
            )}
            <Link to="/" className="btn btn-ghost">繼續下一戶</Link>
          </div>
        </section>
      )}
      {error && <div className="banner banner-bad">{error}</div>}

      <div className="split">
        <section className="card main" style={{ overflow: 'hidden' }}>
          <div className="card-title">
            <span>成員 × 燈種</span>
            <span className="tag tag-info">藍：已安</span><span className="tag tag-ok">綠：本次新增</span><span className="tag tag-bad">紅：本次取消</span><span className="tag tag-ts">黃列：犯太歲</span>
            <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
              <button type="button" className={`btn btn-sm ${showBagua ? 'btn-on' : ''}`} onClick={() => setShowBagua(!showBagua)}>{showBagua ? '隱藏八卦斗' : '顯示八卦斗'}</button>
              <button type="button" className={`btn btn-sm ${showPrice ? 'btn-on' : ''}`} onClick={() => setShowPrice(!showPrice)}>{showPrice ? '隱藏價格' : '顯示價格'}</button>
            </div>
            <span className="hint" style={{ flexBasis: '100%' }}>點燈種按鈕安燈或取消，改好後按「存檔並收款」。改生辰、地址用旁邊的按鈕。</span>
          </div>
          <LanternMatrix members={detail.members} lightTypes={types} cells={cells} onToggle={toggle} showPrice={showPrice} showBagua={showBagua}
            renderActions={(m) => (
              <>
                <Link to={`/members/${m.id}`} className="btn btn-sm">改生辰資料</Link>
                {!m.head && <button type="button" className="btn btn-sm" onClick={() => setHead(m.id)}>設為戶長</button>}
              </>
            )}
            footer={(
              <div className="mrow mfoot" style={{ background: '#F9FAFB' }}>
                <div className="mline">
                  <div className="namecell" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <label className="sr-only" htmlFor="newName">新成員姓名</label>
                    <input id="newName" className="inp" style={{ minHeight: 40 }} placeholder="新成員姓名，Enter 加入" value={newName}
                      onChange={(e) => setNewName(e.target.value)} onKeyDown={onNewKey} />
                    <label className="sr-only" htmlFor="newGender">性別</label>
                    <select id="newGender" className="inp" style={{ minHeight: 40, width: 'auto' }} value={newGender} onChange={(e) => setNewGender(e.target.value)}>
                      <option value="M">男</option><option value="F">女</option>
                    </select>
                  </div>
                  <div className="actions small muted"><button type="button" className="btn btn-sm" onClick={addMember}>加入成員</button><span>生辰之後按「改生辰資料」補</span></div>
                </div>
              </div>
            )} />
        </section>

        <aside ref={asideRef} className="card side card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>本次應收</h2>
          <div>
            <div className="line" style={{ borderTop: 0, fontWeight: 500 }}><span>新增 {changes.adds.length} 盞</span><span>{money(changes.addSum)}</span></div>
            {changes.adds.map((a) => (
              <div key={a.key} className="line" style={{ paddingLeft: 12, color: 'var(--text-2)' }}>
                <span>{a.member.name} · {a.type.name}{a.override && <span className="tag tag-ts" style={{ marginLeft: 6 }}>改價：{a.override.reason}</span>}</span>
                <span className="row" style={{ gap: 8, whiteSpace: 'nowrap' }}>{money(a.price)}{isAdmin && <button type="button" className="btn btn-sm" onClick={() => toggleOverride(a.key)}>{a.override ? '取消改價' : '改價'}</button>}</span>
              </div>
            ))}
            <div className="line" style={{ fontWeight: 500 }}><span>取消 {changes.removes.length} 盞，折抵</span><span>−{money(changes.removeSum)}</span></div>
            {changes.removes.map((r) => (
              <div key={r.key} className="line" style={{ paddingLeft: 12, color: 'var(--text-2)' }}><span>{r.member.name} · {r.type.name}</span><span>−{money(r.price)}</span></div>
            ))}
            <div className="line line-total"><span>應收</span><span>{money(changes.due)}</span></div>
            {changes.due < 0 && <div className="banner banner-warn small" style={{ padding: '8px 10px' }}>不退費，差額 {money(-changes.due)} 轉功德金，系統以 FORFEIT 結清</div>}
          </div>

          <label className="row" style={{ minHeight: 44, fontSize: 14 }}>
            <input type="checkbox" checked={backfill} onChange={(e) => setBackfill(e.target.checked)} style={{ width: 20, height: 20 }} />補登紙本（填紙本上的日期）
          </label>
          {backfill && (
            <div className="row">
              <label className="fld small muted">登記日（民國 {rocDate(regDate)}）<input type="date" className="inp" value={regDate} max={todayIso()} onChange={(e) => setRegDate(e.target.value)} /></label>
              <label className="fld small muted">收款日（民國 {rocDate(payDate)}）<input type="date" className="inp" value={payDate} max={todayIso()} onChange={(e) => setPayDate(e.target.value)} /></label>
              <div className="small muted">入帳日永遠是今天，日結看入帳日；報表看登記日與收款日。</div>
            </div>
          )}

          {confirming ? (
            <div className="panel">
              <strong>確認收款 {money(changes.due)} 並存檔？</strong>
              <span className="small muted">{backfill ? `補登：登記日 ${rocDate(regDate)}、收款日 ${rocDate(payDate)}，入帳日為今天` : '入帳日與收款日皆為今天'}，收款人 {me?.displayName}</span>
              <div className="row">
                <button type="button" className="btn" onClick={save} disabled={saving}>確認收款</button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>返回修改</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-lg" disabled={noChanges} onClick={() => setConfirming(true)}>存檔並收款</button>
          )}
          <div className="small muted">存檔會在同一筆交易寫入單據、明細、狀態表與收款。年度：民國 {rocYear(detail.year)} 年。</div>
        </aside>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="card-title">本戶單據<span className="hint">點單號看明細、作廢或開更正單</span></div>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 780 }}>
            <thead><tr><th>單號</th><th>登記日</th><th>種類</th><th>狀態</th><th>內容</th><th>應收</th><th>結清</th><th>開單人</th></tr></thead>
            <tbody>
              {history.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/orders/${o.id}`} style={{ fontWeight: 700 }}>#{o.id}</Link></td>
                  <td>{rocDate(o.registeredOn)}</td>
                  <td><span className="tag">{o.kind === 'COUNTER' ? '櫃台' : o.kind === 'CORRECTION' ? '更正' : '匯入'}</span></td>
                  <td>{o.status === 'VOIDED' ? <span className="tag tag-bad">已作廢</span> : <span className="tag tag-ok">有效</span>}</td>
                  <td className="small" style={{ color: 'var(--text-2)' }}>{o.items.filter((i) => i.overrideReason !== '作廢沖正').map((i) => `${i.action === 'REMOVE' ? '取消 ' : ''}${i.memberName} ${i.lightTypeName}`).join('；')}</td>
                  <td className="num">{money(o.totalDue)}</td>
                  <td className={o.balance === 0 ? 'tag-ok' : ''} style={{ color: o.balance === 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>{o.balance === 0 ? '已結清' : `差額 ${money(o.balance)}`}</td>
                  <td className="muted">{o.createdBy}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 24 }}>尚無單據</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
    <div className="sticky-bar">
      <div className="kv"><span className="k">本次應收</span><strong style={{ fontSize: 20 }}>{money(changes.due)}</strong></div>
      <span className="small muted">新增 {changes.adds.length} · 取消 {changes.removes.length}</span>
      <button type="button" className="btn" style={{ marginLeft: 'auto' }} disabled={noChanges}
        onClick={() => { setConfirming(true); asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>存檔並收款</button>
    </div>
    </>
  )
}
