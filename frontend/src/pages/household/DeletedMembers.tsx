import type { DeletedMemberView } from '../../api/types'
import { genderLabel } from '../../lib/labels'
import { rocDateTime } from '../../lib/roc'

export default function DeletedMembers({ members, onRestore }: { members: DeletedMemberView[]; onRestore: (memberId: number) => void }) {
  return (
    <details className="card" style={{ overflow: 'hidden' }}>
      <summary style={{ padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>
        已刪除成員（{members.length}）<span className="hint" style={{ marginLeft: 8 }}>歷年安燈紀錄都還在；復原後排在成員列最後，戶內沒戶長時直接成為戶長</span>
      </summary>
      <div className="scroll-x">
        <table className="table" style={{ minWidth: 640 }}>
          <thead><tr><th>姓名</th><th>性別</th><th>生辰</th><th>刪除時間</th><th>原因</th><th></th></tr></thead>
          <tbody>
            {members.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 700 }}>{d.name}</td>
                <td>{genderLabel(d.gender)}</td>
                <td className="small">{d.birthText}</td>
                <td className="small muted">{rocDateTime(d.deletedAt)}</td>
                <td className="small muted">{d.deleteReason ?? '—'}</td>
                <td><button type="button" className="btn btn-sm" onClick={() => onRestore(d.id)}>復原</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
