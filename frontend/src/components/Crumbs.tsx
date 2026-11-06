import { Fragment } from 'react'
import { Link } from 'react-router'

export interface Crumb { to?: string; label: string }

export default function Crumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="所在位置">
      <Link to="/">櫃台</Link>
      {items.map((it, i) => (
        <Fragment key={i}>
          <span className="crumb-sep" aria-hidden="true">›</span>
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span className="crumb-current">{it.label}</span>}
        </Fragment>
      ))}
    </nav>
  )
}
