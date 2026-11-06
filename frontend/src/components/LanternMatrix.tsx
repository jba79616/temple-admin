import type { ReactNode } from 'react'
import type { LightType, MemberView } from '../api/types'
import { money } from '../lib/roc'

export type CellStatus = 'none' | 'existing' | 'add' | 'remove'
export type Cells = Record<string, CellStatus>

export const cellKey = (memberId: number, lightTypeId: number) => `${memberId}:${lightTypeId}`

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
  renderActions?: (member: MemberView) => ReactNode
  footer?: ReactNode
  addLabel?: string
}

export default function LanternMatrix({ members, lightTypes, cells, onToggle, showPrice, showBagua, renderActions, footer, addLabel = '新' }: Props) {
  const general = lightTypes.filter((t) => t.category === 'GENERAL')
  const bagua = lightTypes.filter((t) => t.category === 'BAGUA')
  const status = (m: MemberView, t: LightType): CellStatus => cells[cellKey(m.id, t.id)] ?? 'none'
  const subOf = (st: CellStatus, t: LightType) =>
    st === 'existing' ? '已安' : st === 'add' ? addLabel : st === 'remove' ? '取消' : showPrice ? money(t.price) : ''

  return (
    <div>
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
                  {m.gender === 'M' ? '男' : m.gender === 'F' ? '女' : '—'} · {m.zodiac ?? '生辰待補'} · {m.birthText}
                </div>
              </div>
              <div className="lights">
                {general.map((t) => {
                  const st = status(m, t)
                  const hint = st === 'none' && t.taisui && !!m.taisui
                  const cls = st === 'none' ? (hint ? 'chip-hint' : '') : `chip-${st}`
                  return (
                    <button key={t.id} type="button" className={`chip chip-lg ${cls}`} aria-pressed={st === 'existing' || st === 'add'}
                      aria-label={`${m.name} ${t.name}`} onClick={() => onToggle(m.id, t.id)}>
                      <span>{t.name}</span>
                      <span className="chip-sub">{hint ? '建議' : subOf(st, t)}</span>
                    </button>
                  )
                })}
              </div>
              {renderActions && <div className="actions">{renderActions(m)}</div>}
            </div>
            {showBagua && bagua.length > 0 && (
              <div className="bline">
                <div className="blabel">八卦轉運斗<br />{picked ? `已選 ${picked} 型` : showPrice && bagua[0] ? `每型 ${money(bagua[0].price)}` : ''}</div>
                <div className="chips">
                  {bagua.map((t) => {
                    const st = status(m, t)
                    return (
                      <button key={t.id} type="button" className={`chip ${st === 'none' ? '' : `chip-${st}`}`}
                        aria-pressed={st === 'existing' || st === 'add'} aria-label={`${m.name} ${t.name}`} onClick={() => onToggle(m.id, t.id)}>
                        <span>{t.name}</span>
                        <span className="chip-sub">{subOf(st, t)}</span>
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
