import { Link } from 'react-router'
import type { MailingView } from '../../api/types'
import { mailable, zipOf } from '../../lib/mailing'

export default function MailingRow({ row: r, editing, canDelete, onEdit, onToggleActive, onRemove }: {
  row: MailingView; editing: boolean; canDelete: boolean; onEdit: () => void; onToggleActive: () => void; onRemove: () => void
}) {
  return (
    <tr style={mailable(r) ? undefined : { opacity: 0.55 }}>
      <td className="num">{zipOf(r) || <span className="muted">—</span>}</td>
      <td style={{ fontWeight: 500 }}>{r.name}{r.householdId !== null && r.recipientName && r.headName && r.recipientName !== r.headName && <span className="small muted" style={{ display: 'block' }}>戶長 {r.headName}</span>}</td>
      <td>{r.address}</td>
      <td>{r.householdId !== null ? <Link to={`/households/${r.householdId}`}>戶 {r.householdNumber}</Link> : <span className="muted">—</span>}</td>
      <td className="small muted">{[r.source, r.note].filter(Boolean).join(' · ')}</td>
      <td>{r.overseas ? <span className="tag" title="地址不是臺灣，標籤不印">國外不寄</span> : r.active ? <span className="tag tag-ok">寄送</span> : <span className="tag">暫停</span>}</td>
      <td>
        <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
          <button type="button" className={`btn btn-sm ${editing ? 'btn-on' : ''}`} onClick={onEdit}>編輯</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onToggleActive}>{r.active ? '暫停' : '恢復'}</button>
          {canDelete && <button type="button" className="btn btn-sm btn-ghost btn-danger" onClick={onRemove}>刪除</button>}
        </div>
      </td>
    </tr>
  )
}
