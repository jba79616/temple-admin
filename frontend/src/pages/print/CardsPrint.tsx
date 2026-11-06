import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { print as printApi } from '../../api'
import type { Cards } from '../../api/types'
import { rocYear } from '../../lib/roc'
import './print.css'

const PER_PAGE = 21

export default function CardsPrint() {
  const [params] = useSearchParams()
  const [data, setData] = useState<Cards | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const orderId = params.get('orderId')
    const lightTypeId = params.get('lightTypeId')
    const year = params.get('year')
    const req = orderId ? printApi.cardsByOrder(Number(orderId)) : printApi.cardsByYear(Number(lightTypeId), year ? Number(year) : undefined)
    req.then(setData).catch((e) => setError(e.message))
  }, [params])

  useEffect(() => {
    document.title = data ? `安燈卡 ${data.lightTypeName ?? ''} 民國${rocYear(data.year)}年` : '安燈卡'
  }, [data])

  if (error) return <div className="page error">{error}</div>
  if (!data) return <div className="page muted">載入中…</div>
  const pages: Cards['cards'][] = []
  for (let i = 0; i < data.cards.length; i += PER_PAGE) pages.push(data.cards.slice(i, i + PER_PAGE))

  return (
    <div className="print-root">
      <style>{'@page { size: A4 portrait; margin: 10mm; }'}</style>
      <div className="print-toolbar">
        <strong>安燈卡</strong><span>{data.lightTypeName ?? '本單新增'} · 民國 {rocYear(data.year)} 年 · {data.cards.length} 張 · {pages.length} 頁</span>
        <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>列印</button>
      </div>
      {pages.length === 0 && <div className="page muted">沒有可印的卡片</div>}
      {pages.map((cards, pi) => (
        <div key={pi} className={`sheet cards-sheet ${pi < pages.length - 1 ? 'sheet-break' : ''}`}>
          <div className="cards-grid">
            {cards.map((c, i) => (
              <div key={i} className="card-cell">
                <div className="light">{c.shortName}</div>
                <div className="name">{c.name}</div>
                <div className="addr">{c.cityDistrict}</div>
                <div className="addr">{c.address}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
