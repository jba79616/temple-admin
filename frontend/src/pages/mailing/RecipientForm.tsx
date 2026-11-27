import { recipientFormState, type MailingForm } from '../../lib/mailing'

export default function RecipientForm({ title, form, onChange, onSave, onCancel, saving }: {
  title: string; form: MailingForm; onChange: (patch: Partial<MailingForm>) => void; onSave: () => void; onCancel: () => void; saving: boolean
}) {
  const { linked, canSave, zipHint, householdError } = recipientFormState(form)
  return (
    <div className="panel">
      <strong>{title}</strong>
      <div className="grid-3">
        <div className="fld"><label className="lbl">戶號（連到戶，寄給戶長、用戶地址）</label><input className="inp" inputMode="numeric" value={form.householdNumber} onChange={(e) => onChange({ householdNumber: e.target.value })} />{householdError && <div className="error small">{householdError}</div>}</div>
        <div className="fld"><label className="lbl">{linked ? '收件人（空白＝戶長）' : '收件人'}</label><input className="inp" value={form.recipientName} onChange={(e) => onChange({ recipientName: e.target.value })} /></div>
        <div className="fld"><label className="lbl">郵遞區號（留空會依地址自動查）</label><input className="inp" inputMode="numeric" placeholder={zipHint} value={form.zip} onChange={(e) => onChange({ zip: e.target.value })} /></div>
      </div>
      {!linked && <div className="fld"><label className="lbl">地址（含縣市鄉鎮）</label><input className="inp" value={form.address} onChange={(e) => onChange({ address: e.target.value })} /></div>}
      <div className="fld"><label className="lbl">備註</label><input className="inp" value={form.note} onChange={(e) => onChange({ note: e.target.value })} /></div>
      <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={form.active} onChange={(e) => onChange({ active: e.target.checked })} />寄送（取消就暫停，不會刪掉）</label>
      <div className="row">
        <button type="button" className="btn" onClick={onSave} disabled={saving || !canSave}>{saving ? '儲存中…' : '儲存'}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>取消</button>
      </div>
    </div>
  )
}
