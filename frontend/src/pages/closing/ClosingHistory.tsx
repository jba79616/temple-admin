import { Fragment } from 'react'
import type { ClosingView } from '../../api/types'
import { signedMoney } from '../../lib/closing'
import { money, rocDate, rocDateTime } from '../../lib/roc'
import type { ClosingAmend } from './useClosingAmend'

export default function ClosingHistory({ history, amend }: { history: ClosingView[]; amend: ClosingAmend }) {
  return (
    <section className="card" style={{ overflow: 'hidden' }}>
      <div className="card-title">日結歷史<span className="hint">實點打錯只能改最新一次，原值會留下；更早的差額請開更正單對銷</span></div>
      <div className="scroll-x">
        <table className="table" style={{ minWidth: 600 }}>
          <thead><tr><th>日期</th><th className="right">系統合計</th><th className="right">實點</th><th className="right">長短款</th><th>日結人 / 備註</th></tr></thead>
          <tbody>
            {history.map((h, i) => (
              <Fragment key={h.closingDate}>
                <tr><td>{rocDate(h.closingDate)}</td><td className="num right">{money(h.systemCash)}</td><td className="num right">{money(h.countedCash)}</td>
                  <td className="num right" style={{ fontWeight: 500, color: h.difference === 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>{signedMoney(h.difference)}</td>
                  <td className="small muted">
                    <div className="row" style={{ gap: 8 }}>
                      <span>{h.closedBy} {h.note}</span>
                      {i === 0 && amend.date === null && <button type="button" className="btn btn-sm" onClick={() => amend.start(h)}>修改實點</button>}
                    </div>
                    {h.originalCountedCash !== null && (
                      <div>原實點 {money(h.originalCountedCash)}，{h.amendedBy}{h.amendedAt ? ` ${rocDateTime(h.amendedAt)}` : ''} 改：{h.amendReason}</div>
                    )}
                  </td></tr>
                {h.closingDate === amend.date && <AmendRow closing={h} amend={amend} />}
              </Fragment>
            ))}
            {history.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 24 }}>尚未日結過</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AmendRow({ closing, amend }: { closing: ClosingView; amend: ClosingAmend }) {
  return (
    <tr><td colSpan={5}>
      <div className="panel">
        <strong>修改 {rocDate(closing.closingDate)} 的實點金額</strong>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="fld small muted">實點現金
            <input inputMode="numeric" className="inp" value={amend.cash} onChange={(e) => amend.setCash(e.target.value)} />
          </label>
          <label className="fld small muted" style={{ flex: 1 }}>原因（必填）
            <input className="inp" maxLength={200} placeholder="例：實點 4300 打成 4600" value={amend.reason} onChange={(e) => amend.setReason(e.target.value)} />
          </label>
          <button type="button" className="btn" disabled={!amend.canSubmit} onClick={amend.submit}>{amend.busy ? '修改中…' : '確認修改'}</button>
          <button type="button" className="btn btn-ghost" onClick={amend.cancel}>取消</button>
        </div>
        {amend.cashError && <span className="error small">{amend.cashError}</span>}
        <span className="small muted">系統合計不變，長短款會重算。修改人與原因會記在這筆日結上。</span>
      </div>
    </td></tr>
  )
}
