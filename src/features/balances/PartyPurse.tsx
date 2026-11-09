import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import { DmOnly } from '@/features/users/DmOnly'

import { BalanceDialog } from './BalanceDialog'
import { usePartyPurse } from './balancesContext'
import { formatAmount } from './format'

/**
 * The party purse in the navigation area: the group's shared GP, live, for everyone. The DM opens the GP change
 * from here, except while a pack is open. A purse that does not exist yet holds 0 GP.
 */
export function PartyPurse() {
  const headingId = useId()
  const purse = usePartyPurse()
  const [isChanging, setIsChanging] = useState(false)
  const isTableBusy = useIsTableBusy()
  const gp = purse.status === 'ready' ? (purse.data?.gp ?? 0) : null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      <h2
        id={headingId}
        className="px-3 text-xs font-semibold tracking-wide text-ink-muted uppercase"
      >
        Grup kesesi
      </h2>
      <div className="flex min-h-9 items-center justify-between gap-2 px-3">
        {purse.status === 'loading' ? (
          <p role="status" className="text-sm text-ink-muted">
            <span aria-hidden="true">…</span>
            <span className="sr-only">Kese yükleniyor</span>
          </p>
        ) : purse.status === 'error' ? (
          <p role="alert" className="text-sm text-danger-ink">
            Kese yüklenemedi.
          </p>
        ) : (
          <p className="text-sm font-semibold text-gold tabular-nums">{formatAmount(gp ?? 0)} GP</p>
        )}
        <DmOnly>
          <Button
            variant="ghost"
            className="shrink-0 px-2 py-1"
            aria-label="Grup kesesini değiştir"
            disabled={gp === null || isTableBusy}
            title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
            onClick={() => setIsChanging(true)}
          >
            ± GP
          </Button>
        </DmOnly>
      </div>
      {isChanging && gp !== null ? (
        <BalanceDialog currency="gp" balance={gp} onClose={() => setIsChanging(false)} />
      ) : null}
    </section>
  )
}
