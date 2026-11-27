import type { DaySummary } from '../../api/types'
import { cashDifference, differenceHint, differenceText, cashError, parseCash } from '../../lib/closing'
import { money, rocDate } from '../../lib/roc'

interface Props {
  summary: DaySummary
  confirmNote: string
  counted: string
  onCounted: (value: string) => void
  note: string
  onNote: (value: string) => void
  confirming: boolean
  onConfirming: (confirming: boolean) => void
  closing: boolean
  onClose: () => void
}

export default function CloseForm({ summary, confirmNote, counted, onCounted, note, onNote, confirming, onConfirming, closing, onClose }: Props) {
  const countedNum = parseCash(counted)
  const diff = cashDifference(countedNum, summary.systemCash)
  const countedError = cashError(counted)
  return (
    <aside className="card side card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>日結</h2>
      <label className="lbl" htmlFor="cc">實點現金</label>
      <input id="cc" className="inp inp-lg right" inputMode="numeric" value={counted} disabled={summary.closed} placeholder="數完抽屜後輸入" onChange={(e) => onCounted(e.target.value)} />
      <div className="line" style={{ borderTop: 0 }}><span>系統合計</span><span className="num">{money(summary.systemCash)}</span></div>
      <div className="line" style={{ fontSize: 18, fontWeight: 700, color: diff === null || diff === 0 ? 'var(--success-text)' : 'var(--danger-text)' }}><span>長短款</span><span className="num">{differenceText(diff)}</span></div>
      {countedError ? <div className="error small">{countedError}</div> : <div className="small muted">{differenceHint(diff)}</div>}
      <label className="lbl" htmlFor="nt">備註</label>
      <input id="nt" className="inp" value={note} disabled={summary.closed} onChange={(e) => onNote(e.target.value)} />
      {confirming ? (
        <div className="panel">
          <strong>確認日結 {rocDate(summary.date)}？</strong>
          <span className="small muted">{confirmNote}日結後今天的單不能再作廢，補登也只能入帳在明天以後。</span>
          <div className="row"><button type="button" className="btn" onClick={onClose} disabled={closing || countedNum === null}>{closing ? '處理中…' : '確認日結'}</button><button type="button" className="btn btn-ghost" onClick={() => onConfirming(false)}>返回</button></div>
        </div>
      ) : (
        <button type="button" className="btn btn-lg" disabled={countedNum === null || summary.closed} onClick={() => onConfirming(true)}>完成日結</button>
      )}
    </aside>
  )
}
