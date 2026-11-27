import type { MemberMove } from './useMemberMove'

export default function MovePanel({ move, blockedAsHead }: { move: MemberMove; blockedAsHead: boolean }) {
  return (
    <div className="panel">
      <strong>移到別戶</strong>
      {blockedAsHead ? (
        <div className="small" style={{ color: 'var(--warn-text)' }}>這位是戶長，請先回戶頁把其他成員設為戶長，再移戶。</div>
      ) : (
        <>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input className="inp" value={move.query} onChange={(e) => move.setQuery(e.target.value)} placeholder="目標戶：戶長姓名、電話或戶號"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); move.search() } }} />
            <button type="button" className="btn btn-ghost" disabled={!move.query.trim()} onClick={move.search}>搜尋</button>
          </div>
          {move.hits.length > 0 && (
            <div className="row">
              {move.hits.map((h) => (
                <button key={h.id} type="button" className="btn btn-sm btn-ghost" disabled={move.busy} onClick={() => move.moveTo(h)}>
                  戶 {h.householdNumber} {h.headName ?? ''} · {h.cityDistrict || '—'} · {h.memberCount} 人
                </button>
              ))}
            </div>
          )}
          <div className="small muted">移過去後排在目標戶最後；不會變成目標戶的戶長。</div>
        </>
      )}
      <div className="row"><button type="button" className="btn btn-ghost" onClick={move.close}>返回</button></div>
    </div>
  )
}
