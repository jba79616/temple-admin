import { Link } from 'react-router'
import type { OrderView } from '../../api/types'
import { hasCardsToPrint, orderCardsPath } from '../../lib/orders'
import { paymentsText } from '../../lib/registration'
import { money } from '../../lib/roc'

export default function SavedBanner({ order }: { order: OrderView }) {
  return (
    <section className="banner banner-ok">
      <div className="kv">
        <strong>已存檔並收款：單號 #{order.id}</strong>
        <span className="small">應收 {money(order.totalDue)}，{paymentsText(order)}</span>
      </div>
      <div className="row" style={{ marginLeft: 'auto' }}>
        {hasCardsToPrint(order) && (
          <a className="btn" href={orderCardsPath(order.id)} target="_blank" rel="noreferrer">列印本單安燈卡</a>
        )}
        <Link to="/" className="btn btn-ghost">繼續下一戶</Link>
      </div>
    </section>
  )
}
