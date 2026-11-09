import { cn } from '@/lib/cn'

import { TABLE_BUSY_NOTE } from './errors'
import { useIsTableBusy } from './tableContext'

/**
 * Explains, next to the controls it disables, that a pack is open and the table waits for it. Renders nothing while
 * the table is free.
 */
export function TableBusyNote({ className }: { className?: string }) {
  const isBusy = useIsTableBusy()
  if (!isBusy) return null
  return <p className={cn('text-sm text-ink-muted', className)}>{TABLE_BUSY_NOTE}</p>
}
