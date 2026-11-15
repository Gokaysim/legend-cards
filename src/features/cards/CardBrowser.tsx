import { useCallback, useDeferredValue, useId, useMemo, useState } from 'react'

import { cardHistoryPath } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { StatusFilter } from '@/features/definitions/StatusFilter'
import {
  CARD_FILTER_OPTIONS,
  type CardFilterValue,
} from '@/features/definitions/statusFilterOptions'
import { STATUS_LABELS } from '@/features/definitions/status'
import { useSetIndex } from '@/features/sets/setsContext'
import type { SubscriptionError } from '@/lib/firestore/errors'
import type { Subscription } from '@/lib/firestore/subscription'

import { CardDeck } from './CardDeck'
import { CardFace } from './CardFace'
import type { Deck } from './cardsContext'
import { CardTable } from './CardTable'
import { cardHaystack, cardMatchesQuery, NO_VALUE, setLabel } from './display'
import type { Card } from './schema'
import { setChoices } from './setChoices'
import {
  type CardSort,
  compareLabels,
  DEFAULT_SORT,
  type SortKey,
  sortCards,
  type StatusText,
} from './sort'
import { type DeckStatus, isMarkedHeld, statusLabel } from './status'

type View = 'cards' | 'list'

const ALL = ''

const fieldClasses =
  'rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

function errorMessage(error: SubscriptionError): string {
  return error.kind === 'invalid-data'
    ? 'Kartlar yüklenemedi: kart verisi beklenen biçimde değil. Kart import’unu yeniden çalıştırmak gerekebilir.'
    : 'Kartlar yüklenemedi.'
}

/** The mechanic pack filter's options: the packs that have cards, in Turkish alphabetical order. */
function mechanicOptions(cards: readonly Card[]): string[] {
  const packs = new Set(cards.flatMap((card) => (card.mechanicPack ? [card.mechanicPack] : [])))
  return [...packs].sort(compareLabels)
}

export type CardBrowserProps = {
  deck: Deck
  /** The deck's cards: the active ones (see `useDeckCards`), or for the DM those the status filter keeps. */
  cards: Subscription<Card[]>
  /**
   * Where the cards are: in the pool or in hands, live. Until it is known, the cards show without a status and
   * the pool-only filter is off.
   */
  status?: DeckStatus
  /**
   * For the DM: the status filter (spec: card-library, "The DM's status filter"). Outside "Yayında", each face and row
   * shows its definition status. With it, the toolbar stays even when the filter keeps no card.
   */
  statusFilter?: { value: CardFilterValue; onChange: (value: CardFilterValue) => void }
  /** For the DM: each card's "✎ Düzenle" control. */
  onEdit?: (card: Card) => void
  /**
   * In the Kart kütüphanesi and the Cursed Deck: each face gets the clock control and each list row's name a link to
   * the card's Kart geçmişi (spec: card-library, "History control on library faces").
   */
  linksHistory?: boolean
}

/**
 * Browses one deck: search, the set, mechanic pack and pool-only filters (Legend deck only), a card view and a
 * sortable list view with each card's status, the pool counts (Legend deck only), and the loading, error and
 * empty states. Shared by the Kart kütüphanesi and the Cursed Deck.
 */
export function CardBrowser({
  deck,
  cards,
  status,
  statusFilter,
  onEdit,
  linksHistory = false,
}: CardBrowserProps) {
  if (cards.status === 'loading') {
    return <Spinner label="Kartlar yükleniyor…" className="py-12" />
  }
  if (cards.status === 'error') {
    return (
      <p role="alert" className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink">
        {errorMessage(cards.error)}
      </p>
    )
  }
  if (cards.data.length === 0 && statusFilter === undefined) {
    return (
      <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">Henüz kart yok.</p>
    )
  }
  return (
    <LoadedCardBrowser
      deck={deck}
      cards={cards.data}
      status={status}
      statusFilter={statusFilter}
      onEdit={onEdit}
      linksHistory={linksHistory}
    />
  )
}

function LoadedCardBrowser({
  deck,
  cards,
  status,
  statusFilter,
  onEdit,
  linksHistory,
}: {
  deck: Deck
  cards: Card[]
  status: DeckStatus | undefined
  statusFilter: CardBrowserProps['statusFilter']
  onEdit: CardBrowserProps['onEdit']
  linksHistory: boolean
}) {
  const ids = useId()
  const [query, setQuery] = useState('')
  const [setFilter, setSetFilter] = useState(ALL)
  const [mechanicFilter, setMechanicFilter] = useState(ALL)
  const [isPoolOnly, setIsPoolOnly] = useState(false)
  const [view, setView] = useState<View>('cards')
  const [sort, setSort] = useState<CardSort>(DEFAULT_SORT)
  const deferredQuery = useDeferredValue(query)

  const setIndex = useSetIndex()
  const { setName } = setIndex
  const haystacks = useMemo(
    () => new Map(cards.map((card) => [card.id, cardHaystack(card, setName)])),
    [cards, setName],
  )
  const sets = useMemo(
    () =>
      deck === 'legend'
        ? setChoices(cards, setIndex, { withBlessed: true }).map((choice) => choice.label)
        : [],
    [cards, deck, setIndex],
  )
  const mechanics = useMemo(() => (deck === 'legend' ? mechanicOptions(cards) : []), [cards, deck])

  // Outside "Yayında", the DM sees each card's definition status before where it is.
  const showsStatus = statusFilter !== undefined && statusFilter.value !== 'active'
  const statusText = useCallback<StatusText>(
    (card) => {
      const cardStatus = status?.byCard.get(card.id)
      const where = cardStatus ? statusLabel(card, cardStatus) : null
      if (!showsStatus) return where
      return [STATUS_LABELS[card.status], where]
        .filter((part) => part !== null && part !== NO_VALUE)
        .join(' · ')
    },
    [status, showsStatus],
  )

  const shown = useMemo(() => {
    const matching = cards.filter(
      (card) =>
        (setFilter === ALL || setLabel(card, setName) === setFilter) &&
        (mechanicFilter === ALL || card.mechanicPack === mechanicFilter) &&
        (!isPoolOnly || status === undefined || status.byCard.get(card.id)?.inPool === true) &&
        cardMatchesQuery(haystacks.get(card.id) ?? '', deferredQuery),
    )
    return sortCards(matching, sort, statusText, setName)
  }, [
    cards,
    haystacks,
    setFilter,
    mechanicFilter,
    isPoolOnly,
    status,
    deferredQuery,
    sort,
    statusText,
    setName,
  ])

  const changeSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-pane p-3">
        <label htmlFor={`${ids}-search`} className="sr-only">
          Kart ara
        </label>
        <input
          id={`${ids}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="İsim / metin ara (örn: discard, draw)"
          className={`${fieldClasses} min-w-0 flex-1 basis-56`}
        />
        {statusFilter ? (
          <StatusFilter
            value={statusFilter.value}
            onChange={statusFilter.onChange}
            options={CARD_FILTER_OPTIONS}
          />
        ) : null}
        {deck === 'legend' ? (
          <>
            <label htmlFor={`${ids}-set`} className="sr-only">
              Set
            </label>
            <select
              id={`${ids}-set`}
              value={setFilter}
              onChange={(event) => setSetFilter(event.target.value)}
              className={`${fieldClasses} max-w-full min-w-0`}
            >
              <option value={ALL}>Tüm setler</option>
              {sets.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <label htmlFor={`${ids}-mechanic`} className="sr-only">
              Mechanic Pack
            </label>
            <select
              id={`${ids}-mechanic`}
              value={mechanicFilter}
              onChange={(event) => setMechanicFilter(event.target.value)}
              className={`${fieldClasses} max-w-full min-w-0`}
            >
              <option value={ALL}>Tüm mechanicler</option>
              {mechanics.map((pack) => (
                <option key={pack} value={pack}>
                  {pack}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={isPoolOnly}
                disabled={status === undefined}
                onChange={(event) => setIsPoolOnly(event.target.checked)}
                className="size-4 accent-gold"
              />
              Yalnızca havuzdakiler
            </label>
          </>
        ) : null}
        <div role="group" aria-label="Görünüm" className="flex gap-2">
          <Button
            variant={view === 'cards' ? 'primary' : 'secondary'}
            aria-pressed={view === 'cards'}
            onClick={() => setView('cards')}
          >
            ▦ Kartlar
          </Button>
          <Button
            variant={view === 'list' ? 'primary' : 'secondary'}
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
          >
            ☷ Liste
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-ink-muted">
        <p aria-live="polite">
          {shown.length === cards.length
            ? `${cards.length} kart`
            : `${shown.length} kart (toplam ${cards.length})`}
        </p>
        {deck === 'legend' && status ? (
          <p aria-label="Havuz durumu">
            Havuzda {status.poolCount} · Ellerde {status.handCount}
          </p>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">Kart bulunamadı.</p>
      ) : view === 'cards' ? (
        <CardDeck
          as="ul"
          label="Kartlar"
          deck="library"
          items={shown}
          itemKey={(card) => card.id}
          renderItem={(card) => {
            const cardStatus = status?.byCard.get(card.id)
            return (
              <CardFace
                card={card}
                isTiltable
                heldBy={
                  cardStatus && isMarkedHeld(card, cardStatus) ? cardStatus.holderNames : undefined
                }
                statusMark={showsStatus ? STATUS_LABELS[card.status] : undefined}
                isDmOnlyMarked={statusFilter !== undefined && card.dmOnly}
                onEdit={onEdit ? () => onEdit(card) : undefined}
                historyPath={linksHistory ? cardHistoryPath(card) : undefined}
              />
            )
          }}
        />
      ) : (
        <CardTable
          deck={deck}
          cards={shown}
          sort={sort}
          onSort={changeSort}
          statusText={statusText}
          onEdit={onEdit}
          marksDmOnly={statusFilter !== undefined}
          linksHistory={linksHistory}
        />
      )}
    </div>
  )
}
