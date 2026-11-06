import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { households, members as membersApi } from '../api'
import type { HouseholdDetail, MemberInput, MemberView } from '../api/types'
import MemberFields from '../components/MemberFields'
import { useConfig } from '../lib/config'
import { isValidGanzhi, rocYear } from '../lib/roc'

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
  const [deleteReason, setDeleteReason] = useState('')
  const [newHeadId, setNewHeadId] = useState<number | ''>('')

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

  async function save() {
    if (!form) return
    setError('')
    try {
      const updated = await membersApi.update(memberId, form)
      setMember(updated)
      setMessage(`已儲存。生肖 ${updated.zodiac ?? '—'}，${updated.taisui ? `${updated.taisui}，矩陣會提示太歲燈。` : '不犯太歲。'}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '儲存失敗')
    }
  }

  async function remove() {
    if (!member) return
    setError('')
    try {
      await membersApi.remove(memberId, deleteReason.trim(), member.head && others.length > 0 ? Number(newHeadId) : null)
      navigate(`/households/${member.householdId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '刪除失敗')
    }
  }

  return (
    <main className="page page-narrow">
      <div className="crumbs"><Link to={`/households/${member.householdId}`}>← 回戶頁 {household.householdNumber}</Link><span>編輯成員</span></div>
      {message && <div className="banner banner-ok">{message} 修改前後已寫入稽核日誌。</div>}
      {error && <div className="banner banner-bad">{error}</div>}
      <div className="split">
        <section className="card main card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <MemberFields value={form} onChange={setForm} householdCityDistrict={(household.city ?? '') + (household.district ?? '')} householdAddress={household.address ?? ''} />
          <div className="row" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button type="button" className="btn" onClick={save} disabled={!form.name.trim() || (!!form.birthGanzhi && !isValidGanzhi(form.birthGanzhi))}>儲存</button>
            <Link to={`/households/${member.householdId}`} className="btn btn-ghost">取消</Link>
            <button type="button" className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => setDeleting(true)}>刪除此成員</button>
          </div>
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
                <button type="button" className="btn btn-danger" onClick={remove} disabled={!deleteReason.trim() || (member.head && others.length > 0 && !newHeadId)}>確認刪除</button>
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
