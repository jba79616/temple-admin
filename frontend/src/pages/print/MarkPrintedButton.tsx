import { useState } from 'react'
import { print as printApi } from '../../api'
import type { Card, PrintedCard } from '../../api/types'

/** 印好才由人按，不在按「列印」時自動記：列印對話框取消、卡紙都分不出來，記錯就會漏印。 */
export function printedCardsOf(cards: Card[]): PrintedCard[] {
  return cards.flatMap((c) => (c.recordId === null ? [] : [{ recordId: c.recordId, orderItemId: c.orderItemId }]))
}

export default function MarkPrintedButton({ cards, onError }: { cards: PrintedCard[]; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [marked, setMarked] = useState<number | null>(null)

  if (marked !== null) return <span className="small">已標記 {marked} 張為已印</span>
  if (cards.length === 0) return null

  async function mark() {
    if (!window.confirm(`這 ${cards.length} 張都印好了嗎？標記後「只印還沒印過的」就不會再印。`)) return
    setBusy(true)
    try {
      setMarked((await printApi.markCardsPrinted(cards)).marked)
    } catch (e) {
      onError(e instanceof Error ? e.message : '標記失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="btn btn-sm" disabled={busy} onClick={mark}>
      {busy ? '標記中…' : `已印好，標記這 ${cards.length} 張`}
    </button>
  )
}
