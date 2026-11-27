import type { MemberInput } from '../../api/types'
import { birthPreview, zodiacOf } from '../../lib/member'
import { rocYear } from '../../lib/roc'

export default function MemberCheck({ form, savedTaisui, currentYear }: { form: MemberInput; savedTaisui: string | null; currentYear: number }) {
  return (
    <aside className="card side card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>核對</h2>
      <div className="kv"><span className="k">生肖</span><span style={{ fontSize: 28, fontWeight: 700 }}>{zodiacOf(form.birthGanzhi)}</span></div>
      <div className="kv"><span className="k">民國 {rocYear(currentYear)} 年太歲</span><span>{savedTaisui ? <span className="tag tag-ts">{savedTaisui}</span> : <span className="tag">儲存後顯示</span>}</span></div>
      <div className="kv"><span className="k">生庚會印成</span><span style={{ fontFamily: 'serif', fontSize: 17, background: 'var(--border-soft)', padding: 10, borderRadius: 8 }}>{form.name}　{birthPreview(form)}</span></div>
      <div className="small muted">生辰四欄空白一律印「吉」。干支年只存兩個字，年度地支由系統算。</div>
    </aside>
  )
}
