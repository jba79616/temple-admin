import type { MemberInput } from '../api/types'
import { BRANCHES, GANZHI_LIST, isValidGanzhi } from '../lib/roc'
import { CITIES, DISTRICTS } from '../lib/taiwan'

interface Props {
  value: MemberInput
  onChange: (next: MemberInput) => void
  householdCityDistrict?: string
  householdAddress?: string
}

export default function MemberFields({ value, onChange, householdCityDistrict, householdAddress }: Props) {
  const set = (patch: Partial<MemberInput>) => onChange({ ...value, ...patch })
  const ganzhiBad = !!value.birthGanzhi && !isValidGanzhi(value.birthGanzhi)
  const districts = value.city ? DISTRICTS[value.city] ?? [] : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="grid-2">
        <div className="fld"><label className="lbl" htmlFor="m-name">姓名</label><input id="m-name" className="inp" value={value.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div className="fld"><span className="lbl">性別</span>
          <div className="row" style={{ minHeight: 44, gap: 16 }}>
            <label className="row" style={{ gap: 6 }}><input type="radio" name="gender" checked={value.gender === 'M'} onChange={() => set({ gender: 'M' })} style={{ width: 18, height: 18 }} />男</label>
            <label className="row" style={{ gap: 6 }}><input type="radio" name="gender" checked={value.gender === 'F'} onChange={() => set({ gender: 'F' })} style={{ width: 18, height: 18 }} />女</label>
            <label className="row" style={{ gap: 6 }}><input type="radio" name="gender" checked={!value.gender} onChange={() => set({ gender: null })} style={{ width: 18, height: 18 }} />未填</label>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <strong>生辰（農曆）</strong>
        <div className="grid-3">
          <div className="fld"><label className="lbl" htmlFor="m-gz">干支年</label>
            <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
              <input id="m-gz" className="inp" list="gzlist" value={value.birthGanzhi ?? ''} placeholder="打一個字自動補全" onChange={(e) => set({ birthGanzhi: e.target.value.trim() || null })} />
              <button type="button" className="btn btn-sm" onClick={() => set({ birthGanzhi: null })}>吉</button>
            </div>
            <datalist id="gzlist">{GANZHI_LIST.map((g) => <option key={g} value={g} />)}</datalist>
            {ganzhiBad && <div className="error small">不是六十甲子裡的組合</div>}
          </div>
          <div className="fld"><label className="lbl" htmlFor="m-mo">月</label>
            <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
              <input id="m-mo" className="inp" type="number" min={1} max={12} value={value.birthMonth ?? ''} onChange={(e) => set({ birthMonth: e.target.value ? Number(e.target.value) : null, birthMonthIsLeap: e.target.value ? value.birthMonthIsLeap : false })} />
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

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div><strong>聯絡與地址</strong>{householdCityDistrict !== undefined && <span className="small muted" style={{ marginLeft: 8 }}>空白代表沿用戶的：{householdCityDistrict || '—'} {householdAddress ?? ''}</span>}</div>
        <div className="grid-3">
          <div className="fld"><label className="lbl" htmlFor="m-city">縣市</label>
            <select id="m-city" className="inp" value={value.city ?? ''} onChange={(e) => set({ city: e.target.value || null, district: null })}>
              <option value="">{householdCityDistrict !== undefined ? '（沿用戶）' : '（未填）'}</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="fld"><label className="lbl" htmlFor="m-dist">鄉鎮市區</label>
            <input id="m-dist" className="inp" list="distlist" value={value.district ?? ''} disabled={!value.city} onChange={(e) => set({ district: e.target.value || null })} />
            <datalist id="distlist">{districts.map((d) => <option key={d} value={d} />)}</datalist>
          </div>
          <div className="fld"><label className="lbl" htmlFor="m-phone">電話（選填）</label><input id="m-phone" className="inp" type="tel" value={value.phone ?? ''} onChange={(e) => set({ phone: e.target.value || null })} /></div>
        </div>
        <div className="fld"><label className="lbl" htmlFor="m-addr">地址（街路門牌）</label><input id="m-addr" className="inp" value={value.address ?? ''} onChange={(e) => set({ address: e.target.value || null })} /></div>
      </div>
    </div>
  )
}
