import { useId, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { CURSED_BACK, NEUTRAL_BACK } from '@/features/art/spreadBack'
import { useBlessedShock } from '@/features/art/useBlessedShock'
import { useAuth } from '@/features/auth/authContext'
import { formatAmount } from '@/features/balances/format'
import { useCards } from '@/features/cards/cardsContext'
import {
  activeFilters,
  cursedPool,
  type DrawFilters,
  drawablePool,
  drawFilterOptions,
  type DrawRarity,
  matchesFilters,
  NO_FILTERS,
} from '@/features/cards/pool'
import { useSetIndex } from '@/features/sets/setsContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'
import { genitive } from '@/lib/turkish'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import type { DrawResult } from './api'
import { useDrawActions } from './drawsContext'
import { type DrawFailure, drawFailureMessage, toDrawFailure } from './errors'
import { FaceDownCard } from './FaceDownCard'
import { DRAW_LIMITS, DRAW_PRICE, type DrawKind } from './schema'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

const RARITY_LABELS: Record<DrawRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  blessed: 'Blessed',
}

const TITLES: Record<DrawKind, string> = {
  random: '🎲 Kart Çek',
  cursed: '☠ Cursed Kart Çek',
}

/** "Tümü" in a filter: no filter. */
const ALL = ''

export type DrawDialogProps = {
  mode: DrawKind
  /** The player whose hand the cards go to, live (their LP shows as it changes). */
  owner: UserProfile
  onClose: () => void
}

/**
 * Draws cards into a hand, one per selection, and keeps the dialog open for the next one. Each draw is complete
 * (the card in the hand, the LP paid) before its card shows here, face down, in the order drawn. Closing never
 * undoes a draw.
 * - A player's random draw costs 1 LP and has no filters.
 * - The DM's random draw is free and can be narrowed with filters.
 * - A Cursed draw is free for both.
 */
export function DrawDialog({ mode, owner, onClose }: DrawDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const cards = useCards()
  const { setName } = useSetIndex()
  const actions = useDrawActions()
  const isOnline = useOnlineStatus()
  const ownerName = profileName(owner)
  const { shock, overlay } = useBlessedShock()

  const paid = mode === 'random' && !isDm
  const hasFilters = mode === 'random' && isDm

  const [filters, setFilters] = useState<DrawFilters>(NO_FILTERS)
  const [drawn, setDrawn] = useState<DrawResult[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<DrawFailure | null>(null)

  const pool = useMemo(() => {
    if (cards.status !== 'ready') return null
    return mode === 'cursed' ? cursedPool(cards.data) : drawablePool(cards.data)
  }, [cards, mode])
  const options = useMemo(
    () => (pool && hasFilters ? drawFilterOptions(pool) : null),
    [pool, hasFilters],
  )
  const candidates = useMemo(() => {
    if (pool === null || !hasFilters) return pool
    return pool.filter((card) => matchesFilters(card, filters, setName))
  }, [pool, hasFilters, filters, setName])

  const isShort = paid && owner.lp < DRAW_PRICE
  const canDraw =
    uid !== null && !isBusy && !isShort && candidates !== null && candidates.length > 0

  const setFilter = <K extends keyof DrawFilters>(key: K, value: DrawFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))

  const draw = async () => {
    if (!canDraw || uid === null) return
    setFailure(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsBusy(true)
    try {
      const result = await actions.drawCard({
        kind: mode,
        uid: owner.id,
        by: uid,
        paid,
        filters: hasFilters ? activeFilters(filters) : null,
        candidates,
      })
      setDrawn((current) => [...current, result])
    } catch (error) {
      setFailure(toDrawFailure(error))
    } finally {
      setIsBusy(false)
    }
  }

  const control =
    mode === 'cursed' ? '☠ Cursed Kart Çek' : paid ? '🎲 Kart Çek (1 LP)' : '🎲 Kart Çek'

  return (
    // Wide enough for three or four drawn cards in a row on a desktop (design D7).
    <Dialog title={`${TITLES[mode]} · ${ownerName}`} onClose={onClose} className="sm:max-w-5xl">
      {paid ? (
        <p className="text-sm text-ink-muted">
          Bakiye:{' '}
          <span className="font-semibold text-ink tabular-nums">{formatAmount(owner.lp)} LP</span> ·
          Her kart 1 LP
        </p>
      ) : (
        <p className="text-sm text-ink-muted">
          {mode === 'cursed' ? 'Ücretsiz' : 'DM çekilişi ücretsizdir.'}
        </p>
      )}

      {options ? (
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <legend className="sr-only">Filtreler</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-cost`} className="text-sm font-medium text-ink">
              Cost
            </label>
            <select
              id={`${ids}-cost`}
              value={filters.cost ?? ALL}
              onChange={(event) => setFilter('cost', event.target.value || null)}
              className={fieldClasses}
            >
              <option value={ALL}>Tümü</option>
              {options.costs.map((cost) => (
                <option key={cost} value={cost}>
                  {cost}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-pack`} className="text-sm font-medium text-ink">
              Mechanic Pack
            </label>
            <select
              id={`${ids}-pack`}
              value={filters.mechanicPack ?? ALL}
              onChange={(event) => setFilter('mechanicPack', event.target.value || null)}
              className={fieldClasses}
            >
              <option value={ALL}>Tümü</option>
              {options.mechanicPacks.map((pack) => (
                <option key={pack} value={pack}>
                  {pack}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-rarity`} className="text-sm font-medium text-ink">
              Rarity
            </label>
            <select
              id={`${ids}-rarity`}
              value={filters.rarity ?? ALL}
              onChange={(event) =>
                setFilter(
                  'rarity',
                  options.rarities.find((rarity) => rarity === event.target.value) ?? null,
                )
              }
              className={fieldClasses}
            >
              <option value={ALL}>Tümü</option>
              {options.rarities.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {RARITY_LABELS[rarity]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-keyword`} className="text-sm font-medium text-ink">
              Kelime
            </label>
            <input
              id={`${ids}-keyword`}
              type="search"
              maxLength={DRAW_LIMITS.keyword}
              placeholder="Örn: discard, draw"
              value={filters.keyword ?? ''}
              onChange={(event) => setFilter('keyword', event.target.value || null)}
              className={fieldClasses}
            />
          </div>
        </fieldset>
      ) : null}

      {pool === null || candidates === null ? (
        cards.status === 'error' ? (
          <p role="alert" className="text-sm text-danger-ink">
            Kartlar yüklenemedi.
          </p>
        ) : (
          <Spinner label="Kartlar yükleniyor…" className="py-6" />
        )
      ) : pool.length === 0 ? (
        <p className="text-sm text-ink-muted">Çekilebilecek kart yok.</p>
      ) : hasFilters ? (
        <p aria-live="polite" className="text-sm text-ink-muted">
          <span className="font-semibold text-ink tabular-nums">{candidates.length}</span> uygun
          kart
        </p>
      ) : null}

      {isShort ? <p className="text-sm text-ink-muted">Kart çekmek için 1 LP gerekiyor.</p> : null}

      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {drawFailureMessage(failure, ownerName)}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          data-autofocus
          disabled={!canDraw}
          aria-busy={isBusy}
          onClick={() => void draw()}
        >
          {isBusy ? 'Çekiliyor…' : control}
        </Button>
      </div>

      {drawn.length > 0 ? (
        <section aria-labelledby={`${ids}-drawn`} className="flex flex-col gap-2">
          <h3 id={`${ids}-drawn`} className="text-sm font-semibold text-ink-muted">
            Çekilen kartlar
          </h3>
          <p role="status" className="sr-only">
            {`${drawn.length} kart çekildi ve ${genitive(ownerName)} eline eklendi.`}
          </p>
          {/* The spread (design D7): larger cards than the hand's, overlapping a little. The card under the pointer or
              the focus lifts and comes to the front. The list's right padding makes up for the last card's overlap. */}
          <ol className="flex flex-wrap justify-center gap-y-3 pt-3 pr-3 pb-1 sm:pr-3.75">
            {drawn.map((result, index) => (
              <li
                key={result.drawId}
                className="relative z-1 -mr-3 w-[clamp(202.5px,51vw,277.5px)] max-w-[calc(100vw-84px)] transition duration-200 focus-within:z-50 hover:z-50 motion-safe:focus-within:-translate-y-2.5 motion-safe:focus-within:scale-[1.035] motion-safe:hover:-translate-y-2.5 motion-safe:hover:scale-[1.035] sm:-mr-3.75 sm:w-[clamp(225px,31.5vw,352.5px)]"
              >
                <FaceDownCard
                  card={result.card}
                  position={index + 1}
                  // Every card of a draw shows the same back: a random draw's may be Blessed.
                  back={mode === 'cursed' ? CURSED_BACK : NEUTRAL_BACK}
                  onTurn={result.card.kind === 'blessed' ? shock : undefined}
                />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {overlay}
    </Dialog>
  )
}
