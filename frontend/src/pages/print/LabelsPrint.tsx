import { useEffect, useState } from 'react'
import { mailing as mailingApi } from '../../api'
import type { MailingView } from '../../api/types'
import { compareForMail, mailable, zipOf } from '../../lib/mailing'
import PdfButton from './PdfButton'
import './print.css'

const PER_PAGE = 18

export default function LabelsPrint() {
  const [rows, setRows] = useState<MailingView[] | null>(null)
  const [overseas, setOverseas] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    mailingApi.list()
      .then((all) => {
        setOverseas(all.filter((r) => r.active && r.overseas).length)
        setRows(all.filter(mailable).sort(compareForMail))
      })
      .catch((e) => setError(e instanceof Error ? e.message : '讀取名單失敗'))
  }, [])

  useEffect(() => {
    document.title = rows ? `帖子標籤 ${rows.length} 張` : '帖子標籤'
  }, [rows])

  if (error) return <div className="page error">{error}</div>
  if (!rows) return <div className="page muted">載入中…</div>
  const pages: MailingView[][] = []
  for (let i = 0; i < rows.length; i += PER_PAGE) pages.push(rows.slice(i, i + PER_PAGE))
  const noZip = rows.filter((r) => zipOf(r) === '').length

  return (
    <div className="print-root">
      <style>{'@page { size: A4 portrait; margin: 0; }'}</style>
      <div className="print-toolbar">
        <strong>帖子寄送標籤</strong>
        <span>{rows.length} 張 · {pages.length} 頁 · 依郵遞區號排序{noZip > 0 ? ` · ${noZip} 張沒有郵遞區號，排在最後` : ''}{overseas > 0 ? ` · ${overseas} 張國外地址不印` : ''}</span>
        <button type="button" className="btn btn-sm" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>列印</button>
        <PdfButton />
      </div>
      {pages.length === 0 && <div className="page muted">帖子名單裡沒有要寄送的收件人</div>}
      {pages.map((page, pi) => (
        <div key={pi} className={`sheet labels-sheet ${pi < pages.length - 1 ? 'sheet-break' : ''}`}>
          <div className="labels-grid">
            {page.map((r) => (
              <div key={r.id} className="label-cell">
                <div className="zip-addr"><span className="zip">{zipOf(r)}</span>{r.address}</div>
                <div className="name">{r.name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
