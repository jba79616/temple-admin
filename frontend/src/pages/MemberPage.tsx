import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { households, members as membersApi } from '../api'
import type { HouseholdDetail, HouseholdSummary, MemberInput, MemberView } from '../api/types'
import Crumbs from '../components/Crumbs'
import MemberFields from '../components/MemberFields'
import { useConfig } from '../lib/config'
import { isValidGanzhi, rocYear } from '../lib/roc'
import { useUnsavedGuard } from '../lib/useUnsavedGuard'

const ZODIAC: Record<string, string> = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龍', 巳: '蛇', 午: '馬', 未: '羊', 申: '猴', 酉: '雞', 戌: '狗', 亥: '豬' }

function toInput(m: MemberView): MemberInput {
  return { name: m.name, gender: m.gender, city: m.city, district: m.district, address: m.address, phone: m.phone, birthGanzhi: m.birthGanzhi,
    birthMonth: m.birthMonth, birthMonthIsLeap: m.birthMonthIsLeap, birthDay: m.birthDay, birthHourBranch: m.birthHourBranch }
}

export default function MemberPage() {
  const { id } = useParams()
  const memberId = Number(id)
  const navigate = useNavigate()
  const { currentYear } = useConfig()
  const [member, setMember] = useState<MemberView | null>(null)
  const [household, setHousehold] = useState<HouseholdDetail | null>(null)
  const [form, setForm] = useState<MemberInput | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [savedAt, setSavedAt] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [newHeadId, setNewHeadId] = useState<number | ''>('')
  const [moving, setMoving] = useState(false)
  const [moveQuery, setMoveQuery] = useState('')
  const [moveHits, setMoveHits] = useState<HouseholdSummary[]>([])
  const [movingBusy, setMovingBusy] = useState(false)

  const dirty = form !== null && member !== null && JSON.stringify(form) !== JSON.stringify(toInput(member))
  useUnsavedGuard(dirty && !saving && !removing && !movingBusy)

  useEffect(() => {
    membersApi.get(memberId).then(async (m) => {
      setMember(m)
      setForm(toInput(m))
      setHousehold(await households.get(m.householdId))
    }).catch((e) => setError(e.message))
  }, [memberId])

  if (!member || !form || !household) return <main className="page muted">{error || '載入中…'}</main>

  const branch = form.birthGanzhi && isValidGanzhi(form.birthGanzhi) ? form.birthGanzhi[1] : null
  const zodiac = branch ? ZODIAC[branch] : '—'
  const preview = `${form.birthGanzhi || '吉'}年 ${form.birthMonthIsLeap ? '閏' : ''}${form.birthMonth ?? '吉'}月 ${form.birthDay ?? '吉'}日 ${form.birthHourBranch ?? '吉'}時 生`
  const others = household.members.filter((m) => m.id !== member.id)
  const headWithOthers = member.head && others.length > 0

  async function save() {
    if (!form) return
    setError('')
    setSaving(true)
    try {
      const updated = await membersApi.update(memberId, form)
      setMember(updated)
      setForm(toInput(updated))
      setSavedAt(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }))
      setMessage(`已儲存。生肖 ${updated.zodiac ?? '—'}，${updated.taisui ? `${updated.taisui}，矩陣會提示太歲燈。` : '不犯太歲。'}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!member || removing) return
    setRemoving(true)
    setError('')
    try {
      await membersApi.remove(memberId, deleteReason.trim(), member.head && others.length > 0 ? Number(newHeadId) : null)
      navigate(`/households/${member.householdId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '刪除失敗')
    } finally {
      setRemoving(false)
    }
  }

  async function searchTargets() {
    if (!member || !moveQuery.trim()) return
    setError('')
    try {
      const found = await households.search(moveQuery.trim())
      setMoveHits(found.filter((h) => h.id !== member.householdId))
    } catch (e) {
      setError(e instanceof Error ? e.message : '搜尋失敗')
    }
  }

  async function moveTo(target: HouseholdSummary) {
    if (!member || movingBusy) return
    if (!window.confirm(`把 ${member.name} 移到戶 ${target.householdNumber} ${target.headName ?? ''}？今年已安的燈會跟著過去，歷年紀錄保留。`)) return
    setMovingBusy(true)
    setError('')
    try {
      await membersApi.move(memberId, target.id)
      navigate(`/households/${target.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '移戶失敗')
      setMovingBusy(false)
    }
  }

  return (
    <main className="page page-narrow">
      <Crumbs items={[{ to: `/households/${member.householdId}`, label: `戶 ${household.householdNumber} ${household.members.find((m) => m.head)?.name ?? ''}` }, { label: `改生辰資料：${member.name}` }]} />
      <div className="split">
        <section className="card main card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <MemberFields value={form} onChange={setForm} householdCityDistrict={(household.city ?? '') + (household.district ?? '')} householdAddress={household.address ?? ''} />
          <div className="row" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button type="button" className="btn" onClick={save} disabled={!dirty || saving || !form.name.trim() || (!!form.birthGanzhi && !isValidGanzhi(form.birthGanzhi))}>{saving ? '儲存中…' : '儲存'}</button>
            <Link to={`/households/${member.householdId}`} className="btn btn-ghost">{dirty ? '取消' : '回戶頁'}</Link>
            {dirty
              ? <span className="small" style={{ color: 'var(--warn-text)', fontWeight: 500 }}>有未儲存的修改</span>
              : savedAt && <span className="small" style={{ color: 'var(--success-text)', fontWeight: 700 }}>✓ 已儲存 {savedAt}</span>}
            <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => { setMoving(true); setDeleting(false) }}>移到別戶</button>
            <button type="button" className="btn btn-danger" onClick={() => { setDeleting(true); setMoving(false) }}>刪除此成員</button>
          </div>
          {message && !dirty && <div className="banner banner-ok">{message} 修改前後已寫入稽核日誌。</div>}
          {error && <div className="banner banner-bad">{error}</div>}
          {moving && (
            <div className="panel">
              <strong>移到別戶</strong>
              {headWithOthers ? (
                <div className="small" style={{ color: 'var(--warn-text)' }}>這位是戶長，請先回戶頁把其他成員設為戶長，再移戶。</div>
              ) : (
                <>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <input className="inp" value={moveQuery} onChange={(e) => setMoveQuery(e.target.value)} placeholder="目標戶：戶長姓名、電話或戶號"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchTargets() } }} />
                    <button type="button" className="btn btn-ghost" disabled={!moveQuery.trim()} onClick={searchTargets}>搜尋</button>
                  </div>
                  {moveHits.length > 0 && (
                    <div className="row">
                      {moveHits.map((h) => (
                        <button key={h.id} type="button" className="btn btn-sm btn-ghost" disabled={movingBusy} onClick={() => moveTo(h)}>
                          戶 {h.householdNumber} {h.headName ?? ''} · {h.cityDistrict || '—'} · {h.memberCount} 人
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="small muted">移過去後排在目標戶最後；不會變成目標戶的戶長。</div>
                </>
              )}
              <div className="row"><button type="button" className="btn btn-ghost" onClick={() => { setMoving(false); setMoveHits([]); setMoveQuery('') }}>返回</button></div>
            </div>
          )}
          {deleting && (
            <div className="panel panel-danger">
              <label className="lbl" htmlFor="dr" style={{ fontWeight: 700 }}>刪除原因（必填）</label>
              <input id="dr" className="inp" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="例如：重複建檔，與別戶的同一人" />
              {member.head && others.length > 0 && (
                <div className="fld"><label className="lbl" htmlFor="nh">這位是戶長，請先指定新戶長</label>
                  <select id="nh" className="inp" value={newHeadId} onChange={(e) => setNewHeadId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">請選擇</option>
                    {others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div className="small muted">歷年安燈紀錄全部保留，今年已安的燈留到年底，名冊照印。</div>
              <div className="row">
                <button type="button" className="btn btn-danger" onClick={remove} disabled={removing || !deleteReason.trim() || (member.head && others.length > 0 && !newHeadId)}>{removing ? '刪除中…' : '確認刪除'}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setDeleting(false)}>返回</button>
              </div>
            </div>
          )}
        </section>
        <aside className="card side card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>核對</h2>
          <div className="kv"><span className="k">生肖</span><span style={{ fontSize: 28, fontWeight: 700 }}>{zodiac}</span></div>
          <div className="kv"><span className="k">民國 {rocYear(currentYear)} 年太歲</span><span>{member.taisui ? <span className="tag tag-ts">{member.taisui}</span> : <span className="tag">儲存後顯示</span>}</span></div>
          <div className="kv"><span className="k">名冊會印成</span><span style={{ fontFamily: 'serif', fontSize: 17, background: 'var(--border-soft)', padding: 10, borderRadius: 8 }}>{form.name}　{preview}</span></div>
          <div className="small muted">生辰四欄空白一律印「吉」。干支年只存兩個字，年度地支由系統算。</div>
        </aside>
      </div>
    </main>
  )
}
