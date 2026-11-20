import { usePdfDownload } from '../../lib/pdf'

export default function PdfButton() {
  const pdf = usePdfDownload((message) => window.alert(message))

  return (
    <button type="button" className="btn btn-sm btn-ghost" disabled={pdf.busy} onClick={() => pdf.download(window.location.pathname + window.location.search)}>
      {pdf.busy ? '轉檔中…' : '下載 PDF'}
    </button>
  )
}
