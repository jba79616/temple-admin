import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { lightTypes as lightTypesApi } from '../api'
import type { LightType } from '../api/types'
import { useConfig } from '../lib/config'
import { usePdfDownload } from '../lib/pdf'
import { ganzhiOfYear, rocYear } from '../lib/roc'

export default function PrintPage() {
  const { currentYear } = useConfig()
  const [types, setTypes] = useState<LightType[]>([])
  const [year, setYear] = useState(currentYear)
  const [formYear, setFormYear] = useState(currentYear - 1)
  const [light, setLight] = useState('')
  const [error, setError] = useState('')
  const [asPdf, setAsPdf] = useState(false)
  const pdf = usePdfDownload(setError)

  useEffect(() => {
    lightTypesApi.list().then((t) => {
      setTypes(t)
      setLight((cur) => (cur !== '' || t.length === 0 ? cur : String(t.find((x) => x.taisui)?.id ?? t[0].id)))
    }).catch((e) => setError(e instanceof Error ? e.message : '讀取燈種失敗'))
  }, [])
  useEffect(() => { setYear(currentYear); setFormYear(currentYear - 1) }, [currentYear])

  const years = [currentYear, currentYear - 1, currentYear - 2]
  const open = async (path: string) => {
    if (!asPdf) {
      window.open(path, '_blank', 'noopener')
      return
    }
    setError('')
    await pdf.download(path)
  }
  const yearOptions = years.map((y) => <option key={y} value={y}>民國 {rocYear(y)} 年 {ganzhiOfYear(y)}</option>)
  const general = types.filter((t) => t.category === 'GENERAL')
  const hasBagua = types.some((t) => t.category === 'BAGUA')
  const lightQuery = light === 'BAGUA' ? 'category=BAGUA' : `lightTypeId=${light}`

  return (
    <main className="page page-narrow">
      {error && <div className="banner banner-bad">{error}</div>}
      <h1>列印</h1>
      <section className="card card-pad row" style={{ alignItems: 'center' }}>
        <label className="row" style={{ minHeight: 44, fontSize: 14 }}>
          <input type="checkbox" checked={asPdf} onChange={(e) => setAsPdf(e.target.checked)} style={{ width: 20, height: 20 }} />下載 PDF 檔，不開列印頁
        </label>
        <span className="small muted">{pdf.busy ? '伺服器轉檔中，請稍候…' : '由伺服器用 Chrome 轉檔，版面與瀏覽器列印相同；拿來存檔或傳給廟方。'}</span>
      </section>
      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2>安燈卡與名冊</h2>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="fld small muted">年度
            <select className="inp" value={year} onChange={(e) => setYear(Number(e.target.value))}>{yearOptions}</select>
          </label>
          <label className="fld small muted">燈種
            <select className="inp" value={light} onChange={(e) => setLight(e.target.value)}>
              {general.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              {hasBagua && <option value="BAGUA">八卦轉運斗</option>}
            </select>
          </label>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn" disabled={light === '' || pdf.busy} onClick={() => open(`/print/cards?year=${year}&${lightQuery}`)}>安燈卡</button>
            <button type="button" className="btn" disabled={light === '' || pdf.busy} onClick={() => open(`/print/name-list?year=${year}&${lightQuery}`)}>頌經名冊（該年有安的人）</button>
            <button type="button" className="btn btn-ghost" disabled={light === '' || pdf.busy} onClick={() => open(`/print/name-list?year=${year}&${lightQuery}&all=true`)}>全部名冊</button>
          </div>
        </div>
      </section>
      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2>申報單</h2>
        <div className="small muted">印給信眾勾選的表單，一戶一頁。選哪一年的安燈資料為底，通常是去年。</div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <label className="fld small muted">年度
            <select className="inp" value={formYear} onChange={(e) => setFormYear(Number(e.target.value))}>{yearOptions}</select>
          </label>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn" disabled={pdf.busy} onClick={() => open(`/print/application-form?scope=LIT&year=${formYear}`)}>申報單（該年有安燈的人）</button>
            <button type="button" className="btn btn-ghost" disabled={pdf.busy} onClick={() => open(`/print/application-form?scope=ALL&year=${formYear}`)}>申報單（全部的人）</button>
            <button type="button" className="btn" disabled={pdf.busy} onClick={() => open(`/print/application-form?scope=BAGUA&year=${formYear}`)}>八卦轉運斗（該年有安斗的人）</button>
          </div>
        </div>
      </section>
      <section className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2>帖子寄送標籤</h2>
        <div className="small muted">
          <Link to="/mailing">帖子名單</Link>裡標為寄送的收件人，依郵遞區號排序；A4 標籤紙一頁 14 張（2×7，99.1×38.1mm），連到戶的列印戶長與戶地址。
        </div>
        <div className="row">
          <button type="button" className="btn" disabled={pdf.busy} onClick={() => open('/print/labels')}>帖子標籤</button>
        </div>
      </section>
      <section className="card card-pad small muted" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>列印頁會在新分頁開啟，按右上角「列印」或 Ctrl+P，也可按「下載 PDF」。安燈卡 A4 直印一頁 21 張；名冊 Letter 橫印、同戶不拆頁；申報單 A4 直印、一戶一頁。</div>
        <div>列印對話框請關閉「頁首和頁尾」、邊界選「預設」、縮放 100%。單戶安燈卡從戶頁存檔後的綠色橫幅列印。</div>
      </section>
    </main>
  )
}
