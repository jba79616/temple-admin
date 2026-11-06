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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function LanternMatrix({ members, lightTypes, cells, onToggle, showPrice, showBagua, renderActions, footer, addLabel = '新' }: Props) {
  const general = lightTypes.filter((t) => t.category === 'GENERAL')
  const bagua = lightTypes.filter((t) => t.category === 'BAGUA')
  const status = (m: MemberView, t: LightType): CellStatus => cells[cellKey(m.id, t.id)] ?? 'none'
  return (
    <div>
      <div className="mhead">
        <div className="namecell small muted">成員（戶長在前）</div>
        {general.map((t) => (
          <div key={t.id} className="hcell">
            <span>{t.name}</span>
            <span className="small muted" style={{ fontSize: 11, minHeight: 11, fontWeight: 400 }}>{showPrice ? money(t.price) : ''}</span>
          </div>
        ))}
        {renderActions && <div className="actions small muted" style={{ alignItems: 'flex-end' }}>操作</div>}
      </div>
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
              {general.map((t) => {
                const st = status(m, t)
                const hint = st === 'none' && t.taisui && !!m.taisui
                const checked = st === 'existing' || st === 'add'
                const boxCls = hint ? 'box-hint' : st === 'none' ? '' : `box-${st}`
                const sub = st === 'add' ? addLabel : st === 'remove' ? '取消' : hint ? '建議' : ''
                const subCls = st === 'add' ? 'sub-add' : st === 'remove' ? 'sub-remove' : hint ? 'sub-hint' : ''
                return (
                  <button key={t.id} type="button" className="cell" aria-pressed={checked} aria-label={`${m.name} ${t.name}`}
                    onClick={() => onToggle(m.id, t.id)}>
                    <span className={`box ${boxCls}`}>{checked && <CheckIcon />}</span>
                    <span className={`sub ${subCls}`}>{sub}</span>
                  </button>
                )
              })}
              {renderActions && <div className="actions">{renderActions(m)}</div>}
            </div>
            {showBagua && bagua.length > 0 && (
              <div className="bline">
                <div className="blabel">八卦轉運斗<br />{picked ? `已選 ${picked} 型` : showPrice && bagua[0] ? `每型 ${money(bagua[0].price)}` : ''}</div>
                <div className="chips">
                  {bagua.map((t) => {
                    const st = status(m, t)
                    const sub = st === 'existing' ? '已安' : st === 'add' ? addLabel : st === 'remove' ? '取消' : showPrice ? money(t.price) : ''
                    return (
                      <button key={t.id} type="button" className={`chip ${st === 'none' ? '' : `chip-${st}`}`}
                        aria-pressed={st === 'existing' || st === 'add'} aria-label={`${m.name} ${t.name}`} onClick={() => onToggle(m.id, t.id)}>
                        <span>{t.name}</span>
                        <span className="chip-sub">{sub}</span>
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
