import { Link } from 'react-router'
import type { OrderView } from '../../api/types'
import { orderStatusText } from '../../lib/correction'
import { ORDER_KIND } from '../../lib/labels'
import { hasCardsToPrint, orderCardsPath } from '../../lib/orders'
import { rocDate, rocYear } from '../../lib/roc'

export default function OrderSummary({ order }: { order: OrderView }) {
  return (
    <section className="card card-pad row" style={{ gap: 24 }}>
      <div className="kv"><span className="k">單號</span><span style={{ fontSize: 22, fontWeight: 700 }}>#{order.id}</span></div>
      <div className="kv"><span className="k">種類</span><span className="tag">{ORDER_KIND[order.kind]}</span></div>
      <div className="kv"><span className="k">狀態</span><span style={{ fontWeight: 700, color: order.status === 'VOIDED' ? 'var(--danger-text)' : 'var(--success-text)' }}>{orderStatusText(order)}</span></div>
      <div className="kv"><span className="k">年度</span><span>民國 {rocYear(order.year)} 年</span></div>
      <div className="kv"><span className="k">登記日</span><span>{rocDate(order.registeredOn)}</span></div>
      <div className="kv"><span className="k">入帳日</span><span>{rocDate(order.postedOn)}（{order.closed ? '已日結，該日凍結' : '尚未日結'}）</span></div>
      <div className="kv"><span className="k">開單人</span><span>{order.createdBy}</span></div>
      {order.correctsOrderId && <div className="kv"><span className="k">更正原單</span><Link to={`/orders/${order.correctsOrderId}`}>#{order.correctsOrderId}</Link></div>}
      {order.note && <div className="kv"><span className="k">備註 / 原因</span><span>{order.note}</span></div>}
      {hasCardsToPrint(order) && (
        <a className="btn btn-ghost" style={{ marginLeft: 'auto', alignSelf: 'center' }} href={orderCardsPath(order.id)} target="_blank" rel="noreferrer"
          title="只印這張單新增、現在還有效的燈；後來取消或改由其他單點的不印，頁面上會提示未列入幾盞">列印本單安燈卡</a>
      )}
    </section>
  )
}
