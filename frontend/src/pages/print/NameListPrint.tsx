import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { lightSelectionFrom, print as printApi } from '../../api'
import type { HouseholdGroup, NameList, PersonRow } from '../../api/types'
import { printName } from '../../lib/names'
import { rocYear } from '../../lib/roc'
import PdfButton from './PdfButton'
import './print.css'

/** 照廟方疏文範本（文昌燈疏文.pdf）：A4 橫印、一戶一張，座標與字級都量自範本，單位 mm 與 pt。 */
const ROWS_PER_PAGE = 10
const ROW_PITCH = 13.8
const FIRST_ROW_BASELINE = 44.8
const PT = 25.4 / 72
/** Temple Kai 在 line-height: 1 時，基線距字框頂端 0.836em（hhea ascent 928、descent 256）。 */
const BASELINE_RATIO = 0.836
/** 生庚欄在姓名起點右邊 27mm，16pt 只放得下 4 個字；公司行號這類長名改小字折兩行。 */
const LONG_NAME = 4

function At({ x, baseline, size, className, children }: { x: number; baseline: number; size: number; className?: string; children: ReactNode }) {
  return (
    <span className={className} style={{ position: 'absolute', left: `${x}mm`, top: `${baseline - BASELINE_RATIO * size * PT}mm`, fontSize: `${size}pt` }}>
      {children}
    </span>
  )
}

function Row({ r, baseline }: { r: PersonRow; baseline: number }) {
  const name = printName(r.name)
  return (
    <>
      {Array.from(name).length > LONG_NAME
        ? <At x={34} baseline={baseline} size={11} className="shuwen-long-name">{name}</At>
        : <At x={34} baseline={baseline} size={16}>{name}</At>}
      <At x={61} baseline={baseline} size={16}>{r.birthYear}</At>
      <At x={75.5} baseline={baseline} size={16}>年</At>
      <At x={85.5} baseline={baseline} size={16} className="shuwen-num">{r.birthMonth}</At>
      <At x={98} baseline={baseline} size={16}>月</At>
      <At x={100.9} baseline={baseline} size={16} className="shuwen-num">{r.birthDay}</At>
      <At x={112.9} baseline={baseline} size={16}>日</At>
      <At x={119.9} baseline={baseline} size={16}>{r.birthHour}</At>
      <At x={127.1} baseline={baseline} size={16}>時生</At>
      <At x={147.5} baseline={baseline} size={16} className="shuwen-addr">{r.address}</At>
    </>
  )
}

function Page({ data, group, rows }: { data: NameList; group: HouseholdGroup; rows: PersonRow[] }) {
  return (
    <>
      <div className="shuwen-title" style={{ top: `${17.4 - BASELINE_RATIO * 26 * PT}mm` }}>{data.title.replace(/\s/g, '')}</div>
      <At x={20} baseline={31.3} size={16} className="shuwen-household">{group.householdNumber}</At>
      <At x={33.7} baseline={35.7} size={14} className="bold">姓名</At>
      <At x={64.1} baseline={35.7} size={14} className="bold">生庚</At>
      <At x={147.5} baseline={35.7} size={14} className="bold">住址</At>
      <div className="shuwen-rule" />
      {rows.map((r, i) => <Row key={i} r={r} baseline={FIRST_ROW_BASELINE + i * ROW_PITCH} />)}
      <At x={77.9} baseline={188.4} size={12} className="bold">恭</At>
      <At x={88.5} baseline={188.4} size={12} className="bold">此</At>
      <At x={99.1} baseline={188.4} size={12} className="bold">以</At>
      <At x={36} baseline={192.4} size={12} className="bold">聞</At>
      <At x={44} baseline={198.4} size={12} className="bold">天</At>
      <At x={52.5} baseline={198.4} size={12} className="bold">運</At>
      <At x={86.3} baseline={198.4} size={12} className="bold">{data.ganzhiYear}</At>
      <At x={103.3} baseline={198.4} size={12} className="bold">年</At>
      <At x={122.3} baseline={198.4} size={12} className="bold">{data.prayerMonth}</At>
      <At x={141.4} baseline={198.4} size={12} className="bold">月</At>
      <At x={179.5} baseline={198.4} size={12} className="bold">日</At>
      <At x={187.9} baseline={198.4} size={12} className="bold shuwen-spaced">證明百拜上申</At>
    </>
  )
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export default function NameListPrint() {
  const [params] = useSearchParams()
  const [data, setData] = useState<NameList | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const year = params.get('year')
    const sel = lightSelectionFrom(params)
    if (!sel) {
      setError('網址缺少燈種或分類')
      return
    }
    printApi.nameList(sel, year ? Number(year) : undefined).then(setData).catch((e) => setError(e.message))
  }, [params])

  useEffect(() => {
    document.title = data ? `${data.lightTypeName}疏文 民國${data.rocYear}年` : '疏文'
  }, [data])

  if (error) return <div className="page error">{error}</div>
  if (!data) return <div className="page muted">載入中…</div>
  const total = data.groups.reduce((s, g) => s + g.rows.length, 0)
  const pages = data.groups.flatMap((g) => chunk(g.rows, ROWS_PER_PAGE).map((rows) => ({ group: g, rows })))

  return (
    <div className="print-root">
      <style>{'@page { size: A4 landscape; margin: 0; }'}</style>
      <div className="print-toolbar">
        <strong>{data.lightTypeName}疏文</strong><span>民國 {rocYear(data.year)} 年 {data.ganzhiYear} · {total} 人 · {data.groups.length} 戶 · {pages.length} 張</span>
        <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>列印</button>
        <PdfButton />
      </div>
      {pages.map((p, i) => (
        <div key={i} className={`sheet shuwen-sheet${i < pages.length - 1 ? ' sheet-break' : ''}`}>
          <Page data={data} group={p.group} rows={p.rows} />
        </div>
      ))}
      {pages.length === 0 && <div className="page muted">這一年沒有人點這種燈</div>}
    </div>
  )
}
