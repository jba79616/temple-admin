import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../lib/auth'
import { useConfig } from '../lib/config'

export default function Layout() {
  const { me, logout } = useAuth()
  const { templeName, yearLabel } = useConfig()
  const isAdmin = me?.role === 'ADMIN'
  return (
    <div>
      <header className="app-header">
        <div className="brand">{templeName} 安燈系統</div>
        <div className="year-pill">年度 {yearLabel}</div>
        <nav className="nav">
          <NavLink to="/" end>櫃台</NavLink>
          <NavLink to="/closing">收款與日結</NavLink>
          <NavLink to="/print">列印</NavLink>
          <NavLink to="/light-types">燈種</NavLink>
          <NavLink to="/settings">設定</NavLink>
          {isAdmin && <NavLink to="/users">使用者</NavLink>}
          {isAdmin && <NavLink to="/audit">稽核</NavLink>}
        </nav>
        <div className="who">
          <span>{me?.displayName} · {me?.role}</span>
          <button type="button" className="btn btn-sm" onClick={() => logout()}>登出</button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
