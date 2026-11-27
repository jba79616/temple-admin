import type { HouseholdDetail } from '../../api/types'
import LanternMatrix from '../../components/LanternMatrix'
import { dueText } from '../../lib/correction'
import { money } from '../../lib/roc'
import type { OrderCorrection } from './useOrderCorrection'

interface Props {
  orderId: number
  detail: HouseholdDetail
  correction: OrderCorrection
  busy: boolean
  onSave: () => void
  onError: (message: string) => void
}

export default function CorrectionPanel({ orderId, detail, correction: c, busy, onSave, onError }: Props) {
  const fail = (err: Error) => onError(err.message)
  return (
    <div className="panel">
      <strong>更正單（引用 #{orderId}）</strong>
      <div className="small muted">點格子改登記：藍勾是目前狀態表、綠勾補登記、紅框取消。要改到別戶的人，用下方搜尋把那一戶加進來一起改。</div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-title">戶 {detail.householdNumber}（原單這一戶）</div>
        <LanternMatrix members={detail.members} lightTypes={c.visibleTypes} cells={c.cells} onToggle={c.toggle} showPrice showBagua />
      </div>
      {c.extra.map((h) => (
        <div key={h.id} className="card" style={{ overflow: 'hidden' }}>
          <div className="card-title row" style={{ justifyContent: 'space-between' }}>
            <span>戶 {h.householdNumber} {h.members.find((m) => m.head)?.name ?? ''}（跨戶）</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => c.removeHousehold(h)}>移除</button>
          </div>
          <LanternMatrix members={h.members} lightTypes={c.visibleTypes} cells={c.cells} onToggle={c.toggle} showPrice showBagua />
        </div>
      ))}
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input className="inp" value={c.query} onChange={(e) => c.setQuery(e.target.value)} placeholder="加入別戶：姓名、電話或戶號"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); c.searchHouseholds().catch(fail) } }} />
        <button type="button" className="btn btn-ghost" disabled={!c.query.trim()} onClick={() => c.searchHouseholds().catch(fail)}>搜尋</button>
      </div>
      {c.hits.length > 0 && (
        <div className="row">
          {c.hits.map((h) => (
            <button key={h.id} type="button" className="btn btn-sm btn-ghost" onClick={() => c.addHousehold(h.id).catch(fail)}>
              戶 {h.householdNumber} {h.headName ?? ''} · {h.cityDistrict} · {h.memberCount} 人
            </button>
          ))}
        </div>
      )}
      <div className="row" style={{ gap: 24 }}>
        <span>補登記 {c.diff.adds} 盞：{money(c.diff.addSum)}</span><span>取消 {c.diff.removes} 盞：折抵 {money(c.diff.removeSum)}</span>
        <strong>差額：{dueText(c.diff.due)}</strong>
      </div>
      <div className="fld"><strong>結清方式</strong>
        {c.options.map((o) => (
          <label key={o.id} className="row" style={{ minHeight: 40, gap: 10 }}><input type="radio" name="settle" checked={c.chosenSettlement === o.id} onChange={() => c.setSettlement(o.id)} style={{ width: 18, height: 18 }} />{o.label}</label>
        ))}
      </div>
      <label className="lbl" htmlFor="cr" style={{ fontWeight: 700 }}>更正原因（必填）</label>
      <input id="cr" className="inp" value={c.reason} onChange={(e) => c.setReason(e.target.value)} placeholder="例如：打成光明燈，信眾實際要太歲燈" />
      <div className="row"><button type="button" className="btn" onClick={onSave} disabled={busy || !c.reason.trim() || c.diff.adds + c.diff.removes === 0}>{busy ? '存檔中…' : '存檔更正單'}</button><button type="button" className="btn btn-ghost" onClick={c.cancel}>取消</button></div>
    </div>
  )
}
