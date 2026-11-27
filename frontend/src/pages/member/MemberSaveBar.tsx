import { Link } from 'react-router'

interface Props {
  householdId: number
  dirty: boolean
  saving: boolean
  canSave: boolean
  savedAt: string
  onSave: () => void
  onMove: () => void
  onRemove: () => void
}

export default function MemberSaveBar({ householdId, dirty, saving, canSave, savedAt, onSave, onMove, onRemove }: Props) {
  return (
    <div className="row" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <button type="button" className="btn" onClick={onSave} disabled={!canSave}>{saving ? '儲存中…' : '儲存'}</button>
      <Link to={`/households/${householdId}`} className="btn btn-ghost">{dirty ? '取消' : '回戶頁'}</Link>
      {dirty
        ? <span className="small" style={{ color: 'var(--warn-text)', fontWeight: 500 }}>有未儲存的修改</span>
        : savedAt && <span className="small" style={{ color: 'var(--success-text)', fontWeight: 700 }}>✓ 已儲存 {savedAt}</span>}
      <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={onMove}>移到別戶</button>
      <button type="button" className="btn btn-danger" onClick={onRemove}>刪除此成員</button>
    </div>
  )
}
