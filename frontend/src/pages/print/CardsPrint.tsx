import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { lightSelectionFrom, print as printApi } from '../../api'
import type { Cards } from '../../api/types'
import { printName } from '../../lib/names'
import { rocYear } from '../../lib/roc'
import MarkPrintedButton, { printedCardsOf } from './MarkPrintedButton'
import PdfButton from './PdfButton'
import './print.css'

const PER_PAGE = 21

export default function CardsPrint() {
  const [params] = useSearchParams()
  const [data, setData] = useState<Cards | null>(null)
  const [error, setError] = useState('')
  const unprintedOnly = params.get('unprinted') === 'true'

  useEffect(() => {
    const orderId = params.get('orderId')
    const householdId = params.get('householdId')
    const year = params.get('year') ? Number(params.get('year')) : undefined
    const sel = lightSelectionFrom(params)
    if (!orderId && !householdId && !sel) {
      setError('網址缺少燈種或分類')
      return
    }
    const req = orderId ? printApi.cardsByOrder(Number(orderId))
      : householdId ? printApi.cardsByHousehold(Number(householdId), year)
        : printApi.cardsByYear(sel!, year, unprintedOnly)
    req.then(setData).catch((e) => setError(e.message))
  }, [params, unprintedOnly])

  const orderId = params.get('orderId')
  const heading = data?.lightTypeName
    ?? (!data ? '' : data.householdNumber === null ? `單據 #${orderId} 新增` : `第 ${data.householdNumber} 戶${orderId ? ' 本單新增' : ''}`)
  useEffect(() => {
    document.title = data ? `安燈卡 ${heading}${unprintedOnly ? ' 未印' : ''} 民國${rocYear(data.year)}年` : '安燈卡'
  }, [data, heading, unprintedOnly])

  if (error) return <div className="page error">{error}</div>
  if (!data) return <div className="page muted">載入中…</div>
  const pages: Cards['cards'][] = []
  for (let i = 0; i < data.cards.length; i += PER_PAGE) pages.push(data.cards.slice(i, i + PER_PAGE))

  return (
    <div className="print-root">
      <style>{'@page { size: A4 portrait; margin: 10mm; }'}</style>
      <div className="print-toolbar">
        <strong>安燈卡</strong><span>{heading}{unprintedOnly ? ' · 還沒印過的' : ''} · 民國 {rocYear(data.year)} 年 · {data.cards.length} 張 · {pages.length} 頁</span>
        <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>列印</button>
        <PdfButton />
        <MarkPrintedButton cards={printedCardsOf(data.cards)} onError={(message) => window.alert(message)} />
      </div>
      {data.excludedCount > 0 && (
        <div className="print-notice">本單另有 {data.excludedCount} 盞燈未列入：已取消、成員已刪除，或後來被其他單據異動過。仍有效的燈請到該成員目前所在戶的戶頁按「印本戶安燈卡」補印。</div>
      )}
      {pages.length === 0 && <div className="page muted">{unprintedOnly ? '沒有還沒印過的卡片' : '沒有可印的卡片'}</div>}
      {pages.map((cards, pi) => (
        <div key={pi} className={`sheet cards-sheet ${pi < pages.length - 1 ? 'sheet-break' : ''}`}>
          <div className="cards-grid">
            {cards.map((c, i) => (
              <div key={i} className="card-cell">
                <div className="light">{c.shortName}{c.detail ? `　${c.detail}` : ''}</div>
                <div className="name">{printName(c.name)}</div>
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
