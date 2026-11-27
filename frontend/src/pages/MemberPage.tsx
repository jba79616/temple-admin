import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { households, members as membersApi } from '../api'
import type { HouseholdDetail, MemberInput, MemberView } from '../api/types'
import Crumbs from '../components/Crumbs'
import MemberFields from '../components/MemberFields'
import { useConfig } from '../lib/config'
import { householdLabel } from '../lib/householdForm'
import { isMemberDirty, isMemberSavable, otherMembers, savedMemberMessage, toMemberInput } from '../lib/member'
import { useUnsavedGuard } from '../lib/useUnsavedGuard'
import DeletePanel from './member/DeletePanel'
import MemberCheck from './member/MemberCheck'
import MemberSaveBar from './member/MemberSaveBar'
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
      <Crumbs items={[{ to: `/households/${member.householdId}`, label: householdLabel(household) }, { label: `改生辰資料：${member.name}` }]} />
      <div className="split">
        <section className="card main card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <MemberFields value={form} onChange={setForm} householdCityDistrict={(household.city ?? '') + (household.district ?? '')} householdAddress={household.address ?? ''} />
          <MemberSaveBar householdId={member.householdId} dirty={dirty} saving={saving} canSave={!saving && isMemberSavable(form, dirty)}
            savedAt={savedAt} onSave={save} onMove={openMove} onRemove={openRemoval} />
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
