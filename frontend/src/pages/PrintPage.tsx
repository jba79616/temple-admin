import { useEffect, useState } from 'react'
import { lightTypes as lightTypesApi } from '../api'
import type { LightType } from '../api/types'
import { useConfig } from '../lib/config'
import { ganzhiOfYear, rocYear } from '../lib/roc'

export default function PrintPage() {
  const { currentYear } = useConfig()
  const [types, setTypes] = useState<LightType[]>([])
  const [year, setYear] = useState(currentYear)
  const [lightTypeId, setLightTypeId] = useState<number | ''>('')

  useEffect(() => { lightTypesApi.list().then((t) => { setTypes(t); if (t.length && lightTypeId === '') setLightTypeId(t.find((x) => x.taisui)?.id ?? t[0].id) }) }, [lightTypeId])
  useEffect(() => { setYear(currentYear) }, [currentYear])

  const years = [currentYear, currentYear - 1, currentYear - 2]
  const open = (path: string) => window.open(path, '_blank', 'noopener')

  return (
    <main className="page page-narrow">
      <h1>列印</h1>
      <section className="card card-pad row" style={{ alignItems: 'flex-end' }}>
        <label className="fld small muted">年度
          <select className="inp" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>民國 {rocYear(y)} 年 {ganzhiOfYear(y)}</option>)}
          </select>
        </label>
        <label className="fld small muted">燈種
          <select className="inp" value={lightTypeId} onChange={(e) => setLightTypeId(Number(e.target.value))}>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn" disabled={lightTypeId === ''} onClick={() => open(`/print/cards?year=${year}&lightTypeId=${lightTypeId}`)}>安燈卡</button>
          <button type="button" className="btn" disabled={lightTypeId === ''} onClick={() => open(`/print/name-list?year=${year}&lightTypeId=${lightTypeId}`)}>頌經名冊（該年有安的人）</button>
          <button type="button" className="btn btn-ghost" disabled={lightTypeId === ''} onClick={() => open(`/print/name-list?year=${year}&lightTypeId=${lightTypeId}&all=true`)}>全部名冊</button>
        </div>
      </section>
      <section className="card card-pad small muted" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>列印頁會在新分頁開啟，按右上角「列印」或 Ctrl+P。安燈卡 A4 直印一頁 21 張；名冊 Letter 橫印、同戶不拆頁。</div>
        <div>列印對話框請關閉「頁首和頁尾」、邊界選「預設」、縮放 100%。單戶安燈卡從戶頁存檔後的綠色橫幅列印。</div>
      </section>
    </main>
  )
}
