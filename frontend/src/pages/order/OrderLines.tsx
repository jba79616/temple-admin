import type { OrderView } from '../../api/types'
import { ITEM_ACTION, PAYMENT_KIND } from '../../lib/labels'
import { money, rocDate } from '../../lib/roc'

export default function OrderLines({ order }: { order: OrderView }) {
  return (
    <div className="split">
      <section className="card main" style={{ overflow: 'hidden' }}>
        <div className="card-title">登記明細</div>
        <div className="scroll-x">
          <table className="table" style={{ minWidth: 560 }}>
            <thead><tr><th>成員</th><th>燈種</th><th>動作</th><th>單價</th><th>備註</th></tr></thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}><td>{i.memberName}</td><td>{i.lightTypeName}</td>
                  <td><span className={`tag ${i.action === 'ADD' ? 'tag-ok' : 'tag-bad'}`}>{ITEM_ACTION[i.action]}</span></td>
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
                <tr key={p.id}><td><span className="tag">{PAYMENT_KIND[p.kind]}</span></td><td className="num">{p.amount > 0 ? '+' : ''}{money(p.amount)}</td>
                  <td>{rocDate(p.receivedOn)}</td><td>{rocDate(p.postedOn)}</td><td className="small muted">{p.receivedBy} {p.note}</td></tr>
              ))}
              {order.payments.length === 0 && <tr><td colSpan={5} className="muted">無收款</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="line line-total" style={{ padding: '12px 16px', fontSize: 17 }}><span>結清狀態</span><span style={{ color: order.balance === 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>{order.balance === 0 ? `已結清（應收 ${money(order.totalDue)}，已收 ${money(order.paid)}）` : `差額 ${money(order.balance)}`}</span></div>
      </section>
    </div>
  )
}
