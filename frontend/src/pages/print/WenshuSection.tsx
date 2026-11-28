import { useEffect, useState, type ReactNode } from 'react'
import { households as householdsApi, print as printApi, wenshuQuery, type WenshuTarget } from '../../api'
import type { FormScope, HouseholdSummary, WenshuBatch } from '../../api/types'
import { useConfig } from '../../lib/config'
import { parseWholeNumber, wholeNumberError } from '../../lib/numbers'
import { ganzhiOfYear } from '../../lib/roc'
import { dateParamKey, householdRangeText, lunarDateOf, wenshuDateQuery, type LunarDate, type WenshuDates } from '../../lib/wenshu'
import WenshuDateFields from './WenshuDateFields'

type Scope = FormScope | 'HOUSEHOLD'

const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
  { value: 'BAGUA', label: '該年有安斗的戶' },
  { value: 'LIT', label: '該年有安燈的戶' },
  { value: 'ALL', label: '全部的戶' },
  { value: 'HOUSEHOLD', label: '輸入戶號印單戶' },
]

export function batchLabel(b: WenshuBatch) {
  return `${householdRangeText(b.fromNumber, b.toNumber)}（${b.households} 戶、${b.people} 張）`
}

type Lookup = { number: number; household?: HouseholdSummary; error?: string }

type Props = {
  yearOptions: ReactNode
  busy: boolean
  open: (path: string) => void
}

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

/**
 * 今涓、天運在這裡填，開文疏頁或直接轉 PDF 都帶進網址；文疏頁上方還能再改，只改那一頁，不會改回這裡。
 */
export default function WenshuSection({ yearOptions, busy, open }: Props) {
  const { currentYear, configs } = useConfig()
  const [year, setYear] = useState(currentYear)
  const [scope, setScope] = useState<Scope>('BAGUA')
  const [batches, setBatches] = useState<WenshuBatch[] | null>(null)
  const [batchError, setBatchError] = useState('')
  const [batchReload, setBatchReload] = useState(0)
  const [batchIndex, setBatchIndex] = useState(0)
  const [householdText, setHouseholdText] = useState('')
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [dateEdits, setDateEdits] = useState<Record<string, string>>({})
  const [today, setToday] = useState(() => lunarDateOf(new Date()))

  useEffect(() => chooseYear(currentYear), [currentYear])

  useEffect(() => {
    if (scope === 'HOUSEHOLD') return
    setBatches(null)
    setBatchError('')
    setBatchIndex(0)
    let cancelled = false
    printApi.wenshuBatches(scope, year)
      .then((b) => !cancelled && setBatches(b))
      .catch((e) => !cancelled && setBatchError(errorText(e, '讀取文疏批次失敗')))
    return () => {
      cancelled = true
    }
  }, [scope, year, batchReload])

  const householdNumber = parseWholeNumber(householdText) || null
  useEffect(() => {
    if (scope !== 'HOUSEHOLD' || householdNumber === null) return
    let cancelled = false
    const timer = setTimeout(() => {
      householdsApi.byNumber(householdNumber)
        .then((household) => !cancelled && setLookup({ number: householdNumber, household }))
        .catch((e) => !cancelled && setLookup({ number: householdNumber, error: errorText(e, '查詢戶號失敗') }))
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [scope, householdNumber])

  /** 列印頁常開著不關，回到這個分頁時重算今天，免得今涓停在打開頁面那天。 */
  useEffect(() => {
    const refresh = () => document.visibilityState === 'visible' && setToday(lunarDateOf(new Date()))
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  const prayerMonth = configs.find((c) => c.key === 'prayer_month')?.value ?? ''
  function datesOn(day: LunarDate): WenshuDates {
    const defaults: WenshuDates = { ritual: day, petition: { year: ganzhiOfYear(year), month: prayerMonth, day: '' } }
    const dateOf = (key: keyof WenshuDates): LunarDate => {
      const pick = (part: keyof LunarDate) => dateEdits[dateParamKey(key, part)] ?? defaults[key][part]
      return { year: pick('year'), month: pick('month'), day: pick('day') }
    }
    return { ritual: dateOf('ritual'), petition: dateOf('petition') }
  }

  /** 天運年預設是所選年度的干支，換年度時丟掉手改的天運年，免得印成別年。 */
  function chooseYear(next: number) {
    setYear(next)
    setDateEdits((cur) => {
      const edits = { ...cur }
      delete edits[dateParamKey('petition', 'year')]
      return edits
    })
  }

  const found = lookup && lookup.number === householdNumber ? lookup : null
  const household = found?.household?.memberCount ? found.household : null
  const batch = batches?.[batchIndex]
  const target: WenshuTarget | null = scope === 'HOUSEHOLD'
    ? (household ? { householdId: household.id, year } : null)
    : (batch ? { scope, year, from: batch.fromNumber, to: batch.toNumber } : null)

  function householdStatus() {
    if (householdText.trim() === '') return '輸入戶號後會顯示戶長，確認再印。'
    const malformed = wholeNumberError(householdText, '戶號')
    if (malformed) return malformed
    if (householdNumber === null) return '戶號從 1 開始'
    if (!found) return '查詢中…'
    if (found.error) return found.error
    const h = found.household!
    const head = `第 ${h.householdNumber} 戶，戶長 ${h.headName ?? '（未設定）'}`
    return h.memberCount ? `${head}，在籍 ${h.memberCount} 人` : `${head}，沒有在籍成員，不用印`
  }

  function print() {
    if (!target) return
    const now = lunarDateOf(new Date())
    setToday(now)
    open(`/print/wenshu?${wenshuQuery(target)}&${wenshuDateQuery(datesOn(now))}`)
  }

  return (
    <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h2>制星補運文疏</h2>
      <div className="small muted">選到的戶整戶在籍成員都印，一人一張，戶長排第一；不只該年點燈或安斗的那位。戶多時依戶號分批，一次預覽或轉 PDF 一批。</div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <label className="fld small muted">年度
          <select className="inp" value={year} onChange={(e) => chooseYear(Number(e.target.value))}>{yearOptions}</select>
        </label>
        <label className="fld small muted">範圍
          <select className="inp" value={scope} onChange={(e) => setScope(e.target.value as Scope)}>
            {SCOPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        {scope === 'HOUSEHOLD' ? (
          <label className="fld small muted">戶號
            <input className="inp" inputMode="numeric" style={{ width: '7em' }} value={householdText} onChange={(e) => setHouseholdText(e.target.value)} />
          </label>
        ) : (
          <label className="fld small muted">批次
            <select className="inp" value={batchIndex} disabled={!batches?.length} onChange={(e) => setBatchIndex(Number(e.target.value))}>
              {batchError ? <option>讀不到批次</option> : !batches && <option>載入中…</option>}
              {batches?.length === 0 && <option>這個範圍沒有要印的戶</option>}
              {batches?.map((b, i) => <option key={b.fromNumber} value={i}>{batchLabel(b)}</option>)}
            </select>
          </label>
        )}
        <button type="button" className="btn" disabled={busy || !target} onClick={print}>印文疏</button>
      </div>
      {scope === 'HOUSEHOLD' && <div className="small muted" role="status">{householdStatus()}</div>}
      {scope !== 'HOUSEHOLD' && batchError && (
        <div className="row small" role="alert">
          <span className="error">{batchError}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setBatchReload((n) => n + 1)}>重試</button>
        </div>
      )}
      <div className="row" style={{ gap: 16, fontSize: 14 }}>
        <WenshuDateFields dates={datesOn(today)} inputClassName="inp"
          onChange={(key, part, value) => setDateEdits((cur) => ({ ...cur, [dateParamKey(key, part)]: value }))} />
      </div>
      <div className="small muted">
        今涓預設今天的農曆，天運預設所選年度的干支與祈福文月份。勾「下載 PDF」會直接照這裡的日期轉檔；沒勾就開列印頁，上方還能再改，只改那一頁。
      </div>
    </section>
  )
}
