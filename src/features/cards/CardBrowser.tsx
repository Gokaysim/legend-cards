import { useDeferredValue, useId, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { SubscriptionError } from '@/lib/firestore/errors'
import type { Subscription } from '@/lib/firestore/subscription'

import { CardFace } from './CardFace'
import type { Deck } from './cardsContext'
import { CardTable } from './CardTable'
import { cardHaystack, cardMatchesQuery, setLabel } from './display'
import type { Card } from './schema'
import { setOrder } from './sets'
import { type CardSort, compareLabels, DEFAULT_SORT, type SortKey, sortCards } from './sort'

type View = 'cards' | 'list'

const ALL = ''

const fieldClasses =
  'rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

function errorMessage(error: SubscriptionError): string {
  return error.kind === 'invalid-data'
    ? 'Kartlar yüklenemedi: kart verisi beklenen biçimde değil. Kart import’unu yeniden çalıştırmak gerekebilir.'
    : 'Kartlar yüklenemedi.'
}

/**
 * The set filter's options: the sets that have cards, in shop order (unknown codes after the known ones,
 * alphabetically), followed by "Blessed" when Blessed cards exist. Values are the shown labels.
 */
function setOptions(cards: readonly Card[]): string[] {
  const known = new Map<string, number>()
  let hasBlessed = false
  for (const card of cards) {
    if (card.kind === 'blessed') hasBlessed = true
    else if (card.setCode !== null)
      known.set(setLabel(card) ?? card.setCode, setOrder(card.setCode))
  }
  const sets = [...known].sort(([a, orderA], [b, orderB]) => orderA - orderB || compareLabels(a, b))
  return [...sets.map(([label]) => label), ...(hasBlessed ? ['Blessed'] : [])]
}

/** The mechanic pack filter's options: the packs that have cards, in Turkish alphabetical order. */
function mechanicOptions(cards: readonly Card[]): string[] {
  const packs = new Set(cards.flatMap((card) => (card.mechanicPack ? [card.mechanicPack] : [])))
  return [...packs].sort(compareLabels)
}

export type CardBrowserProps = {
  deck: Deck
  /** The deck's active cards (see `useDeckCards`). */
  cards: Subscription<Card[]>
}

/**
 * Browses one deck: search, the set and mechanic pack filters (Legend deck only), a card view and a sortable
 * list view, with the loading, error and empty states. Shared by the Kart kütüphanesi and the Cursed Deck.
 */
export function CardBrowser({ deck, cards }: CardBrowserProps) {
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
  if (cards.data.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">Henüz kart yok.</p>
    )
  }
  return <LoadedCardBrowser deck={deck} cards={cards.data} />
}

function LoadedCardBrowser({ deck, cards }: { deck: Deck; cards: Card[] }) {
  const ids = useId()
  const [query, setQuery] = useState('')
  const [setFilter, setSetFilter] = useState(ALL)
  const [mechanicFilter, setMechanicFilter] = useState(ALL)
  const [view, setView] = useState<View>('cards')
  const [sort, setSort] = useState<CardSort>(DEFAULT_SORT)
  const deferredQuery = useDeferredValue(query)

  const haystacks = useMemo(
    () => new Map(cards.map((card) => [card.id, cardHaystack(card)])),
    [cards],
  )
  const sets = useMemo(() => (deck === 'legend' ? setOptions(cards) : []), [cards, deck])
  const mechanics = useMemo(() => (deck === 'legend' ? mechanicOptions(cards) : []), [cards, deck])

  const shown = useMemo(() => {
    const matching = cards.filter(
      (card) =>
        (setFilter === ALL || setLabel(card) === setFilter) &&
        (mechanicFilter === ALL || card.mechanicPack === mechanicFilter) &&
        cardMatchesQuery(haystacks.get(card.id) ?? '', deferredQuery),
    )
    return sortCards(matching, sort)
  }, [cards, haystacks, setFilter, mechanicFilter, deferredQuery, sort])

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

      <p aria-live="polite" className="text-sm text-ink-muted">
        {shown.length === cards.length
          ? `${cards.length} kart`
          : `${shown.length} kart (toplam ${cards.length})`}
      </p>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">Kart bulunamadı.</p>
      ) : view === 'cards' ? (
        <ul
          aria-label="Kartlar"
          className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3"
        >
          {shown.map((card) => (
            <li key={card.id}>
              <CardFace card={card} />
            </li>
          ))}
        </ul>
      ) : (
        <CardTable deck={deck} cards={shown} sort={sort} onSort={changeSort} />
      )}
    </div>
  )
}
