import type { MemberInput } from '../api/types'
import { GENDER } from '../lib/labels'
import BirthFields from './BirthFields'
import CityDistrictFields from './CityDistrictFields'

interface Props {
  value: MemberInput
  onChange: (next: MemberInput) => void
  householdCityDistrict?: string
  householdAddress?: string
}

export default function MemberFields({ value, onChange, householdCityDistrict, householdAddress }: Props) {
  const set = (patch: Partial<MemberInput>) => onChange({ ...value, ...patch })
  const inheritsFromHousehold = householdCityDistrict !== undefined
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="grid-2">
        <div className="fld"><label className="lbl" htmlFor="m-name">姓名</label><input id="m-name" className="inp" value={value.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div className="fld"><span className="lbl">性別</span>
          <div className="row" style={{ minHeight: 44, gap: 16 }}>
            {Object.entries(GENDER).map(([code, label]) => (
              <label key={code} className="row" style={{ gap: 6 }}><input type="radio" name="gender" checked={value.gender === code} onChange={() => set({ gender: code })} style={{ width: 18, height: 18 }} />{label}</label>
            ))}
            <label className="row" style={{ gap: 6 }}><input type="radio" name="gender" checked={!value.gender} onChange={() => set({ gender: null })} style={{ width: 18, height: 18 }} />未填</label>
          </div>
        </div>
      </div>

      <BirthFields value={value} onChange={onChange} />

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div><strong>聯絡與地址</strong>{inheritsFromHousehold && <span className="small muted" style={{ marginLeft: 8 }}>空白代表沿用戶的：{householdCityDistrict || '—'} {householdAddress ?? ''}</span>}</div>
        <div className="grid-3">
          <CityDistrictFields idPrefix="m" city={value.city} district={value.district} blankCityLabel={inheritsFromHousehold ? '（沿用戶）' : '（未填）'} onChange={set} />
          <div className="fld"><label className="lbl" htmlFor="m-phone">電話（選填）</label><input id="m-phone" className="inp" type="tel" value={value.phone ?? ''} onChange={(e) => set({ phone: e.target.value || null })} /></div>
        </div>
        <div className="fld"><label className="lbl" htmlFor="m-addr">地址（街路門牌）</label><input id="m-addr" className="inp" value={value.address ?? ''} onChange={(e) => set({ address: e.target.value || null })} /></div>
      </div>
    </div>
  )
}
