import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { households, members as membersApi } from '../api'
import type { HouseholdDetail, MemberInput, MemberView } from '../api/types'
import Crumbs from '../components/Crumbs'
import MemberFields from '../components/MemberFields'
import { useConfig } from '../lib/config'
import { hasInvalidGanzhi, isMemberDirty, otherMembers, savedMemberMessage, toMemberInput } from '../lib/member'
import { useUnsavedGuard } from '../lib/useUnsavedGuard'
import DeletePanel from './member/DeletePanel'
import MemberCheck from './member/MemberCheck'
import MovePanel from './member/MovePanel'
import { useMemberMove } from './member/useMemberMove'
import { useMemberRemoval } from './member/useMemberRemoval'

export default function MemberPage() {
  const { id } = useParams()
  const memberId = Number(id)
  const { currentYear } = useConfig()
  const [member, setMember] = useState<MemberView | null>(null)
  const [household, setHousehold] = useState<HouseholdDetail | null>(null)
  const [form, setForm] = useState<MemberInput | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState('')

  const others = member && household ? otherMembers(household, member) : []
  const headWithOthers = !!member?.head && others.length > 0
  const move = useMemberMove(member, setError)
  const removal = useMemberRemoval(member, headWithOthers, setError)

  const dirty = isMemberDirty(form, member)
  useUnsavedGuard(dirty && !saving && !removal.busy && !move.busy)

  useEffect(() => {
    membersApi.get(memberId).then(async (m) => {
      setMember(m)
      setForm(toMemberInput(m))
      setHousehold(await households.get(m.householdId))
    }).catch((e) => setError(e.message))
  }, [memberId])

  if (!member || !form || !household) return <main className="page muted">{error || '載入中…'}</main>

  async function save() {
    if (!form) return
    setError('')
    setSaving(true)
    try {
      const updated = await membersApi.update(memberId, form)
      setMember(updated)
      setForm(toMemberInput(updated))
      setSavedAt(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }))
      setMessage(savedMemberMessage(updated))
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  function openMove() {
    move.setOpen(true)
    removal.setOpen(false)
  }

  function openRemoval() {
    removal.setOpen(true)
    move.setOpen(false)
  }

  return (
    <main className="page page-narrow">
      <Crumbs items={[{ to: `/households/${member.householdId}`, label: `戶 ${household.householdNumber} ${household.members.find((m) => m.head)?.name ?? ''}` }, { label: `改生辰資料：${member.name}` }]} />
      <div className="split">
        <section className="card main card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <MemberFields value={form} onChange={setForm} householdCityDistrict={(household.city ?? '') + (household.district ?? '')} householdAddress={household.address ?? ''} />
          <div className="row" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button type="button" className="btn" onClick={save} disabled={!dirty || saving || !form.name.trim() || hasInvalidGanzhi(form)}>{saving ? '儲存中…' : '儲存'}</button>
            <Link to={`/households/${member.householdId}`} className="btn btn-ghost">{dirty ? '取消' : '回戶頁'}</Link>
            {dirty
              ? <span className="small" style={{ color: 'var(--warn-text)', fontWeight: 500 }}>有未儲存的修改</span>
              : savedAt && <span className="small" style={{ color: 'var(--success-text)', fontWeight: 700 }}>✓ 已儲存 {savedAt}</span>}
            <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={openMove}>移到別戶</button>
            <button type="button" className="btn btn-danger" onClick={openRemoval}>刪除此成員</button>
          </div>
          {message && !dirty && <div className="banner banner-ok">{message} 修改前後已寫入稽核日誌。</div>}
          {error && <div className="banner banner-bad">{error}</div>}
          {move.open && <MovePanel move={move} blockedAsHead={headWithOthers} />}
          {removal.open && <DeletePanel removal={removal} newHeadCandidates={headWithOthers ? others : null} />}
        </section>
        <MemberCheck form={form} savedTaisui={member.taisui} currentYear={currentYear} />
      </div>
    </main>
  )
}
