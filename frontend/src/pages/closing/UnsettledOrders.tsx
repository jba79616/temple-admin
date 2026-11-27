import { Link } from 'react-router'
import type { OrderView } from '../../api/types'
import { ORDER_KIND } from '../../lib/labels'
import { money, rocDate } from '../../lib/roc'

export default function UnsettledOrders({ orders }: { orders: OrderView[] }) {
  return (
    <section className="card" style={{ overflow: 'hidden' }}>
      <div className="card-title">差額待處理<span className="hint">結清狀態不為零的單</span></div>
      <div className="scroll-x">
        <table className="table" style={{ minWidth: 560 }}>
          <thead><tr><th>入帳日</th><th>戶</th><th>單號</th><th>種類</th><th className="right">差額</th><th>備註</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}><td>{rocDate(o.postedOn)}</td><td>{o.householdNumber} {o.headName ?? ''}</td><td><Link to={`/orders/${o.id}`}>#{o.id}</Link></td>
                <td><span className="tag">{ORDER_KIND[o.kind]}</span></td>
                <td className="num right" style={{ fontWeight: 500 }}>{money(o.balance)}</td><td className="small muted">{o.note}</td></tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>沒有待處理的差額</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
