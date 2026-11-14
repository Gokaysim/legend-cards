import { useId, useMemo } from 'react'

import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { useCards } from '@/features/cards/cardsContext'
import { type PoolShare, poolDistribution } from '@/features/cards/pool'
import { useSetIndex } from '@/features/sets/setsContext'
import { cn } from '@/lib/cn'

/** The dot before each rarity, in the card frame colors. */
const RARITY_DOT: Record<string, string> = {
  Common: 'bg-common',
  Rare: 'bg-gold',
  Blessed: 'bg-blessed',
}

/** One line: the name, then the share and the count ("%71,4 (300)"). */
function ShareLine({ entry, dot }: { entry: PoolShare; dot?: string }) {
  return (
    <span className="flex items-baseline justify-between gap-3">
      <span className="flex min-w-0 items-center gap-2 font-medium break-words text-ink">
        {dot ? (
          <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', dot)} />
        ) : null}
        {entry.label}
      </span>
      <span className="shrink-0 text-ink tabular-nums">
        {entry.share} <span className="text-ink-muted">({entry.count})</span>
      </span>
    </span>
  )
}

/**
 * "▥ Havuz Dağılımı": the drawable cards by rarity (with the sets inside each rarity) and by set, live. Every
 * drawable card has the same chance in a random draw, so the shares are also the odds.
 */
export function PoolDistributionDialog({ onClose }: { onClose: () => void }) {
  const ids = useId()
  const cards = useCards()
  const { setName } = useSetIndex()
  const distribution = useMemo(
    () => (cards.status === 'ready' ? poolDistribution(cards.data, setName) : null),
    [cards, setName],
  )

  return (
    <Dialog title="▥ Havuz Dağılımı" onClose={onClose}>
      {cards.status === 'loading' ? <Spinner label="Kartlar yükleniyor…" className="py-6" /> : null}
      {cards.status === 'error' ? (
        <p role="alert" className="text-sm text-danger-ink">
          Kartlar yüklenemedi.
        </p>
      ) : null}
      {distribution?.total === 0 ? (
        <p className="text-sm text-ink-muted">Havuzda gösterilecek kart yok.</p>
      ) : null}
      {distribution && distribution.total > 0 ? (
        <>
          <p className="text-sm text-ink-muted">
            Havuzda çekilebilecek{' '}
            <span className="font-semibold text-ink tabular-nums">{distribution.total}</span> kart
            var. Her kartın şansı eşit, bu yüzden paylar aynı zamanda çekme olasılıklarıdır.
          </p>
          <section aria-labelledby={`${ids}-rarities`} className="flex flex-col gap-2">
            <h3 id={`${ids}-rarities`} className="text-sm font-semibold text-ink-muted">
              Nadirlik
            </h3>
            <ul className="flex flex-col gap-3 text-sm">
              {distribution.rarities.map((rarity) => (
                <li key={rarity.label} className="flex flex-col gap-1">
                  <ShareLine entry={rarity} dot={RARITY_DOT[rarity.label]} />
                  <ul
                    aria-label={`${rarity.label} setleri`}
                    className="flex flex-col gap-0.5 pl-4.5"
                  >
                    {rarity.sets.map((set) => (
                      <li
                        key={set.label}
                        className="flex items-baseline justify-between gap-3 text-ink-muted"
                      >
                        <span className="min-w-0 break-words">{set.label}</span>
                        <span className="shrink-0 tabular-nums">{set.count}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby={`${ids}-sets`} className="flex flex-col gap-2">
            <h3 id={`${ids}-sets`} className="text-sm font-semibold text-ink-muted">
              Setler
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {distribution.sets.map((set) => (
                <li key={set.label}>
                  <ShareLine entry={set} />
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </Dialog>
  )
}
