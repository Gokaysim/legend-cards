import { Link } from 'react-router'

import { screenById, type ScreenId } from '@/app/screens'

/**
 * The "← <screen>" link at the top of a statistics page, back to the screen whose address it sits under, or to `to`
 * on that screen, for example a tab of the Kütüphane.
 */
export function BackLink({ screen, to }: { screen: ScreenId; to?: string }) {
  const target = screenById(screen)
  return (
    <Link
      to={to ?? target.path}
      className="self-start rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink hover:bg-pane-raised"
    >
      ← {target.label}
    </Link>
  )
}
