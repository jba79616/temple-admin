import { Link } from 'react-router'
import type { HouseholdDetail, MemberView } from '../../api/types'
import type { HouseholdMailing } from './useHouseholdMailing'

export default function HouseholdHeader({ detail, head, mailing }: { detail: HouseholdDetail; head?: MemberView; mailing: HouseholdMailing }) {
  const row = mailing.row
  return (
    <section className="card card-pad row" style={{ gap: 24 }}>
      <div className="kv"><span className="k">戶號</span><span className="num" style={{ fontSize: 22, fontWeight: 700 }}>{detail.householdNumber}</span></div>
      <div className="kv"><span className="k">戶長</span><span style={{ fontSize: 18, fontWeight: 700 }}>{head?.name ?? '（未指定）'}</span></div>
      <div className="kv"><span className="k">縣市鄉鎮市區</span><span>{(detail.city ?? '') + (detail.district ?? '') || '—'}</span></div>
      <div className="kv"><span className="k">地址</span><span>{detail.address ?? '—'}</span></div>
      <div className="kv"><span className="k">電話</span><span>{detail.phone ?? '—'}</span></div>
      <div className="kv"><span className="k">聯絡備註</span><span>{detail.contactNote ?? '—'}</span></div>
      <label className="kv" title="勾了就列在帖子名單，寄給戶長、用戶地址"><span className="k">寄帖</span>
        <span className="row" style={{ gap: 6, minHeight: 24 }}>
          <input type="checkbox" checked={row?.active ?? false} disabled={mailing.busy} onChange={(e) => mailing.toggle(e.target.checked)} style={{ width: 20, height: 20 }} />
          {row?.overseas && <span className="small muted" title="地址不是臺灣，標籤不印">國外地址不寄</span>}
          {row && (row.recipientName || row.note) && <Link to="/mailing" className="small muted">{row.recipientName ? `收件人 ${row.recipientName}` : row.note}</Link>}
        </span>
      </label>
      <a className="btn btn-ghost" style={{ marginLeft: 'auto' }} href={`/print/cards?householdId=${detail.id}&year=${detail.year}`} target="_blank" rel="noreferrer"
        title="這戶今年所有的燈，不管印過沒；資料改了或卡片印壞、弄丟時補印">印本戶安燈卡</a>
      <Link to={`/households/${detail.id}/edit`} className="btn btn-ghost">改地址電話</Link>
    </section>
  )
}
