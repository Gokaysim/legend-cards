import { Link } from 'react-router'

import { screenById, type ScreenId } from '@/app/screens'

/** The "← <screen>" link at the top of a statistics page, back to the screen whose address it sits under. */
export function BackLink({ screen }: { screen: ScreenId }) {
  const target = screenById(screen)
  return (
    <Link
      to={target.path}
      className="self-start rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink hover:bg-pane-raised"
    >
      ← {target.label}
    </Link>
  )
}
