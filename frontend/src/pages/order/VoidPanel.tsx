import { money } from '../../lib/roc'

interface Props {
  paid: number
  reason: string
  onReason: (reason: string) => void
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function VoidPanel({ paid, reason, onReason, busy, onConfirm, onCancel }: Props) {
  return (
    <div className="panel panel-danger">
      <label className="lbl" htmlFor="vr" style={{ fontWeight: 700 }}>作廢原因（必填）</label>
      <input id="vr" className="inp" value={reason} onChange={(e) => onReason(e.target.value)} placeholder="例如：打錯戶" />
      <div className="small muted">確認後：單據標記作廢，寫入反向明細，所有收款以反向記在今天，請把現金退還信眾。</div>
      <div className="row"><button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy || !reason.trim()}>{busy ? '處理中…' : `確認作廢並退款 ${money(paid)}`}</button><button type="button" className="btn btn-ghost" onClick={onCancel}>取消</button></div>
    </div>
  )
}
