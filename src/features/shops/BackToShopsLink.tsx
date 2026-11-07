import { Link } from 'react-router'

import { screenById } from '@/app/screens'

/** The "← Shops" link in the header of each shop sub-screen. */
export function BackToShopsLink() {
  const shops = screenById('shops')
  return (
    <Link
      to={shops.path}
      className="rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink hover:bg-pane-raised"
    >
      ← {shops.label}
    </Link>
  )
}
