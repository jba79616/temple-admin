import type { Ref } from 'react'
import type { RegistrationChanges } from '../../lib/registration'
import { money, rocDate, rocYear, todayIso } from '../../lib/roc'
import type { Backfill } from './useBackfill'

interface Props {
  ref: Ref<HTMLElement>
  changes: RegistrationChanges
  canOverride: boolean
  onToggleOverride: (key: string) => void
  backfill: Backfill
  confirming: boolean
  onConfirming: (confirming: boolean) => void
  saving: boolean
  cannotSave: boolean
  onSave: () => void
  receiver?: string
  year: number
}

export default function ChargePanel({ ref, changes, canOverride, onToggleOverride, backfill: b, confirming, onConfirming, saving, cannotSave, onSave, receiver, year }: Props) {
  return (
    <aside ref={ref} className="card side card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>本次應收</h2>
      <div>
        <div className="line" style={{ borderTop: 0, fontWeight: 500 }}><span>新增 {changes.adds.length} 盞</span><span>{money(changes.addSum)}</span></div>
        {changes.adds.map((a) => (
          <div key={a.key} className="line" style={{ paddingLeft: 12, color: 'var(--text-2)' }}>
            <span>{a.member.name} · {a.type.name}{a.override && <span className="tag tag-ts" style={{ marginLeft: 6 }}>改價：{a.override.reason}</span>}</span>
            <span className="row" style={{ gap: 8, whiteSpace: 'nowrap' }}>{money(a.price)}{canOverride && <button type="button" className="btn btn-sm" onClick={() => onToggleOverride(a.key)}>{a.override ? '取消改價' : '改價'}</button>}</span>
          </div>
        ))}
        <div className="line" style={{ fontWeight: 500 }}><span>取消 {changes.removes.length} 盞，折抵</span><span>−{money(changes.removeSum)}</span></div>
        {changes.removes.map((r) => (
          <div key={r.key} className="line" style={{ paddingLeft: 12, color: 'var(--text-2)' }}><span>{r.member.name} · {r.type.name}</span><span>−{money(r.price)}</span></div>
        ))}
        <div className="line line-total"><span>應收</span><span>{money(changes.due)}</span></div>
        {changes.due < 0 && <div className="banner banner-warn small" style={{ padding: '8px 10px' }}>不退費，差額 {money(-changes.due)} 轉功德金，系統以「轉功德金」結清</div>}
      </div>

      <label className="row" style={{ minHeight: 44, fontSize: 14 }}>
        <input type="checkbox" checked={b.on} onChange={(e) => b.setOn(e.target.checked)} style={{ width: 20, height: 20 }} />補登紙本（填紙本上的日期）
      </label>
      {b.on && (
        <div className="row">
          <label className="fld small muted">登記日（民國 {rocDate(b.regDate)}）<input type="date" className="inp" value={b.regDate} max={todayIso()} onChange={(e) => b.setRegDate(e.target.value)} /></label>
          <label className="fld small muted">收款日（民國 {rocDate(b.payDate)}）<input type="date" className="inp" value={b.payDate} max={todayIso()} onChange={(e) => b.setPayDate(e.target.value)} /></label>
          <div className="small muted">入帳日永遠是今天，日結看入帳日；報表看登記日與收款日。</div>
        </div>
      )}

      {confirming ? (
        <div className="panel">
          <strong>確認收款 {money(changes.due)} 並存檔？</strong>
          <span className="small muted">{b.on ? `補登：登記日 ${rocDate(b.regDate)}、收款日 ${rocDate(b.payDate)}，入帳日為今天` : '入帳日與收款日皆為今天'}，收款人 {receiver}</span>
          <div className="row">
            <button type="button" className="btn" onClick={onSave} disabled={saving}>確認收款</button>
            <button type="button" className="btn btn-ghost" onClick={() => onConfirming(false)}>返回修改</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-lg" disabled={cannotSave} onClick={() => onConfirming(true)}>存檔並收款</button>
      )}
      <div className="small muted">存檔會在同一筆交易寫入單據、明細、狀態表與收款。年度：民國 {rocYear(year)} 年。</div>
    </aside>
  )
}
