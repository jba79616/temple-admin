import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { print as printApi } from '../../api'
import type { ApplicationForm, BaguaType, FormHousehold, FormPerson, FormScope } from '../../api/types'
import { rocYear } from '../../lib/roc'
import './print.css'
import './form.css'

const ROWS_PER_PAGE: Record<FormScope, number> = { ALL: 22, LIT: 22, BAGUA: 21 }
const SCOPE_LABEL: Record<FormScope, string> = { ALL: '全部的人', LIT: '該年有安燈的人', BAGUA: '該年有安斗的人' }
const GENDER: Record<string, string> = { M: '男', F: '女' }

interface Xs { g: number; y: number; yl: number; leap: number; m: number; mw: number; ml: number; d: number; dl: number; h: number; hl: number }
const X_GENERAL: Xs = { g: 58.6, y: 72.5, yl: 86.4, leap: 96.3, m: 103.2, mw: 7.2, ml: 110.9, d: 118.2, dl: 125.2, h: 131.8, hl: 139.0 }
const X_BAGUA: Xs = { g: 57.5, y: 70.9, yl: 84.8, leap: 92.3, m: 99.3, mw: 6.9, ml: 106.4, d: 113.6, dl: 120.7, h: 127.2, hl: 134.4 }

interface Sheet { household: FormHousehold; people: FormPerson[] }

function El({ l, t, w, h, pt = 20, cls = '', children }: { l: number; t: number; w: number; h: number; pt?: number; cls?: string; children?: ReactNode }) {
  return <div className={`fel ${cls}`} style={{ left: `${l}mm`, top: `${t}mm`, width: `${w}mm`, height: `${h}mm`, fontSize: `${pt}pt`, lineHeight: `${h}mm` }}>{children}</div>
}

function Box({ l, t, w, h }: { l: number; t: number; w: number; h: number }) {
  return <div className="fbox" style={{ left: `${l}mm`, top: `${t}mm`, width: `${w}mm`, height: `${h}mm` }} />
}

function Line({ l, t, w }: { l: number; t: number; w: number }) {
  return <div className="fline" style={{ left: `${l}mm`, top: `${t}mm`, width: `${w}mm` }} />
}

function Band({ h, children }: { h: number; children: ReactNode }) {
  return <div className="fband" style={{ height: `${h}mm` }}>{children}</div>
}

function Legend({ types }: { types: BaguaType[] }) {
  return (
    <div className="flegend" style={{ left: '36.7mm', top: '8.5mm', width: '111.5mm', height: '29.8mm', gridTemplateColumns: `repeat(${Math.max(types.length, 1)}, 1fr)` }}>
      {types.map((t, i) => <div key={t.code ?? i}><span className="n">{t.code ?? String(i + 1).padStart(2, '0')}</span><span className="t">{t.name}</span></div>)}
    </div>
  )
}

function Birth({ p, x }: { p: FormPerson; x: Xs }) {
  return (
    <>
      <El l={27.7} t={0.3} w={28.9} h={8.5}>{p.name}</El>
      <El l={x.g} t={0.2} w={9.2} h={8.5}>{GENDER[p.gender ?? ''] ?? ''}</El>
      <El l={x.y} t={0.2} w={13.4} h={8.5}>{p.ganzhi ?? '吉'}</El>
      <El l={x.yl} t={0.2} w={7.1} h={8.5}>年</El>
      <El l={x.leap} t={0.2} w={6.9} h={8.5}>{p.leap ? '閏' : ''}</El>
      <El l={x.m} t={0.2} w={x.mw} h={8.5} cls="r">{p.month ?? '吉'}</El>
      <El l={x.ml} t={0} w={7.1} h={8.5}>月</El>
      <El l={x.d} t={0.2} w={6.9} h={8.5} cls="r">{p.day ?? '吉'}</El>
      <El l={x.dl} t={0} w={7.1} h={8.5}>日</El>
      <El l={x.h} t={0} w={7.4} h={8.5}>{p.hour ?? '吉'}</El>
      <El l={x.hl} t={0} w={14.3} h={8.5}>時生</El>
    </>
  )
}

function FormSheet({ data, sheet, page, pages }: { data: ApplicationForm; sheet: Sheet; page: number; pages: number }) {
  const bagua = data.scope === 'BAGUA'
  const h = sheet.household
  return (
    <div className={`sheet form-sheet ${page < pages ? 'sheet-break' : ''}`}>
      <Band h={bagua ? 37.0 : 8.5}>
        <El l={0} t={0} w={203.2} h={8.5} cls="c">{data.templeName}{data.title}</El>
        {bagua && <Legend types={data.baguaTypes} />}
      </Band>
      <Band h={10.8}>
        <El l={0.9} t={1.6} w={15.2} h={7.6} pt={18} cls="b i">戶號</El>
        <El l={17.1} t={1.6} w={14.8} h={7.6} pt={18} cls="i">{h.householdNumber}</El>
      </Band>
      <Band h={7.9}>
        <El l={9.7} t={1.1} w={13.4} h={6.7} pt={16} cls="b">斗首</El>
        <El l={25.0} t={1.1} w={67.7} h={6.7} pt={16}>{h.headName ?? ''}</El>
        <Line l={9.7} t={7.1} w={168.3} />
      </Band>
      <Band h={16.8}>
        <El l={13.2} t={0.4} w={10.6} h={6.0} pt={14} cls="b">住址</El>
        <El l={25.0} t={0.4} w={150.3} h={6.0} pt={14}>{h.address}</El>
        <Line l={13.8} t={5.8} w={164.2} />
        <El l={27.7} t={11.6} w={10.1} h={5.9} pt={14} cls="b">姓名</El>
        <El l={bagua ? 57.5 : 58.6} t={11.6} w={10.1} h={5.9} pt={14} cls="b">性別</El>
        <El l={bagua ? 71.8 : 73.4} t={11.6} w={10.1} h={5.9} pt={14} cls="b">生辰</El>
        {!bagua && ['光明', '文昌', '太歲'].map((name, i) => (
          <span key={name}>
            <El l={2.5 + i * 8.8} t={6.9} w={5.0} h={5.9} pt={14} cls="b">{name[0]}</El>
            <El l={2.5 + i * 8.8} t={11.6} w={5.0} h={5.9} pt={14} cls="b">{name[1]}</El>
          </span>
        ))}
      </Band>
      {sheet.people.map((p, i) => (
        <Band key={i} h={bagua ? 8.6 : 9.5}>
          {bagua
            ? <Box l={1.1} t={0.2} w={25.6} h={7.8} />
            : <><Box l={0.9} t={0.3} w={8.1} h={7.8} /><Box l={9.7} t={0.3} w={8.1} h={7.8} /><Box l={18.3} t={0.3} w={8.1} h={7.8} /></>}
          <Birth p={p} x={bagua ? X_BAGUA : X_GENERAL} />
        </Band>
      ))}
      <div className="ffoot">
        <El l={95.2} t={2.6} w={12.5} h={6.0} pt={14} cls="c">{page} of {pages}</El>
        <El l={152.9} t={0} w={37.5} h={5.9} pt={14}>計　　　　　元</El>
      </div>
    </div>
  )
}

function paginate(data: ApplicationForm): Sheet[] {
  const per = ROWS_PER_PAGE[data.scope]
  const sheets: Sheet[] = []
  for (const household of data.households) {
    if (household.people.length === 0) continue
    for (let i = 0; i < household.people.length; i += per) sheets.push({ household, people: household.people.slice(i, i + per) })
  }
  return sheets
}

export default function ApplicationFormPrint() {
  const [params] = useSearchParams()
  const [data, setData] = useState<ApplicationForm | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const scope = (params.get('scope') ?? 'LIT') as FormScope
    const year = params.get('year')
    printApi.applicationForm(scope, year ? Number(year) : undefined).then(setData).catch((e) => setError(e.message))
  }, [params])

  useEffect(() => {
    document.title = data ? `${data.title} 民國${data.rocYear}年` : '申報單'
  }, [data])

  if (error) return <div className="page error">{error}</div>
  if (!data) return <div className="page muted">載入中…</div>
  const sheets = paginate(data)

  return (
    <div className="print-root form-root">
      <style>{'@page { size: 215.9mm 279.4mm; margin: 6.35mm; }'}</style>
      <div className="print-toolbar">
        <strong>{data.title}</strong><span>民國 {rocYear(data.year)} 年 {SCOPE_LABEL[data.scope]} · {data.households.length} 戶 · {sheets.length} 頁</span>
        <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>列印</button>
      </div>
      {sheets.length === 0 && <div className="page muted">沒有資料</div>}
      {sheets.map((s, i) => <FormSheet key={i} data={data} sheet={s} page={i + 1} pages={sheets.length} />)}
    </div>
  )
}
