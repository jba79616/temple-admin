import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'

const ADMIN_PATHS = ['/light-types', '/settings', '/users', '/audit', '/more']
const ICONS = {
  counter: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',
  closing: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5M6 12h.01M18 12h.01',
  print: 'M6 9V3h12v6M4 9h16v8h-4v4H8v-4H4z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

export default function Layout() {
  const { me, logout } = useAuth()
  const { templeName, yearLabel } = useConfig()
  const { pathname } = useLocation()
  const isAdmin = me?.role === 'ADMIN'
  const menuRef = useRef<HTMLDetailsElement>(null)
  const counterActive = pathname === '/' || /^\/(households|members|orders)(\/|$)/.test(pathname)
  const adminActive = ADMIN_PATHS.some((p) => pathname.startsWith(p))

  useEffect(() => { menuRef.current?.removeAttribute('open') }, [pathname])
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
          <NavLink to="/closing">收款與日結</NavLink>
          <NavLink to="/print">列印</NavLink>
        </nav>
        <details className="menu" ref={menuRef}>
          <summary className={adminActive ? 'active' : ''}>管理 ▾</summary>
          <div className="menu-list">
            <NavLink to="/light-types">燈種與價格</NavLink>
            <NavLink to="/settings">設定</NavLink>
            {isAdmin && <NavLink to="/users">使用者</NavLink>}
            {isAdmin && <NavLink to="/audit">稽核</NavLink>}
          </div>
        </details>
        <div className="who">
          <span>{me?.displayName} · {me?.role}</span>
          <button type="button" className="btn btn-sm" onClick={() => logout()}>登出</button>
        </div>
      </header>
      <Outlet />
      <nav className="tabbar" aria-label="主要功能">
        <NavLink to="/" end className={counterActive ? 'active' : ''}><Icon d={ICONS.counter} />櫃台</NavLink>
        <NavLink to="/closing"><Icon d={ICONS.closing} />日結</NavLink>
        <NavLink to="/print"><Icon d={ICONS.print} />列印</NavLink>
        <NavLink to="/more" className={adminActive ? 'active' : ''}><Icon d={ICONS.more} />更多</NavLink>
      </nav>
    </div>
  )
}
