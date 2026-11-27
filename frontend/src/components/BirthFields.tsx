import type { MemberInput } from '../api/types'
import { hasInvalidGanzhi, withBirthMonth } from '../lib/member'
import { BRANCHES, GANZHI_LIST } from '../lib/roc'

export default function BirthFields({ value, onChange }: { value: MemberInput; onChange: (next: MemberInput) => void }) {
  const set = (patch: Partial<MemberInput>) => onChange({ ...value, ...patch })
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <strong>生辰（農曆）</strong>
      <div className="grid-3">
        <div className="fld"><label className="lbl" htmlFor="m-gz">干支年</label>
          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            <input id="m-gz" className="inp" list="gzlist" value={value.birthGanzhi ?? ''} placeholder="打一個字自動補全" onChange={(e) => set({ birthGanzhi: e.target.value.trim() || null })} />
            <button type="button" className="btn btn-sm" onClick={() => set({ birthGanzhi: null })}>吉</button>
          </div>
          <datalist id="gzlist">{GANZHI_LIST.map((g) => <option key={g} value={g} />)}</datalist>
          {hasInvalidGanzhi(value) && <div className="error small">不是六十甲子裡的組合</div>}
        </div>
        <div className="fld"><label className="lbl" htmlFor="m-mo">月</label>
          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            <input id="m-mo" className="inp" type="number" min={1} max={12} value={value.birthMonth ?? ''} onChange={(e) => onChange(withBirthMonth(value, e.target.value))} />
            <button type="button" className="btn btn-sm" onClick={() => set({ birthMonth: null, birthMonthIsLeap: false })}>吉</button>
          </div>
          <label className="row small" style={{ gap: 6, minHeight: 36 }}><input type="checkbox" checked={!!value.birthMonthIsLeap} disabled={!value.birthMonth} onChange={(e) => set({ birthMonthIsLeap: e.target.checked })} style={{ width: 18, height: 18 }} />閏月</label>
        </div>
        <div className="fld"><label className="lbl" htmlFor="m-dy">日</label>
          <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
            <input id="m-dy" className="inp" type="number" min={1} max={30} value={value.birthDay ?? ''} onChange={(e) => set({ birthDay: e.target.value ? Number(e.target.value) : null })} />
            <button type="button" className="btn btn-sm" onClick={() => set({ birthDay: null })}>吉</button>
          </div>
        </div>
      </div>
      <div className="fld"><span className="lbl">時辰</span>
        <div className="row" style={{ gap: 6 }}>
          {BRANCHES.split('').map((b) => (
            <button key={b} type="button" className={`hour ${value.birthHourBranch === b ? 'hour-on' : ''}`} onClick={() => set({ birthHourBranch: b })}>{b}</button>
          ))}
          <button type="button" className={`hour ${!value.birthHourBranch ? 'hour-on' : ''}`} onClick={() => set({ birthHourBranch: null })}>吉</button>
        </div>
      </div>
    </div>
  )
}
