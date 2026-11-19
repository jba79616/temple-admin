import { useState } from 'react'
import { downloadPdf } from '../../lib/pdf'

export default function PdfButton() {
  const [busy, setBusy] = useState(false)

  async function click() {
    setBusy(true)
    try {
      await downloadPdf(window.location.pathname + window.location.search)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'PDF 轉檔失敗')
    } finally {
      setBusy(false)
    }
  }

  return <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={click}>{busy ? '轉檔中…' : '下載 PDF'}</button>
}
