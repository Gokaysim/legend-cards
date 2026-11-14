import { useId, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { CURSED_BACK, NEUTRAL_BACK, type SpreadBack } from '@/features/art/spreadBack'
import { useBlessedShock } from '@/features/art/useBlessedShock'
import { useAuth } from '@/features/auth/authContext'
import { formatAmount } from '@/features/balances/format'
import { CardDeck } from '@/features/cards/CardDeck'
import { CardFace } from '@/features/cards/CardFace'
import { useCards } from '@/features/cards/cardsContext'
import { FilterBar } from '@/features/cards/FilterBar'
import {
  applyFacets,
  DRAW_FILTER_FIELDS,
  drawFacets,
  drawFacetValues,
  facetChoices,
  keywordTest,
} from '@/features/cards/filters'
import {
  activeFilters,
  cursedPool,
  type DrawFilters,
  drawablePool,
  DRAW_RARITIES,
  NO_FILTERS,
} from '@/features/cards/pool'
import { compareLabels } from '@/features/cards/sort'
import { useSetIndex } from '@/features/sets/setsContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import { genitive } from '@/lib/turkish'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import type { DrawResult } from './api'
import { DeckPile } from './DeckPile'
import { useDrawActions } from './drawsContext'
import { type DrawFailure, drawFailureMessage, toDrawFailure } from './errors'
import { FaceDownCard } from './FaceDownCard'
import { DRAW_LIMITS, DRAW_PRICE, type DrawKind } from './schema'

const TITLES: Record<DrawKind, string> = {
  random: '🎲 Kart Çek',
  cursed: '☠ Cursed Kart Çek',
}

/** "Destede ne var?" shows this many more cards each time. */
const PEEK_PAGE = 20

/**
 * Each drawn card's slight turn in the fan, by its place. Only with motion: with reduced motion the cards lie
 * straight (spec: visual-effects, "The draw spread").
 */
const FAN_TILTS = [
  'motion-safe:-rotate-3',
  'motion-safe:rotate-1',
  'motion-safe:-rotate-1',
  'motion-safe:rotate-3',
]

/** A drawn card with the back of the deck it was drawn from (spec: card-draws, "The deck's back"). */
type Drawn = { result: DrawResult; back: SpreadBack }

export type DrawDialogProps = {
  mode: DrawKind
  /** The player whose hand the cards go to, live (their LP shows as it changes). */
  owner: UserProfile
  onClose: () => void
}

/**
 * Draws cards into a hand at the draw table (design D4 of `improve-draw-and-give-dialogs`): a deck with the number
 * of cards a draw picks from, the draw control under it, and the drawn cards beside it in a fan, face down, in the
 * order drawn. Each draw is complete (the card in the hand, the LP paid) before its card shows here. Closing never
 * undoes a draw.
 * - A player's random draw costs 1 LP and has no filters.
 * - The DM's random draw is free, can be narrowed with the filter pills, and can look into the deck.
 * - A Cursed draw is free for both.
 */
export function DrawDialog({ mode, owner, onClose }: DrawDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const cards = useCards()
  const sets = useSetIndex()
  const actions = useDrawActions()
  const isOnline = useOnlineStatus()
  const ownerName = profileName(owner)
  const { shock, overlay } = useBlessedShock()

  const paid = mode === 'random' && !isDm
  const hasFilters = mode === 'random' && isDm

  const [filters, setFilters] = useState<DrawFilters>(NO_FILTERS)
  const [drawn, setDrawn] = useState<Drawn[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<DrawFailure | null>(null)
  const [peekCount, setPeekCount] = useState(0)

  const pool = useMemo(() => {
    if (cards.status !== 'ready') return null
    return mode === 'cursed' ? cursedPool(cards.data) : drawablePool(cards.data)
  }, [cards, mode])
  const facets = useMemo(() => drawFacets(sets), [sets])
  const values = drawFacetValues(filters)
  const test = useMemo(() => keywordTest(filters.keyword, sets.setName), [filters.keyword, sets])
  const candidates = useMemo(() => {
    if (pool === null || !hasFilters) return pool
    return applyFacets(pool, facets, drawFacetValues(filters), test)
  }, [pool, hasFilters, facets, filters, test])

  // The deck shows the chosen set's cardback: a set filter keeps Blessed cards out, so the back gives nothing away.
  const deckBack: SpreadBack =
    mode === 'cursed'
      ? CURSED_BACK
      : hasFilters && filters.setCode !== null
        ? { kind: 'set', setCode: filters.setCode }
        : NEUTRAL_BACK

  const isShort = paid && owner.lp < DRAW_PRICE
  const canDraw =
    uid !== null && !isBusy && !isShort && candidates !== null && candidates.length > 0

  const draw = async () => {
    if (!canDraw || uid === null) return
    setFailure(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsBusy(true)
    const back = deckBack
    try {
      const result = await actions.drawCard({
        kind: mode,
        uid: owner.id,
        by: uid,
        paid,
        filters: hasFilters ? activeFilters(filters) : null,
        candidates,
      })
      setDrawn((current) => [...current, { result, back }])
    } catch (error) {
      setFailure(toDrawFailure(error))
    } finally {
      setIsBusy(false)
    }
  }

  const control =
    mode === 'cursed' ? '☠ Cursed Kart Çek' : paid ? `🎲 Çek · ${DRAW_PRICE} LP` : '🎲 Çek'

  const pills =
    hasFilters && pool !== null
      ? facets.map((facet) => {
          const field = DRAW_FILTER_FIELDS[facet.key as keyof typeof DRAW_FILTER_FIELDS]
          return {
            key: facet.key,
            name: facet.name,
            choices: facetChoices(pool, facets, values, facet.key, test),
            value: values[facet.key] ?? null,
            onChange: (value: string | null) =>
              setFilters((current) => ({
                ...current,
                [field]:
                  field === 'rarity'
                    ? (DRAW_RARITIES.find((rarity) => rarity === value) ?? null)
                    : value,
              })),
          }
        })
      : []

  const peekCards = useMemo(
    () =>
      peekCount > 0 && candidates
        ? [...candidates].sort((a, b) => compareLabels(a.name, b.name))
        : [],
    [peekCount, candidates],
  )

  return (
    <Dialog title={`${TITLES[mode]} · ${ownerName}`} onClose={onClose} className="sm:max-w-5xl">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
        {paid ? (
          <>
            <p className="inline-flex items-center rounded-full border border-gold px-3 py-1 text-gold">
              <span className="sr-only">Bakiye: </span>
              <span className="font-semibold tabular-nums">{formatAmount(owner.lp)} LP</span>
            </p>
            <p>Her kart {DRAW_PRICE} LP</p>
          </>
        ) : (
          <p>{mode === 'cursed' ? 'Ücretsiz' : 'DM çekilişi ücretsizdir.'}</p>
        )}
      </div>

      {hasFilters && pool !== null ? (
        <FilterBar
          pills={pills}
          keyword={{
            value: filters.keyword ?? '',
            onChange: (keyword) =>
              setFilters((current) => ({ ...current, keyword: keyword || null })),
            maxLength: DRAW_LIMITS.keyword,
          }}
          isActive={activeFilters(filters) !== null}
          onClear={() => setFilters(NO_FILTERS)}
        />
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

      {/* The table: the deck and its control, and the drawn cards beside it from 640 px, under it below. */}
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-[radial-gradient(80%_120%_at_30%_50%,var(--color-pane-raised),var(--color-canvas)_75%)] p-4 sm:flex-row sm:items-start sm:p-6">
        <div className="flex w-40 shrink-0 flex-col items-center gap-3 sm:w-44">
          <DeckPile back={deckBack} count={candidates?.length ?? 0} />
          <Button
            variant="primary"
            data-autofocus
            disabled={!canDraw}
            aria-busy={isBusy}
            onClick={() => void draw()}
            className="mt-1 h-12 w-full text-base"
          >
            {isBusy ? 'Çekiliyor…' : control}
          </Button>
          {hasFilters ? (
            <Button
              variant="ghost"
              aria-expanded={peekCount > 0}
              aria-controls={`${ids}-peek`}
              onClick={() => setPeekCount((count) => (count > 0 ? 0 : PEEK_PAGE))}
              className="py-1 text-ink-muted"
            >
              Destede ne var?
            </Button>
          ) : null}
        </div>

        <section aria-labelledby={`${ids}-drawn`} className="flex w-full min-w-0 flex-col gap-3">
          <h3
            id={`${ids}-drawn`}
            className="text-xs font-bold tracking-widest text-ink-muted uppercase"
          >
            Çekilen kartlar{drawn.length > 0 ? ` · ${drawn.length}` : ''}
          </h3>
          <p role="status" className="sr-only">
            {drawn.length > 0
              ? `${drawn.length} kart çekildi ve ${genitive(ownerName)} eline eklendi.`
              : ''}
          </p>
          {drawn.length === 0 ? (
            <p className="text-sm text-ink-muted">Çektiğin kartlar burada açılır.</p>
          ) : (
            // The fan (spec: visual-effects, "The draw spread"): slightly turned, overlapping cards; the card under
            // the pointer or the focus lifts and comes to the front. The right padding makes up for the overlap.
            <ol className="flex flex-wrap justify-center gap-y-4 pt-3 pr-3 pb-1 sm:justify-start sm:pr-3.75">
              {drawn.map(({ result, back }, index) => (
                <li
                  key={result.drawId}
                  className={cn(
                    'relative z-1 -mr-3 w-[clamp(202.5px,51vw,277.5px)] max-w-[calc(100vw-84px)] transition duration-200 focus-within:z-50 hover:z-50 motion-safe:focus-within:-translate-y-2.5 motion-safe:focus-within:scale-[1.035] motion-safe:hover:-translate-y-2.5 motion-safe:hover:scale-[1.035] sm:-mr-3.75 sm:w-[clamp(210px,24vw,300px)]',
                    FAN_TILTS[index % FAN_TILTS.length],
                  )}
                >
                  <FaceDownCard
                    card={result.card}
                    position={index + 1}
                    back={back}
                    onTurn={result.card.kind === 'blessed' ? shock : undefined}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {hasFilters && peekCount > 0 ? (
        <section
          id={`${ids}-peek`}
          aria-labelledby={`${ids}-peek-title`}
          className="flex flex-col gap-3"
        >
          <h3
            id={`${ids}-peek-title`}
            className="text-xs font-bold tracking-widest text-ink-muted uppercase"
          >
            Destedeki kartlar · {peekCards.length}
          </h3>
          {peekCards.length === 0 ? (
            <p className="text-sm text-ink-muted">Bu filtrelere uyan kart yok.</p>
          ) : (
            <CardDeck
              as="ul"
              label="Destedeki kartlar"
              deck="library"
              items={peekCards.slice(0, peekCount)}
              itemKey={(card) => card.id}
              renderItem={(card) => <CardFace card={card} />}
            />
          )}
          {peekCards.length > peekCount ? (
            <Button
              className="self-center"
              onClick={() => setPeekCount((count) => count + PEEK_PAGE)}
            >
              Daha fazla göster
            </Button>
          ) : null}
        </section>
      ) : null}
      {overlay}
    </Dialog>
  )
}
