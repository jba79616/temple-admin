import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router'
import { closings as closingsApi, households, lightTypes as lightTypesApi, mailing as mailingApi, members as membersApi, orders as ordersApi } from '../api'
import type { HouseholdDetail, ItemInput, LightType, MailingView, MemberView, OrderView } from '../api/types'
import Crumbs from '../components/Crumbs'
import LanternMatrix, { cellKey, nextStatus, visibleLightTypes, type Cells } from '../components/LanternMatrix'
import { useAuth } from '../lib/auth'
import { money, rocDate, rocDateTime, rocYear, todayIso } from '../lib/roc'
import { GENDER, ORDER_KIND, ORDER_STATUS, PAYMENT_KIND, genderLabel } from '../lib/labels'
import { useUnsavedGuard } from '../lib/useUnsavedGuard'

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
  const [showGeneral, setShowGeneral] = useState(true)
  const [backfill, setBackfill] = useState(false)
  const [regDate, setRegDate] = useState(todayIso())
  const [payDate, setPayDate] = useState(todayIso())
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<OrderView | null>(null)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newGender, setNewGender] = useState('M')
  const [adding, setAdding] = useState(false)
  const [todayClosed, setTodayClosed] = useState(false)
  const [mailingRow, setMailingRow] = useState<MailingView | null>(null)
  const [mailingBusy, setMailingBusy] = useState(false)
  const asideRef = useRef<HTMLElement>(null)

  const load = useCallback(async () => {
    const [d, t, h, today, mail] = await Promise.all([
      households.get(householdId), lightTypesApi.list(true), ordersApi.byHousehold(householdId), closingsApi.status().catch(() => null),
      mailingApi.byHousehold(householdId).catch(() => []),
    ])
    setDetail(d)
    setTypes(t)
    setHistory(h)
    setTodayClosed(today?.closed ?? false)
    setMailingRow(mail[0] ?? null)
    const initial: Cells = {}
    d.records.forEach((r) => { initial[cellKey(r.memberId, r.lightTypeId)] = 'existing' })
    setCells(initial)
    setOverrides({})
  }, [householdId])

  // 只更新成員與紀錄，保留矩陣上還沒存檔的勾選；新出現的紀錄（例如復原成員今年已安的燈）補標成已安
  const refreshDetail = useCallback(async () => {
    const d = await households.get(householdId)
    setDetail(d)
    setCells((prev) => {
      const next = { ...prev }
      d.records.forEach((r) => { next[cellKey(r.memberId, r.lightTypeId)] ??= 'existing' })
      return next
    })
  }, [householdId])

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [load])

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types])
  const memberById = useMemo(() => new Map((detail?.members ?? []).map((m) => [m.id, m])), [detail])
  const paidPrice = useMemo(() => new Map((detail?.records ?? []).map((r) => [cellKey(r.memberId, r.lightTypeId), r.unitPrice])), [detail])
  const visibleTypes = useMemo(() => visibleLightTypes(types, detail?.members ?? [], cells), [types, detail, cells])

  const changes = useMemo(() => {
    const adds: { key: string; member: MemberView; type: LightType; price: number; override?: { price: number; reason: string } }[] = []
    const removes: { key: string; member: MemberView; type: LightType; price: number }[] = []
    Object.entries(cells).forEach(([key, st]) => {
      const [mid, tid] = key.split(':').map(Number)
      const member = memberById.get(mid)
      const type = typeById.get(tid)
      if (!member || !type) return
      if (st === 'add') adds.push({ key, member, type, price: overrides[key]?.price ?? type.price, override: overrides[key] })
      if (st === 'remove') removes.push({ key, member, type, price: paidPrice.get(key) ?? type.price })
    })
    const addSum = adds.reduce((s, a) => s + a.price, 0)
    const removeSum = removes.reduce((s, r) => s + r.price, 0)
    return { adds, removes, addSum, removeSum, due: addSum - removeSum }
  }, [cells, overrides, memberById, typeById, paidPrice])

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
    if (overrides[key]) {
      setOverrides((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)))
      return
    }
    const reason = window.prompt('改價原因（必填）', '同年取消後再加回')
    if (!reason || !reason.trim()) return
    const price = Number(window.prompt('改後單價', '0'))
    if (!Number.isInteger(price) || price < 0) return
    setOverrides((prev) => ({ ...prev, [key]: { price, reason: reason.trim() } }))
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
    if (!detail || !newName.trim() || adding) return
    setAdding(true)
    try {
      await households.addMember(detail.id, { name: newName.trim(), gender: newGender })
      setNewName('')
      await refreshDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失敗')
    } finally {
      setAdding(false)
    }
  }

  async function setHead(memberId: number) {
    try {
      await membersApi.setHead(memberId)
      await refreshDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : '設定失敗')
    }
  }

  async function restoreMember(memberId: number) {
    try {
      await membersApi.restore(memberId)
      await refreshDetail()
    } catch (e) {
      setError(e instanceof Error ? e.message : '復原失敗')
    }
  }

  function onNewKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addMember() }
  }

  const noChanges = changes.adds.length + changes.removes.length === 0
  const cannotSave = noChanges || todayClosed
  useUnsavedGuard(!noChanges && !saving)

  function startConfirm() {
    setConfirming(true)
    asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const hotkey = useRef<() => void>(() => {})
  hotkey.current = () => {
    if (saving) return
    if (confirming) save()
    else if (!cannotSave) startConfirm()
  }
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); hotkey.current() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (!detail) return <main className="page muted">{error || '載入中…'}</main>
  const head = detail.members.find((m) => m.head)

  async function toggleMailing(on: boolean) {
    if (mailingBusy) return
    setMailingBusy(true)
    setError('')
    try {
      if (mailingRow) {
        setMailingRow(await mailingApi.setActive(mailingRow.id, on))
      } else if (on && detail) {
        setMailingRow(await mailingApi.create({ householdNumber: detail.householdNumber }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新帖子名單失敗')
    } finally {
      setMailingBusy(false)
    }
  }

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
        <label className="kv" title="勾了就列在帖子名單，寄給戶長、用戶地址"><span className="k">寄帖</span>
          <span className="row" style={{ gap: 6, minHeight: 24 }}>
            <input type="checkbox" checked={mailingRow?.active ?? false} disabled={mailingBusy} onChange={(e) => toggleMailing(e.target.checked)} style={{ width: 20, height: 20 }} />
            {mailingRow?.overseas && <span className="small muted" title="地址不是臺灣，標籤不印">國外地址不寄</span>}
            {mailingRow && (mailingRow.recipientName || mailingRow.note) && <Link to="/mailing" className="small muted">{mailingRow.recipientName ? `收件人 ${mailingRow.recipientName}` : mailingRow.note}</Link>}
          </span>
        </label>
        <a className="btn btn-ghost" style={{ marginLeft: 'auto' }} href={`/print/cards?householdId=${detail.id}&year=${detail.year}`} target="_blank" rel="noreferrer"
          title="這戶今年所有的燈，不管印過沒；資料改了或卡片印壞、弄丟時補印">印本戶安燈卡</a>
        <Link to={`/households/${detail.id}/edit`} className="btn btn-ghost">改地址電話</Link>
      </section>

      {saved && (
        <section className="banner banner-ok">
          <div className="kv">
            <strong>已存檔並收款：單號 #{saved.id}</strong>
            <span className="small">應收 {money(saved.totalDue)}，{saved.payments.map((p) => `${PAYMENT_KIND[p.kind]} ${money(p.amount)}`).join('、') || '無收款'}</span>
          </div>
          <div className="row" style={{ marginLeft: 'auto' }}>
            {saved.items.some((i) => i.action === 'ADD') && (
              <a className="btn" href={`/print/cards?orderId=${saved.id}`} target="_blank" rel="noreferrer">列印本單安燈卡</a>
            )}
            <Link to="/" className="btn btn-ghost">繼續下一戶</Link>
          </div>
        </section>
      )}
      {error && <div className="banner banner-bad">{error}</div>}
      {todayClosed && <div className="banner banner-warn">今天已經日結，不能再開單收款；明天再登記，或請管理員處理。</div>}

      <div className="split">
        <section className="card main" style={{ overflow: 'hidden' }}>
          <div className="card-title">
            <span>成員 × 燈種</span>
            <span className="tag tag-info">藍：已安</span><span className="tag tag-ok">綠：本次新增</span><span className="tag tag-bad">紅：本次取消</span><span className="tag tag-ts">黃列：犯太歲</span>
            <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
              <button type="button" className={`btn btn-sm ${showGeneral ? 'btn-on' : ''}`} onClick={() => setShowGeneral(!showGeneral)}>{showGeneral ? '隱藏一般燈' : '顯示一般燈'}</button>
              <button type="button" className={`btn btn-sm ${showBagua ? 'btn-on' : ''}`} onClick={() => setShowBagua(!showBagua)}>{showBagua ? '隱藏八卦斗' : '顯示八卦斗'}</button>
              <button type="button" className={`btn btn-sm ${showPrice ? 'btn-on' : ''}`} onClick={() => setShowPrice(!showPrice)}>{showPrice ? '隱藏價格' : '顯示價格'}</button>
            </div>
            <span className="hint" style={{ flexBasis: '100%' }}>點燈種按鈕安燈或取消，改好後按「存檔並收款」。改生辰、地址用旁邊的按鈕。鍵盤：方向鍵在格子間移動、空白鍵切換、Ctrl+Enter 存檔。</span>
          </div>
          <LanternMatrix members={detail.members} lightTypes={visibleTypes} cells={cells} onToggle={toggle} showPrice={showPrice} showBagua={showBagua} showGeneral={showGeneral}
            renderActions={(m) => (
              <>
                <Link to={`/members/${m.id}`} className="btn btn-sm">改生辰資料</Link>
                {m.head
                  ? <span className="btn btn-sm" style={{ visibility: 'hidden' }} aria-hidden="true">設為戶長</span>
                  : <button type="button" className="btn btn-sm" onClick={() => setHead(m.id)}>設為戶長</button>}
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
                      {Object.entries(GENDER).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                    </select>
                  </div>
                  <div className="actions small muted"><button type="button" className="btn btn-sm" onClick={addMember} disabled={adding || !newName.trim()}>{adding ? '加入中…' : '加入成員'}</button><span>生辰之後按「改生辰資料」補</span></div>
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
            {changes.due < 0 && <div className="banner banner-warn small" style={{ padding: '8px 10px' }}>不退費，差額 {money(-changes.due)} 轉功德金，系統以「轉功德金」結清</div>}
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
            <button type="button" className="btn btn-lg" disabled={cannotSave} onClick={() => setConfirming(true)}>存檔並收款</button>
          )}
          <div className="small muted">存檔會在同一筆交易寫入單據、明細、狀態表與收款。年度：民國 {rocYear(detail.year)} 年。</div>
        </aside>
      </div>

      {detail.deletedMembers.length > 0 && (
        <details className="card" style={{ overflow: 'hidden' }}>
          <summary style={{ padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>
            已刪除成員（{detail.deletedMembers.length}）<span className="hint" style={{ marginLeft: 8 }}>歷年安燈紀錄都還在；復原後排在成員列最後，戶內沒戶長時直接成為戶長</span>
          </summary>
          <div className="scroll-x">
            <table className="table" style={{ minWidth: 640 }}>
              <thead><tr><th>姓名</th><th>性別</th><th>生辰</th><th>刪除時間</th><th>原因</th><th></th></tr></thead>
              <tbody>
                {detail.deletedMembers.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700 }}>{d.name}</td>
                    <td>{genderLabel(d.gender)}</td>
                    <td className="small">{d.birthText}</td>
                    <td className="small muted">{rocDateTime(d.deletedAt)}</td>
                    <td className="small muted">{d.deleteReason ?? '—'}</td>
                    <td><button type="button" className="btn btn-sm" onClick={() => restoreMember(d.id)}>復原</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

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
                  <td><span className="tag">{ORDER_KIND[o.kind]}</span></td>
                  <td><span className={`tag ${o.status === 'VOIDED' ? 'tag-bad' : 'tag-ok'}`}>{ORDER_STATUS[o.status]}</span></td>
                  <td className="small" style={{ color: 'var(--text-2)' }}>{o.items.filter((i) => !i.reversal).map((i) => `${i.action === 'REMOVE' ? '取消 ' : ''}${i.memberName} ${i.lightTypeName}`).join('；')}</td>
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
      <button type="button" className="btn" style={{ marginLeft: 'auto' }} disabled={cannotSave} onClick={startConfirm}>存檔並收款</button>
    </div>
    </>
  )
}
