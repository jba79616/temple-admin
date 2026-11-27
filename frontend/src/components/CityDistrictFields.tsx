import { CITIES, districtsOf, postalCodeHint } from '../lib/taiwan'

export default function CityDistrictFields({ idPrefix, city, district, blankCityLabel, onChange }: {
  idPrefix: string
  city: string | null | undefined
  district: string | null | undefined
  blankCityLabel: string
  onChange: (patch: { city?: string | null; district: string | null }) => void
}) {
  return (
    <>
      <div className="fld"><label className="lbl" htmlFor={`${idPrefix}-city`}>縣市</label>
        <select id={`${idPrefix}-city`} className="inp" value={city ?? ''} onChange={(e) => onChange({ city: e.target.value || null, district: null })}>
          <option value="">{blankCityLabel}</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="fld"><label className="lbl" htmlFor={`${idPrefix}-dist`}>鄉鎮市區</label>
        <input id={`${idPrefix}-dist`} className="inp" list={`${idPrefix}-distlist`} value={district ?? ''} disabled={!city} onChange={(e) => onChange({ district: e.target.value || null })} />
        <datalist id={`${idPrefix}-distlist`}>{districtsOf(city).map((d) => <option key={d} value={d} />)}</datalist>
        {district && <span className="small muted">{postalCodeHint(city, district)}</span>}
      </div>
    </>
  )
}
