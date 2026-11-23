import { useState } from 'react'
import { errorOf } from '../api/client'

export function usePdfDownload(onError: (message: string) => void) {
  const [busy, setBusy] = useState(false)

  async function download(printPath: string): Promise<boolean> {
    if (busy) return false
    setBusy(true)
    try {
      await downloadPdf(printPath)
      return true
    } catch (e) {
      onError(e instanceof Error ? e.message : 'PDF 轉檔失敗')
      return false
    } finally {
      setBusy(false)
    }
  }

  return { busy, download }
}

/** 請伺服器把列印頁轉成 PDF 後直接下載；檔名用後端給的 Content-Disposition。 */
export async function downloadPdf(printPath: string): Promise<void> {
  const url = `/api/print/pdf?path=${encodeURIComponent(printPath)}`
  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) throw await errorOf(res, url)
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filenameOf(res.headers.get('Content-Disposition')) ?? 'print.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 60_000)
}

function filenameOf(disposition: string | null): string | undefined {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1])
    } catch {
      // 檔名編碼異常就落到預設檔名
    }
  }
  return disposition?.match(/filename="?([^";]+)"?/i)?.[1]
}
