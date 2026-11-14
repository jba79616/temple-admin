import { useState } from 'react'
import { Link } from 'react-router'
import { admin } from '../api'
import type { LegacyImportReport, LegacyIssue, LegacyIssueKind } from '../api/types'
import { LEGACY_ISSUE } from '../lib/labels'

const ISSUE_ORDER: LegacyIssueKind[] = ['ADDRESS', 'DISTRICT', 'HEAD', 'BIRTH', 'PERSON', 'ORDER']

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="kv">
      <span className="k">{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700 }} className="num">{value.toLocaleString()}</span>
      {sub && <span className="small muted">{sub}</span>}
    </div>
  )
}

function IssueGroup({ kind, issues }: { kind: LegacyIssueKind; issues: LegacyIssue[] }) {
  if (issues.length === 0) return null
  return (
    <details className="card" style={{ overflow: 'hidden' }}>
      <summary style={{ padding: '14px 16px', cursor: 'pointer', fontWeight: 600 }}>{LEGACY_ISSUE[kind]} <span className="muted">· {issues.length} 筆</span></summary>
      <div className="scroll-x">
        <table className="table">
          <thead><tr><th style={{ width: 80 }}>戶號</th><th style={{ width: 120 }}>姓名</th><th>說明</th></tr></thead>
          <tbody>
            {issues.map((i, idx) => (
              <tr key={idx}><td className="num">{i.householdNumber ?? '—'}</td><td>{i.name ?? '—'}</td><td>{i.detail}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function ReportView({ report }: { report: LegacyImportReport }) {
  const c = report.counts
  const byKind = (kind: LegacyIssueKind) => report.issues.filter((i) => i.kind === kind)
  return (
    <>
      <section className="card card-pad">
        <div className="card-title">{report.committed ? '匯入結果' : '預覽結果（尚未寫入）'}</div>
        <div className="grid-3" style={{ gap: 16 }}>
          <Stat label="舊資料人數" value={c.people} sub={`含舊系統已刪除 ${c.deleted} 人，匯成軟刪除`} />
          <Stat label="戶" value={c.households} sub={`新建 ${c.householdsCreated} · 更新 ${c.householdsUpdated}`} />
          <Stat label="成員" value={c.membersCreated + c.membersUpdated} sub={`新建 ${c.membersCreated} · 更新 ${c.membersUpdated}`} />
          <Stat label="匯入單" value={c.orders} sub={`明細 ${c.items} 筆 · 收款 ${c.payments} 筆`} />
          <Stat label="地址拆成三段" value={c.addressesSplit} sub={`缺鄉鎮市區 ${c.addressesPartial} · 拆不開 ${c.addressesUnparsed}`} />
          <Stat label="已存在而略過的安燈紀錄" value={c.recordsExisting} sub="重跑時不會重複建單" />
        </div>
      </section>
      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="card-title" style={{ padding: '14px 16px 0' }}>歷年安燈人數（舊資料勾選數）</div>
        <div className="scroll-x">
          <table className="table">
            <thead><tr><th>民國</th><th className="right">光明燈</th><th className="right">文昌燈</th><th className="right">太歲燈</th><th className="right">八卦轉運斗</th></tr></thead>
            <tbody>
              {report.years.map((y) => (
                <tr key={y.year}>
                  <td>{y.rocYear} 年<span className="small muted">（{y.year}）</span></td>
                  <td className="right num">{y.guangming.toLocaleString()}</td>
                  <td className="right num">{y.wenchang.toLocaleString()}</td>
                  <td className="right num">{y.taisui.toLocaleString()}</td>
                  <td className="right num">{y.bagua.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <h2 style={{ margin: '8px 0 0', fontSize: 18 }}>需要人工看的項目 <span className="muted small">· 共 {report.issues.length} 筆</span></h2>
      {report.issues.length === 0 && <div className="banner banner-ok">沒有需要人工處理的項目</div>}
      {ISSUE_ORDER.map((kind) => <IssueGroup key={kind} kind={kind} issues={byKind(kind)} />)}
    </>
  )
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewed, setPreviewed] = useState<File | null>(null)
  const [report, setReport] = useState<LegacyImportReport | null>(null)
  const [busy, setBusy] = useState<'preview' | 'commit' | null>(null)
  const [error, setError] = useState('')

  async function run(commit: boolean) {
    if (!file) return
    if (commit && !window.confirm('確定要正式匯入？會建立戶、成員、歷年匯入單與安燈紀錄，匯入單不能作廢。')) return
    setBusy(commit ? 'commit' : 'preview')
    setError('')
    try {
      const result = await admin.legacyImport(file, commit)
      setReport(result)
      setPreviewed(commit ? null : file)
    } catch (e) {
      setReport(null)
      setError(e instanceof Error ? e.message : '匯入失敗')
    } finally {
      setBusy(null)
    }
  }

  const canCommit = !!file && previewed === file && !busy

  return (
    <main className="page page-narrow">
      <h1>舊資料匯入</h1>
      <section className="card card-pad" style={{ gap: 12 }}>
        <ol className="steps">
          <li><b>1</b>選擇舊系統的 mysqldump 檔（.sql，UTF-8）</li>
          <li><b>2</b>先「預覽」：整個流程會跑一遍再還原，不會留下資料</li>
          <li><b>3</b>看完報表沒問題再「正式匯入」</li>
        </ol>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <input className="inp" type="file" accept=".sql,text/plain,application/sql" disabled={!!busy}
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreviewed(null); setReport(null); setError('') }} />
          <button type="button" className="btn btn-ghost" disabled={!file || !!busy} onClick={() => run(false)}>{busy === 'preview' ? '預覽中…' : '預覽'}</button>
          <button type="button" className="btn" disabled={!canCommit} onClick={() => run(true)}>{busy === 'commit' ? '匯入中…' : '正式匯入'}</button>
        </div>
        <div className="small muted">
          戶號沿用舊系統；每戶每年一張「匯入」單，以匯入收款結清、不進日結；八卦轉運斗舊資料沒有分型，掛在停用的「八卦轉運斗（舊資料）」。
          重跑會依舊資料 id 更新戶與成員，已存在的安燈紀錄不重複建單。
        </div>
      </section>
      {error && <div className="banner banner-bad">{error}</div>}
      {report?.committed && (
        <div className="banner banner-ok">
          <span>已匯入完成。</span>
          <Link to="/registry" className="btn btn-sm">看戶籍清單</Link>
          <Link to="/light-types" className="btn btn-sm btn-ghost">看燈種</Link>
        </div>
      )}
      {report && <ReportView report={report} />}
    </main>
  )
}
