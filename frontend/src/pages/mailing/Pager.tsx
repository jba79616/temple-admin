import { PAGE_SIZES } from './usePageSize'

export default function Pager({ page, pages, total, onPage, pageSize, onPageSize }: {
  page: number; pages: number; total: number; onPage: (p: number) => void; pageSize?: number; onPageSize?: (n: number) => void
}) {
  return (
    <div className="row" style={{ alignItems: 'center', gap: 8, padding: '10px 16px' }}>
      <span className="small muted">共 {total} 筆 · 第 {page + 1} / {Math.max(1, pages)} 頁</span>
      <button type="button" className="btn btn-sm" disabled={page === 0} onClick={() => onPage(page - 1)}>上一頁</button>
      <button type="button" className="btn btn-sm" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>下一頁</button>
      {onPageSize && (
        <select className="inp" aria-label="每頁筆數" style={{ width: 'auto', minHeight: 0, height: 36, padding: '0 8px' }} value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
          {PAGE_SIZES.map((n) => <option key={n} value={n}>每頁 {n} 筆</option>)}
        </select>
      )}
    </div>
  )
}
