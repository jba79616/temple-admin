import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { closings as closingsApi, households, lightTypes as lightTypesApi, mailing as mailingApi, members as membersApi, orders as ordersApi } from '../api'
import type { HouseholdDetail, LightType, OrderView } from '../api/types'
import Crumbs from '../components/Crumbs'
import LanternMatrix from '../components/LanternMatrix'
import { useAuth } from '../lib/auth'
import { registrationItems } from '../lib/registration'
import { money } from '../lib/roc'
import { useUnsavedGuard } from '../lib/useUnsavedGuard'
import ChargePanel from './household/ChargePanel'
import DeletedMembers from './household/DeletedMembers'
import HouseholdHeader from './household/HouseholdHeader'
import HouseholdOrders from './household/HouseholdOrders'
import NewMemberRow from './household/NewMemberRow'
import SavedBanner from './household/SavedBanner'
import { useBackfill } from './household/useBackfill'
import { useCtrlEnter } from './household/useCtrlEnter'
import { useHouseholdMailing } from './household/useHouseholdMailing'
import { useLanternEdits } from './household/useLanternEdits'

export default function HouseholdPage() {
  const { id } = useParams()
  const householdId = Number(id)
  const { me } = useAuth()
  const isAdmin = me?.role === 'ADMIN'

  const [detail, setDetail] = useState<HouseholdDetail | null>(null)
  const [types, setTypes] = useState<LightType[]>([])
  const [history, setHistory] = useState<OrderView[]>([])
  const [showPrice, setShowPrice] = useState(false)
  const [showBagua, setShowBagua] = useState(() => window.matchMedia('(min-width: 721px)').matches)
  const [showGeneral, setShowGeneral] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<OrderView | null>(null)
  const [error, setError] = useState('')
  const [todayClosed, setTodayClosed] = useState(false)
  const asideRef = useRef<HTMLElement>(null)
  const edits = useLanternEdits(detail, types)
  const backfill = useBackfill()
  const mailing = useHouseholdMailing(detail, setError)
  const { reset: resetEdits, mergeNewRecords } = edits
  const { setRow: setMailingRow } = mailing

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
    resetEdits(d.records)
  }, [householdId, resetEdits, setMailingRow])

  // 只更新成員與紀錄，保留矩陣上還沒存檔的勾選；新出現的紀錄（例如復原成員今年已安的燈）補標成已安
  const refreshDetail = useCallback(async () => {
    const d = await households.get(householdId)
    setDetail(d)
    mergeNewRecords(d.records)
  }, [householdId, mergeNewRecords])

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [load])

  const changes = edits.changes

  function toggle(memberId: number, lightTypeId: number) {
    edits.toggle(memberId, lightTypeId)
    setSaved(null)
    setConfirming(false)
  }

  async function save() {
    if (!detail) return
    setSaving(true)
    setError('')
    try {
      const order = await ordersApi.create({ householdId: detail.id, items: registrationItems(changes), registeredOn: backfill.registeredOn, receivedOn: backfill.receivedOn })
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

  async function addMember(name: string, gender: string) {
    if (!detail) return
    await households.addMember(detail.id, { name, gender })
    await refreshDetail()
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

  const noChanges = changes.adds.length + changes.removes.length === 0
  const cannotSave = noChanges || todayClosed
  useUnsavedGuard(!noChanges && !saving)

  function startConfirm() {
    setConfirming(true)
    asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useCtrlEnter(() => {
    if (saving) return
    if (confirming) save()
    else if (!cannotSave) startConfirm()
  })

  if (!detail) return <main className="page muted">{error || '載入中…'}</main>
  const head = detail.members.find((m) => m.head)

  return (
    <>
    <main className="page">
      <Crumbs items={[{ label: `戶 ${detail.householdNumber} ${head?.name ?? ''}` }]} />

      <HouseholdHeader detail={detail} head={head} mailing={mailing} />

      {saved && <SavedBanner order={saved} />}
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
          <LanternMatrix members={detail.members} lightTypes={edits.visibleTypes} cells={edits.cells} onToggle={toggle} showPrice={showPrice} showBagua={showBagua} showGeneral={showGeneral}
            renderActions={(m) => (
              <>
                <Link to={`/members/${m.id}`} className="btn btn-sm">改生辰資料</Link>
                {m.head
                  ? <span className="btn btn-sm" style={{ visibility: 'hidden' }} aria-hidden="true">設為戶長</span>
                  : <button type="button" className="btn btn-sm" onClick={() => setHead(m.id)}>設為戶長</button>}
              </>
            )}
            footer={<NewMemberRow onAdd={addMember} onError={setError} />} />
        </section>

        <ChargePanel ref={asideRef} changes={changes} canOverride={isAdmin} onToggleOverride={edits.toggleOverride} backfill={backfill}
          confirming={confirming} onConfirming={setConfirming} saving={saving} cannotSave={cannotSave} onSave={save}
          receiver={me?.displayName} year={detail.year} />
      </div>

      {detail.deletedMembers.length > 0 && <DeletedMembers members={detail.deletedMembers} onRestore={restoreMember} />}

      <HouseholdOrders orders={history} />
    </main>
    <div className="sticky-bar">
      <div className="kv"><span className="k">本次應收</span><strong style={{ fontSize: 20 }}>{money(changes.due)}</strong></div>
      <span className="small muted">新增 {changes.adds.length} · 取消 {changes.removes.length}</span>
      <button type="button" className="btn" style={{ marginLeft: 'auto' }} disabled={cannotSave} onClick={startConfirm}>存檔並收款</button>
    </div>
    </>
  )
}
