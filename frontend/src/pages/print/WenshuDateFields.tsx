import type { CSSProperties } from 'react'
import ImeInput from '../../components/ImeInput'
import { DATE_PARTS, toDatePart, type LunarDate, type WenshuDates } from '../../lib/wenshu'

const DATE_FIELDS = [
  { key: 'ritual', label: '今涓' },
  { key: 'petition', label: '天運' },
] as const

const PART_LABELS = { year: '年', month: '月', day: '日' } as const

type Props = {
  dates: WenshuDates
  inputClassName: string
  inputStyle?: CSSProperties
  onChange: (key: keyof WenshuDates, part: keyof LunarDate, value: string) => void
}

/** 列印頁與文疏頁共用；值只留文字與數字，PDF 轉檔的網址才放得進去。 */
export default function WenshuDateFields({ dates, inputClassName, inputStyle, onChange }: Props) {
  return DATE_FIELDS.map((f) => (
    <span key={f.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {f.label}
      {DATE_PARTS.map((part) => (
        <label key={part} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <ImeInput className={inputClassName} style={{ width: '4.5em', paddingInline: 6, ...inputStyle }} value={dates[f.key][part]} normalize={toDatePart}
            onValue={(v) => onChange(f.key, part, v)} aria-label={`${f.label}${PART_LABELS[part]}`} />
          {PART_LABELS[part]}
        </label>
      ))}
    </span>
  ))
}
