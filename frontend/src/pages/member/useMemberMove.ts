import { useState } from 'react'
import { useNavigate } from 'react-router'
import { households, members as membersApi } from '../../api'
import type { HouseholdSummary, MemberView } from '../../api/types'
import { moveConfirmText, moveTargets } from '../../lib/member'

export function useMemberMove(member: MemberView | null, onError: (message: string) => void) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<HouseholdSummary[]>([])
  const [busy, setBusy] = useState(false)

  function close() {
    setOpen(false)
    setHits([])
    setQuery('')
  }

  async function search() {
    if (!member || !query.trim()) return
    onError('')
    try {
      setHits(moveTargets(await households.search(query.trim()), member.householdId))
    } catch (e) {
      onError(e instanceof Error ? e.message : '搜尋失敗')
    }
  }

  async function moveTo(target: HouseholdSummary) {
    if (!member || busy) return
    if (!window.confirm(moveConfirmText(member, target))) return
    setBusy(true)
    onError('')
    try {
      await membersApi.move(member.id, target.id)
      navigate(`/households/${target.id}`)
    } catch (e) {
      onError(e instanceof Error ? e.message : '移戶失敗')
      setBusy(false)
    }
  }

  return { open, setOpen, close, query, setQuery, hits, busy, search, moveTo }
}

export type MemberMove = ReturnType<typeof useMemberMove>
