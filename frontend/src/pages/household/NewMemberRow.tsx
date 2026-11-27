import { useState, type KeyboardEvent } from 'react'
import { GENDER } from '../../lib/labels'

interface Props {
  onAdd: (name: string, gender: string) => Promise<void>
  onError: (message: string) => void
}

export default function NewMemberRow({ onAdd, onError }: Props) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('M')
  const [adding, setAdding] = useState(false)

  async function add() {
    if (!name.trim() || adding) return
    setAdding(true)
    try {
      await onAdd(name.trim(), gender)
      setName('')
    } catch (e) {
      onError(e instanceof Error ? e.message : '新增失敗')
    } finally {
      setAdding(false)
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); add() }
  }

  return (
    <div className="mrow mfoot" style={{ background: '#F9FAFB' }}>
      <div className="mline">
        <div className="namecell" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <label className="sr-only" htmlFor="newName">新成員姓名</label>
          <input id="newName" className="inp" style={{ minHeight: 40 }} placeholder="新成員姓名，Enter 加入" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
          <label className="sr-only" htmlFor="newGender">性別</label>
          <select id="newGender" className="inp" style={{ minHeight: 40, width: 'auto' }} value={gender} onChange={(e) => setGender(e.target.value)}>
            {Object.entries(GENDER).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>
        <div className="actions small muted"><button type="button" className="btn btn-sm" onClick={add} disabled={adding || !name.trim()}>{adding ? '加入中…' : '加入成員'}</button><span>生辰之後按「改生辰資料」補</span></div>
      </div>
    </div>
  )
}
