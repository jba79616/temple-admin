import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { lightSelectionFrom, print as printApi } from '../../api'
import type { NameList } from '../../api/types'
import { printName } from '../../lib/names'
import { rocYear } from '../../lib/roc'
import PdfButton from './PdfButton'
import './print.css'

export default function NameListPrint() {
  const [params] = useSearchParams()
  const [data, setData] = useState<NameList | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const year = params.get('year')
    const all = params.get('all') === 'true'
    const sel = lightSelectionFrom(params)
    if (!sel) {
      setError('網址缺少燈種或分類')
      return
    }
    printApi.nameList(sel, year ? Number(year) : undefined, all).then(setData).catch((e) => setError(e.message))
  }, [params])

  useEffect(() => {
    document.title = data ? `${data.title} 民國${data.rocYear}年` : '頌經名冊'
  }, [data])

  if (error) return <div className="page error">{error}</div>
  if (!data) return <div className="page muted">載入中…</div>
  const total = data.groups.reduce((s, g) => s + g.rows.length, 0)
  const prayer = (
    <div className="prayer">
      <div>恭 此 以</div>
      <div>聞　天運　　{data.ganzhiYear} 年　{data.prayerMonth} 月　　日　證明百拜上申</div>
    </div>
  )

  return (
    <div className="print-root">
      <style>{'@page { size: letter landscape; margin: 12mm; }'}</style>
      <div className="print-toolbar">
        <strong>{data.title}</strong><span>民國 {rocYear(data.year)} 年 {data.ganzhiYear} · {data.all ? '全部信眾' : '該年有安的人'} · {total} 人 · {data.groups.length} 戶</span>
        <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>列印</button>
        <PdfButton />
      </div>
      <div className="sheet list-sheet">
        <div className="list-title">{data.title.split('').join(' ')}</div>
        <table className="list-table">
          <thead><tr><th style={{ width: '18%' }}>姓名</th><th style={{ width: '12%' }}>生庚</th><th style={{ width: '28%' }}></th><th>住址</th></tr></thead>
          {data.groups.map((g, gi) => (
            <tbody key={g.householdNumber} className="household-group">
              <tr className="group-head"><td colSpan={4}>戶 {g.householdNumber}{g.headName ? `　${g.headName}` : ''}</td></tr>
              {g.rows.map((r, i) => {
                const [year, ...rest] = r.birthText.split(' ')
                return (
                  <tr key={i}><td>{printName(r.name)}</td><td>{year}</td><td>{rest.join(' ')}</td><td>{r.address}</td></tr>
                )
              })}
              {gi === data.groups.length - 1 && <tr className="prayer-row"><td colSpan={4}>{prayer}</td></tr>}
            </tbody>
          ))}
        </table>
        {total === 0 && <div className="muted" style={{ padding: 24, textAlign: 'center' }}>沒有資料</div>}
        {data.groups.length === 0 && prayer}
      </div>
    </div>
  )
}
