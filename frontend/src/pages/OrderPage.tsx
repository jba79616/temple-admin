import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { orders as ordersApi } from '../api'
import type { OrderView } from '../api/types'
import Crumbs from '../components/Crumbs'
import { hasCardsToPrint, orderCardsPath } from '../lib/orders'
import { useAuth } from '../lib/auth'
import { money, rocDateTime } from '../lib/roc'
import { useUnsavedGuard } from '../lib/useUnsavedGuard'
import CorrectionPanel from './order/CorrectionPanel'
import OrderLines from './order/OrderLines'
import OrderSummary from './order/OrderSummary'
import { useOrderCorrection } from './order/useOrderCorrection'
import VoidPanel from './order/VoidPanel'

export default function OrderPage() {
  const { id } = useParams()
  const orderId = Number(id)
  const { me } = useAuth()
  const isAdmin = me?.role === 'ADMIN'
  const [order, setOrder] = useState<OrderView | null>(null)
  const [error, setError] = useState('')
  const [voiding, setVoiding] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [created, setCreated] = useState<OrderView | null>(null)
  const [busy, setBusy] = useState(false)
  const correction = useOrderCorrection(order)

  const load = useCallback(async () => setOrder(await ordersApi.get(orderId)), [orderId])
  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  useUnsavedGuard(correction.correcting && !busy && correction.touched)

  async function doVoid() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await ordersApi.void(orderId, voidReason.trim())
      setVoiding(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '作廢失敗')
    } finally {
      setBusy(false)
    }
  }

  async function doCorrect() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await ordersApi.correct(orderId, correction.request())
      setCreated(result)
      correction.setCorrecting(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '更正失敗')
    } finally {
      setBusy(false)
    }
  }

  if (!order) return <main className="page muted">{error || '載入中…'}</main>

  return (
    <main className="page page-narrow">
      <Crumbs items={[{ to: `/households/${order.householdId}`, label: `戶 ${order.householdNumber} ${order.headName ?? ''}` }, { label: `單據 #${order.id}` }]} />
      {error && <div className="banner banner-bad">{error}</div>}
      {created && (
        <div className="banner banner-ok row">
          <span>已開更正單 <Link to={`/orders/${created.id}`}>#{created.id}</Link>，應收 {money(created.totalDue)}，{created.balance === 0 ? '已結清' : `差額 ${money(created.balance)} 待處理`}。原單與原日期的日結都不變。</span>
          {hasCardsToPrint(created) && <a className="btn btn-sm" style={{ marginLeft: 'auto' }} href={orderCardsPath(created.id)} target="_blank" rel="noreferrer">列印更正單安燈卡</a>}
        </div>
      )}

      <OrderSummary order={order} />
      <OrderLines order={order} />

      {isAdmin && order.status === 'ACTIVE' && order.kind !== 'IMPORT' && (
        <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>動作（管理員）</h2>
          {!order.closed && !voiding && (
            <>
              <div className="small muted">入帳日尚未日結，可以沖正：整張作廢，現金退還，狀態表復原。</div>
              <div><button type="button" className="btn btn-danger" onClick={() => setVoiding(true)}>作廢此單</button></div>
            </>
          )}
          {order.closed && !correction.correcting && (
            <>
              <div className="small muted">入帳日已日結，原單凍結。只能開更正單調整，差額記在今天。</div>
              <div><button type="button" className="btn" onClick={() => correction.open().catch((e) => setError(e.message))}>開更正單</button></div>
            </>
          )}
          {voiding && (
            <VoidPanel paid={order.paid} reason={voidReason} onReason={setVoidReason} busy={busy} onConfirm={doVoid} onCancel={() => setVoiding(false)} />
          )}
          {correction.correcting && correction.detail && (
            <CorrectionPanel orderId={order.id} detail={correction.detail} correction={correction} busy={busy} onSave={doCorrect} onError={setError} />
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
