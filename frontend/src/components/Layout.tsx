import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'
import { ROLE } from '../lib/labels'

const ADMIN_PATHS = ['/light-types', '/settings', '/users', '/audit', '/import', '/more']
const MORE_PATHS = [...ADMIN_PATHS, '/mailing']
const ICONS = {
  counter: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',
  registry: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  closing: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5M6 12h.01M18 12h.01',
  print: 'M6 9V3h12v6M4 9h16v8h-4v4H8v-4H4z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

export default function Layout() {
  const { me, logout } = useAuth()
  const { templeName, yearLabel, loadError, reload } = useConfig()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isAdmin = me?.role === 'ADMIN'
  const menuRef = useRef<HTMLDetailsElement>(null)
  const counterActive = pathname === '/' || /^\/(households|members|orders)(\/|$)/.test(pathname)
  const adminActive = ADMIN_PATHS.some((p) => pathname.startsWith(p))
  const moreActive = MORE_PATHS.some((p) => pathname.startsWith(p))

  useEffect(() => { menuRef.current?.removeAttribute('open') }, [pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable]')) return
      e.preventDefault()
      const search = document.getElementById('q') as HTMLInputElement | null
      if (pathname === '/' && search) { search.focus(); search.select() } else navigate('/')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pathname, navigate])
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) menuRef.current?.removeAttribute('open') }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <div>
      <header className="app-header">
        <Link to="/" className="brand">{templeName} 安燈系統</Link>
        <div className="year-pill">年度 {yearLabel}</div>
        <nav className="nav" aria-label="主要功能">
          <NavLink to="/" end className={counterActive ? 'active' : ''}>櫃台</NavLink>
          <NavLink to="/registry">戶籍</NavLink>
          <NavLink to="/closing">收款與日結</NavLink>
          <NavLink to="/print">列印</NavLink>
          <NavLink to="/mailing">帖子名單</NavLink>
        </nav>
        <details className="menu" ref={menuRef}>
          <summary className={adminActive ? 'active' : ''}>管理 ▾</summary>
          <div className="menu-list">
            <NavLink to="/light-types">燈種與價格</NavLink>
            <NavLink to="/settings">設定</NavLink>
            {isAdmin && <NavLink to="/users">使用者</NavLink>}
            {isAdmin && <NavLink to="/audit">稽核</NavLink>}
            {isAdmin && <NavLink to="/import">舊資料匯入</NavLink>}
          </div>
        </details>
        <div className="who">
          <span>{me?.displayName} · {me ? ROLE[me.role] : ''}</span>
          <button type="button" className="btn btn-sm" onClick={() => logout()}>登出</button>
        </div>
      </header>
      {loadError && (
        <div className="banner banner-bad" style={{ margin: '12px 16px 0' }}>
          讀不到系統設定（年度、寺廟名稱），畫面可能顯示錯的年度：{loadError}
          <button type="button" className="btn btn-sm" style={{ marginLeft: 12 }} onClick={() => reload().catch(() => {})}>重試</button>
        </div>
      )}
      <Outlet />
      <nav className="tabbar" aria-label="主要功能">
        <NavLink to="/" end className={counterActive ? 'active' : ''}><Icon d={ICONS.counter} />櫃台</NavLink>
        <NavLink to="/registry"><Icon d={ICONS.registry} />戶籍</NavLink>
        <NavLink to="/closing"><Icon d={ICONS.closing} />日結</NavLink>
        <NavLink to="/print"><Icon d={ICONS.print} />列印</NavLink>
        <NavLink to="/more" className={moreActive ? 'active' : ''}><Icon d={ICONS.more} />更多</NavLink>
      </nav>
    </div>
  )
}
