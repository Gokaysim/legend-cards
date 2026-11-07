import { cn } from '@/lib/cn'

import type { Role } from './schema'

const LABELS: Record<Role, string> = { dm: 'DM', player: 'Oyuncu' }

/** A user's role as a short label: "DM" in gold, "Oyuncu" muted. */
export function RoleTag({ role }: { role: Role }) {
  return (
    <span className={cn('text-xs', role === 'dm' ? 'font-semibold text-gold' : 'text-ink-muted')}>
      {LABELS[role]}
    </span>
  )
}
