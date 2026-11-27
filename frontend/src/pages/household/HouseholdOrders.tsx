import { Link } from 'react-router'
import type { OrderView } from '../../api/types'
import { ORDER_KIND, ORDER_STATUS } from '../../lib/labels'
import { orderContentText } from '../../lib/registration'
import { money, rocDate } from '../../lib/roc'

export default function HouseholdOrders({ orders }: { orders: OrderView[] }) {
  return (
    <section className="card" style={{ overflow: 'hidden' }}>
      <div className="card-title">本戶單據<span className="hint">點單號看明細、作廢或開更正單</span></div>
      <div className="scroll-x">
        <table className="table" style={{ minWidth: 780 }}>
          <thead><tr><th>單號</th><th>登記日</th><th>種類</th><th>狀態</th><th>內容</th><th>應收</th><th>結清</th><th>開單人</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link to={`/orders/${o.id}`} style={{ fontWeight: 700 }}>#{o.id}</Link></td>
                <td>{rocDate(o.registeredOn)}</td>
                <td><span className="tag">{ORDER_KIND[o.kind]}</span></td>
                <td><span className={`tag ${o.status === 'VOIDED' ? 'tag-bad' : 'tag-ok'}`}>{ORDER_STATUS[o.status]}</span></td>
                <td className="small" style={{ color: 'var(--text-2)' }}>{orderContentText(o)}</td>
                <td className="num">{money(o.totalDue)}</td>
                <td className={o.balance === 0 ? 'tag-ok' : ''} style={{ color: o.balance === 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>{o.balance === 0 ? '已結清' : `差額 ${money(o.balance)}`}</td>
                <td className="muted">{o.createdBy}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 24 }}>尚無單據</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
