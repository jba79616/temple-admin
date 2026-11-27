import type { MemberView } from '../../api/types'
import type { MemberRemoval } from './useMemberRemoval'

export default function DeletePanel({ removal, newHeadCandidates }: { removal: MemberRemoval; newHeadCandidates: MemberView[] | null }) {
  return (
    <div className="panel panel-danger">
      <label className="lbl" htmlFor="dr" style={{ fontWeight: 700 }}>刪除原因（必填）</label>
      <input id="dr" className="inp" value={removal.reason} onChange={(e) => removal.setReason(e.target.value)} placeholder="例如：重複建檔，與別戶的同一人" />
      {newHeadCandidates && (
        <div className="fld"><label className="lbl" htmlFor="nh">這位是戶長，請先指定新戶長</label>
          <select id="nh" className="inp" value={removal.newHeadId} onChange={(e) => removal.setNewHeadId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">請選擇</option>
            {newHeadCandidates.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}
      <div className="small muted">歷年安燈紀錄全部保留，今年已安的燈留到年底，疏文照印。</div>
      <div className="row">
        <button type="button" className="btn btn-danger" onClick={removal.confirm} disabled={!removal.canConfirm}>{removal.busy ? '刪除中…' : '確認刪除'}</button>
        <button type="button" className="btn btn-ghost" onClick={() => removal.setOpen(false)}>返回</button>
      </div>
    </div>
  )
}
