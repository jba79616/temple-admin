import { Link } from 'react-router'
import type { DaySummary } from '../../api/types'
import { PAYMENT_KIND } from '../../lib/labels'
import { money, rocDateTime } from '../../lib/roc'

export default function TodayPayments({ summary, title }: { summary: DaySummary; title: string }) {
  return (
    <section className="card main" style={{ overflow: 'hidden' }}>
      <div className="card-title">{title}</div>
      <div className="scroll-x">
        <table className="table" style={{ minWidth: 640 }}>
          <thead><tr><th>時間</th><th>戶</th><th>單號</th><th>種類</th><th className="right">金額</th><th>收款人 / 備註</th></tr></thead>
          <tbody>
            {summary.payments.map((p) => (
              <tr key={p.id} style={{ color: p.kind !== 'CASH' ? 'var(--muted)' : p.amount < 0 ? 'var(--danger-text)' : undefined }}>
                <td>{rocDateTime(p.createdAt).slice(-5)}</td><td>{p.householdNumber} {p.headName ?? ''}</td>
                <td><Link to={`/orders/${p.orderId}`}>#{p.orderId}</Link></td><td><span className="tag">{PAYMENT_KIND[p.kind]}</span></td>
                <td className="num right" style={{ fontWeight: 500 }}>{p.amount > 0 ? '+' : ''}{money(p.amount)}</td>
                <td className="small muted">{p.receivedBy} {p.note}</td>
              </tr>
            ))}
            {summary.payments.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>尚無收款</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="line line-total" style={{ padding: '12px 16px', fontSize: 17 }}><span>系統合計（只算現金）</span><span>{money(summary.systemCash)}</span></div>
      <div className="small muted" style={{ padding: '0 16px 12px' }}>轉功德金不動現金，不計入；匯入的歷史資料也不計入。</div>
    </section>
  )
}
