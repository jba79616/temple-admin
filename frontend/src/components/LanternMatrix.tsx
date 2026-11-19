import type { KeyboardEvent, ReactNode } from 'react'
import type { LightType, MemberView } from '../api/types'
import { money } from '../lib/roc'
import { genderLabel } from '../lib/labels'

export type CellStatus = 'none' | 'existing' | 'add' | 'remove'
export type Cells = Record<string, CellStatus>

export const cellKey = (memberId: number, lightTypeId: number) => `${memberId}:${lightTypeId}`

export const statusOf = (cells: Cells, memberId: number, lightTypeId: number): CellStatus => cells[cellKey(memberId, lightTypeId)] ?? 'none'

export function visibleLightTypes(lightTypes: LightType[], members: MemberView[], cells: Cells): LightType[] {
  return lightTypes.filter((t) => t.active || members.some((m) => statusOf(cells, m.id, t.id) !== 'none'))
}

export function nextStatus(current: CellStatus): CellStatus {
  switch (current) {
    case 'none': return 'add'
    case 'add': return 'none'
    case 'existing': return 'remove'
    case 'remove': return 'existing'
  }
}

interface Props {
  members: MemberView[]
  lightTypes: LightType[]
  cells: Cells
  onToggle: (memberId: number, lightTypeId: number) => void
  showPrice: boolean
  showBagua: boolean
  showGeneral?: boolean
  renderActions?: (member: MemberView) => ReactNode
  footer?: ReactNode
}

const STATUS_TITLE: Record<CellStatus, string> = { none: '未安', existing: '已安', add: '本次新增', remove: '本次取消' }
const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

/** 左右在同一位成員的燈種間移動，上下換成員、停在同一個燈種（該成員沒那顆就落到第一顆）。 */
function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  const chip = e.target as HTMLElement
  if (!ARROWS.includes(e.key) || !chip.matches('button.chip')) return
  const row = chip.closest('.mrow')
  if (!row) return
  let next: Element | null | undefined
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const chips = Array.from(row.querySelectorAll('button.chip:not([disabled])'))
    next = chips[chips.indexOf(chip) + (e.key === 'ArrowRight' ? 1 : -1)]
  } else {
    const step = e.key === 'ArrowDown' ? 1 : -1
    const rows = Array.from(e.currentTarget.querySelectorAll(':scope > .mrow'))
    for (let i = rows.indexOf(row) + step; i >= 0 && i < rows.length && !next; i += step) {
      next = rows[i].querySelector(`button.chip[data-col="${chip.dataset.col}"]:not([disabled])`) ?? rows[i].querySelector('button.chip:not([disabled])')
    }
  }
  if (next instanceof HTMLElement) {
    e.preventDefault()
    next.focus()
  }
}

export default function LanternMatrix({ members, lightTypes, cells, onToggle, showPrice, showBagua, showGeneral = true, renderActions, footer }: Props) {
  const status = (m: MemberView, t: LightType): CellStatus => statusOf(cells, m.id, t.id)
  const general = lightTypes.filter((t) => t.category === 'GENERAL')
  const bagua = lightTypes.filter((t) => t.category === 'BAGUA')
  const title = (t: LightType, st: CellStatus) => (t.active ? STATUS_TITLE[st] : `${STATUS_TITLE[st]}（燈種已停用，不能新安）`)
  const priceOf = (t: LightType) => (showPrice ? money(t.price) : '')

  return (
    <div onKeyDown={moveFocus}>
      {members.map((m) => {
        const picked = bagua.filter((t) => ['existing', 'add'].includes(status(m, t))).length
        return (
          <div key={m.id} className={`mrow ${m.taisui ? 'mrow-taisui' : ''}`}>
            <div className="mline">
              <div className="namecell">
                <div className="row" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</span>
                  {m.head && <span className="tag">戶長</span>}
                  {m.taisui && <span className="tag tag-ts">{m.taisui}</span>}
                </div>
                <div className="small muted" style={{ fontSize: 12 }}>
                  {genderLabel(m.gender)} · {m.zodiac ?? '生辰待補'} · {m.birthText}
                </div>
              </div>
              {showGeneral && <div className="lights">
                {general.map((t) => {
                  const st = status(m, t)
                  const hint = st === 'none' && t.taisui && !!m.taisui
                  const cls = st === 'none' ? (hint ? 'chip-hint' : '') : `chip-${st}`
                  return (
                    <button key={t.id} type="button" className={`chip chip-lg ${cls}`} data-col={t.id} aria-pressed={st === 'existing' || st === 'add'}
                      aria-label={`${m.name} ${t.name}`} title={title(t, st)} disabled={st === 'none' && !t.active} onClick={() => onToggle(m.id, t.id)}>
                      <span>{t.name}</span>
                      <span className="chip-sub">{[hint ? '建議' : '', priceOf(t)].filter(Boolean).join(' ')}</span>
                    </button>
                  )
                })}
              </div>}
              {renderActions && <div className="actions">{renderActions(m)}</div>}
            </div>
            {showBagua && bagua.length > 0 && (
              <div className="bline">
                <div className="blabel">八卦轉運斗<br />{picked ? `已選 ${picked} 型` : showPrice && bagua[0] ? `每型 ${money(bagua[0].price)}` : ''}</div>
                <div className="chips">
                  {bagua.map((t) => {
                    const st = status(m, t)
                    return (
                      <button key={t.id} type="button" className={`chip ${st === 'none' ? '' : `chip-${st}`}`} data-col={t.id}
                        aria-pressed={st === 'existing' || st === 'add'} aria-label={`${m.name} ${t.name}`} title={title(t, st)} disabled={st === 'none' && !t.active} onClick={() => onToggle(m.id, t.id)}>
                        <span>{t.name}</span>
                        <span className="chip-sub">{priceOf(t)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
      {footer}
    </div>
  )
}
