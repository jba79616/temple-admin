import { Link } from 'react-router'
import { useAuth } from '../lib/auth'
import { ROLE } from '../lib/labels'

export default function MorePage() {
  const { me, logout } = useAuth()
  const isAdmin = me?.role === 'ADMIN'
  const items = [
    { to: '/mailing', title: '帖子名單', desc: '安斗帖子的寄送名單與標籤列印' },
    { to: '/light-types', title: '燈種與價格', desc: '光明、文昌、太歲、八卦轉運斗的名稱與單價' },
    { to: '/settings', title: '設定', desc: '廟名、年度、太歲規則' },
    ...(isAdmin ? [
      { to: '/users', title: '使用者', desc: '帳號、角色、重設密碼' },
      { to: '/audit', title: '稽核', desc: '誰在什麼時候改了什麼' },
      { to: '/import', title: '舊資料匯入', desc: '上傳舊系統的 SQL dump，預覽後匯入戶、成員與歷年安燈' },
    ] : []),
  ]
  return (
    <main className="page page-narrow">
      <h1>更多</h1>
      <section className="card">
        {items.map((it) => (
          <Link key={it.to} to={it.to} className="more-item">
            <span><strong>{it.title}</strong><span className="small muted" style={{ display: 'block' }}>{it.desc}</span></span>
            <span className="muted" aria-hidden="true">›</span>
          </Link>
        ))}
      </section>
      <section className="card card-pad row">
        <span>{me?.displayName} · {me ? ROLE[me.role] : ''}</span>
        <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => logout()}>登出</button>
      </section>
    </main>
  )
}
