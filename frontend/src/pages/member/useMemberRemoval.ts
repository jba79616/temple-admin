import { useState } from 'react'
import { useNavigate } from 'react-router'
import { members as membersApi } from '../../api'
import type { MemberView } from '../../api/types'

export function useMemberRemoval(member: MemberView | null, needsNewHead: boolean, onError: (message: string) => void) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [newHeadId, setNewHeadId] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const canConfirm = !busy && !!reason.trim() && !(needsNewHead && !newHeadId)

  async function confirm() {
    if (!member || busy) return
    setBusy(true)
    onError('')
    try {
      await membersApi.remove(member.id, reason.trim(), needsNewHead ? Number(newHeadId) : null)
      navigate(`/households/${member.householdId}`)
    } catch (e) {
      onError(e instanceof Error ? e.message : '刪除失敗')
    } finally {
      setBusy(false)
    }
  }

  return { open, setOpen, reason, setReason, newHeadId, setNewHeadId, busy, canConfirm, confirm }
}

export type MemberRemoval = ReturnType<typeof useMemberRemoval>
