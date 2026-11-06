import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { households, lightTypes as lightTypesApi, orders as ordersApi } from '../api'
import type { HouseholdDetail, HouseholdSummary, ItemInput, LightType, OrderView, Settlement } from '../api/types'
import LanternMatrix, { cellKey, nextStatus, type Cells } from '../components/LanternMatrix'
import { useAuth } from '../lib/auth'
import { money, rocDate, rocDateTime, rocYear } from '../lib/roc'

const KIND: Record<string, string> = { COUNTER: '櫃台', CORRECTION: '更正', IMPORT: '匯入' }

export default function OrderPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const { me } = useAuth()
  const isAdmin = me?.role === 'ADMIN'
  const [order, setOrder] = useState<OrderView | null>(null)
  const [error, setError] = useState('')
  const [voiding, setVoiding] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [correcting, setCorrecting] = useState(false)
  const [detail, setDetail] = useState<HouseholdDetail | null>(null)
  const [types, setTypes] = useState<LightType[]>([])
  const [cells, setCells] = useState<Cells>({})
  const [settlement, setSettlement] = useState<Settlement>('CASH')
  const [reason, setReason] = useState('')
  const [created, setCreated] = useState<OrderView | null>(null)
  const [extra, setExtra] = useState<HouseholdDetail[]>([])
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<HouseholdSummary[]>([])

  const load = useCallback(async () => setOrder(await ordersApi.get(orderId)), [orderId])
  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  async function openCorrection() {
    if (!order) return
    const [d, t] = await Promise.all([households.get(order.householdId, order.year), lightTypesApi.list()])
    setDetail(d)
    setTypes(t)
    const initial: Cells = {}
    d.records.forEach((r) => { initial[cellKey(r.memberId, r.lightTypeId)] = 'existing' })
    setCells(initial)
    setExtra([])
    setHits([])
    setQuery('')
    setCorrecting(true)
  }

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types])
  const diff = useMemo(() => {
    let addSum = 0, removeSum = 0, adds = 0, removes = 0
    Object.entries(cells).forEach(([key, st]) => {
      const type = typeById.get(Number(key.split(':')[1]))
      if (!type) return
      if (st === 'add') { adds++; addSum += type.price }
      if (st === 'remove') { removes++; removeSum += type.price }
    })
    return { adds, removes, addSum, removeSum, due: addSum - removeSum }
  }, [cells, typeById])

  function toggle(memberId: number, lightTypeId: number) {
    const key = cellKey(memberId, lightTypeId)
    setCells((prev) => {
      const next = nextStatus(prev[key] ?? 'none')
      const copy = { ...prev }
      if (next === 'none') delete copy[key]; else copy[key] = next
      return copy
    })
  }

  async function searchHouseholds() {
    if (!order || !query.trim()) return
    const found = await households.search(query.trim())
    setHits(found.filter((h) => h.id !== order.householdId && !extra.some((x) => x.id === h.id)))
  }

  async function addHousehold(id: number) {
    if (!order) return
    const d = await households.get(id, order.year)
    setExtra((prev) => [...prev, d])
    setCells((prev) => {
      const next = { ...prev }
      d.records.forEach((r) => { next[cellKey(r.memberId, r.lightTypeId)] = 'existing' })
      return next
    })
    setHits([])
    setQuery('')
  }

  function removeHousehold(h: HouseholdDetail) {
    setExtra((prev) => prev.filter((x) => x.id !== h.id))
    setCells((prev) => {
      const next = { ...prev }
      Object.keys(next).filter((key) => h.members.some((m) => m.id === Number(key.split(':')[0]))).forEach((key) => delete next[key])
      return next
    })
  }

  async function doVoid() {
    setError('')
    try {
      await ordersApi.void(orderId, voidReason.trim())
      setVoiding(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '作廢失敗')
    }
  }

  async function doCorrect() {
    setError('')
    try {
      const items: ItemInput[] = Object.entries(cells).flatMap(([key, st]): ItemInput[] => {
        const [memberId, lightTypeId] = key.split(':').map(Number)
        if (st === 'add') return [{ memberId, lightTypeId, action: 'ADD' }]
        if (st === 'remove') return [{ memberId, lightTypeId, action: 'REMOVE' }]
        return []
      })
      const result = await ordersApi.correct(orderId, { reason: reason.trim(), settlement: diff.due === 0 ? 'PENDING' : settlement, items })
      setCreated(result)
      setCorrecting(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '更正失敗')
    }
  }

  if (!order) return <main className="page muted">{error || '載入中…'}</main>
  const settleOptions: { id: Settlement; label: string }[] = diff.due > 0
    ? [{ id: 'CASH', label: `收現 ${money(diff.due)}（入帳今天）` }, { id: 'PENDING', label: '留待處理（先不收，單列入差額待處理）' }]
    : diff.due < 0
      ? [{ id: 'CASH', label: `退現 ${money(-diff.due)}（入帳今天）` }, { id: 'FORFEIT', label: '放棄退款，差額轉功德金' }, { id: 'PENDING', label: '留待處理' }]
      : [{ id: 'PENDING', label: '差額為零，無需收退款' }]

  return (
    <main className="page page-narrow">
      <div className="crumbs"><Link to={`/households/${order.householdId}`}>← 回戶頁 {order.householdNumber} {order.headName ?? ''}</Link><span>單據 #{order.id}</span></div>
      {error && <div className="banner banner-bad">{error}</div>}
      {created && <div className="banner banner-ok">已開更正單 <Link to={`/orders/${created.id}`}>#{created.id}</Link>，應收 {money(created.totalDue)}，{created.balance === 0 ? '已結清' : `差額 ${money(created.balance)} 待處理`}。原單與原日期的日結都不變。</div>}

      <section className="card card-pad row" style={{ gap: 24 }}>
        <div className="kv"><span className="k">單號</span><span style={{ fontSize: 22, fontWeight: 700 }}>#{order.id}</span></div>
        <div className="kv"><span className="k">種類</span><span className="tag">{KIND[order.kind]}</span></div>
        <div className="kv"><span className="k">狀態</span><span style={{ fontWeight: 700, color: order.status === 'VOIDED' ? 'var(--danger-text)' : 'var(--success-text)' }}>{order.status === 'VOIDED' ? '已作廢' : order.correctedByOrderIds.length ? `有效，已被更正單 ${order.correctedByOrderIds.map((x) => `#${x}`).join('、')} 調整` : '有效'}</span></div>
        <div className="kv"><span className="k">年度</span><span>民國 {rocYear(order.year)} 年</span></div>
        <div className="kv"><span className="k">登記日</span><span>{rocDate(order.registeredOn)}</span></div>
        <div className="kv"><span className="k">入帳日</span><span>{rocDate(order.postedOn)}（{order.closed ? '已日結，該日凍結' : '尚未日結'}）</span></div>
        <div className="kv"><span className="k">開單人</span><span>{order.createdBy}</span></div>
        {order.correctsOrderId && <div className="kv"><span className="k">更正原單</span><Link to={`/orders/${order.correctsOrderId}`}>#{order.correctsOrderId}</Link></div>}
        {order.note && <div className="kv"><span className="k">備註 / 原因</span><span>{order.note}</span></div>}
      </section>

      <div className="split">
        <section className="card main" style={{ overflow: 'hidden' }}>
          <div className="card-title">登記明細</div>
          <div className="scroll-x">
            <table className="table" style={{ minWidth: 560 }}>
              <thead><tr><th>成員</th><th>燈種</th><th>動作</th><th>單價</th><th>備註</th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}><td>{i.memberName}</td><td>{i.lightTypeName}</td>
                    <td><span className={`tag ${i.action === 'ADD' ? 'tag-ok' : 'tag-bad'}`}>{i.action}</span></td>
                    <td className="num">{money(i.unitPrice)}</td><td className="small muted">{i.overrideReason}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="line line-total" style={{ padding: '12px 16px', fontSize: 17 }}><span>應收</span><span>{money(order.totalDue)}</span></div>
        </section>
        <section className="card side" style={{ overflow: 'hidden' }}>
          <div className="card-title">收款</div>
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>種類</th><th>金額</th><th>收款日</th><th>入帳日</th><th>收款人 / 備註</th></tr></thead>
              <tbody>
                {order.payments.map((p) => (
                  <tr key={p.id}><td><span className="tag">{p.kind}</span></td><td className="num">{p.amount > 0 ? '+' : ''}{p.amount.toLocaleString()}</td>
                    <td>{rocDate(p.receivedOn)}</td><td>{rocDate(p.postedOn)}</td><td className="small muted">{p.receivedBy} {p.note}</td></tr>
                ))}
                {order.payments.length === 0 && <tr><td colSpan={5} className="muted">無收款</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="line line-total" style={{ padding: '12px 16px', fontSize: 17 }}><span>結清狀態</span><span style={{ color: order.balance === 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>{order.balance === 0 ? `已結清（${order.totalDue} − ${order.paid} = 0）` : `差額 ${money(order.balance)}`}</span></div>
        </section>
      </div>

      {isAdmin && order.status === 'ACTIVE' && order.kind !== 'IMPORT' && (
        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>動作（ADMIN）</h2>
          {!order.closed && !voiding && (
            <>
              <div className="small muted">入帳日尚未日結，可以沖正：整張作廢，現金退還，狀態表復原。</div>
              <div><button type="button" className="btn btn-danger" onClick={() => setVoiding(true)}>作廢此單</button></div>
            </>
          )}
          {order.closed && !correcting && (
            <>
              <div className="small muted">入帳日已日結，原單凍結。只能開更正單調整，差額記在今天。</div>
              <div><button type="button" className="btn" onClick={() => openCorrection().catch((e) => setError(e.message))}>開更正單</button></div>
            </>
          )}
          {voiding && (
            <div className="panel panel-danger">
              <label className="lbl" htmlFor="vr" style={{ fontWeight: 700 }}>作廢原因（必填）</label>
              <input id="vr" className="inp" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="例如：打錯戶" />
              <div className="small muted">確認後：單據標記作廢，寫入反向明細，所有收款以反向記在今天，請把現金退還信眾。</div>
              <div className="row"><button type="button" className="btn btn-danger" onClick={doVoid} disabled={!voidReason.trim()}>確認作廢並退款 {money(order.paid)}</button><button type="button" className="btn btn-ghost" onClick={() => setVoiding(false)}>取消</button></div>
            </div>
          )}
          {correcting && detail && (
            <div className="panel">
              <strong>更正單（引用 #{order.id}）</strong>
              <div className="small muted">點格子改登記：藍勾是目前狀態表、綠勾補登記、紅框取消。要改到別戶的人，用下方搜尋把那一戶加進來一起改。</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <div className="card-title">戶 {detail.householdNumber}（原單這一戶）</div>
                <LanternMatrix members={detail.members} lightTypes={types} cells={cells} onToggle={toggle} showPrice showBagua addLabel="補" />
              </div>
              {extra.map((h) => (
                <div key={h.id} className="card" style={{ overflow: 'hidden' }}>
                  <div className="card-title row" style={{ justifyContent: 'space-between' }}>
                    <span>戶 {h.householdNumber} {h.members.find((m) => m.head)?.name ?? ''}（跨戶）</span>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => removeHousehold(h)}>移除</button>
                  </div>
                  <LanternMatrix members={h.members} lightTypes={types} cells={cells} onToggle={toggle} showPrice showBagua addLabel="補" />
                </div>
              ))}
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input className="inp" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="加入別戶：姓名、電話或戶號"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchHouseholds().catch((err) => setError(err.message)) } }} />
                <button type="button" className="btn btn-ghost" disabled={!query.trim()} onClick={() => searchHouseholds().catch((err) => setError(err.message))}>搜尋</button>
              </div>
              {hits.length > 0 && (
                <div className="row">
                  {hits.map((h) => (
                    <button key={h.id} type="button" className="btn btn-sm btn-ghost" onClick={() => addHousehold(h.id).catch((err) => setError(err.message))}>
                      戶 {h.householdNumber} {h.headName ?? ''} · {h.cityDistrict} · {h.memberCount} 人
                    </button>
                  ))}
                </div>
              )}
              <div className="row" style={{ gap: 24 }}>
                <span>補登記 {diff.adds} 盞：{money(diff.addSum)}</span><span>取消 {diff.removes} 盞：折抵 {money(diff.removeSum)}</span>
                <strong>差額：{diff.due < 0 ? `應退 ${money(-diff.due)}` : diff.due > 0 ? `應補收 ${money(diff.due)}` : 'NT$ 0'}</strong>
              </div>
              <div className="fld"><strong>結清方式</strong>
                {settleOptions.map((o) => (
                  <label key={o.id} className="row" style={{ minHeight: 40, gap: 10 }}><input type="radio" name="settle" checked={(diff.due === 0 ? 'PENDING' : settlement) === o.id} onChange={() => setSettlement(o.id)} style={{ width: 18, height: 18 }} />{o.label}</label>
                ))}
              </div>
              <label className="lbl" htmlFor="cr" style={{ fontWeight: 700 }}>更正原因（必填）</label>
              <input id="cr" className="inp" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例如：打成光明燈，信眾實際要太歲燈" />
              <div className="row"><button type="button" className="btn" onClick={doCorrect} disabled={!reason.trim() || diff.adds + diff.removes === 0}>存檔更正單</button><button type="button" className="btn btn-ghost" onClick={() => setCorrecting(false)}>取消</button></div>
            </div>
          )}
        </section>
      )}

      <section className="card card-pad small muted" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <strong style={{ color: 'var(--text)' }}>稽核</strong>
        <div>{rocDateTime(order.createdAt)} {order.createdBy} 開單，應收 {money(order.totalDue)}</div>
        {order.voidedAt && <div>{rocDateTime(order.voidedAt)} {order.voidedBy} 作廢：{order.voidReason}</div>}
      </section>
    </main>
  )
}
