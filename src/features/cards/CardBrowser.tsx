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
import { costChoices, hasCost } from './filters'
import type { Definition } from './schema'
import { BLESSED_SET_CHOICE, setChoices } from './setChoices'
import {
  type CardSort,
  compareLabels,
  DEFAULT_SORT,
  type SortKey,
  sortCards,
  type StatusText,
} from './sort'
import { type CardStatus, isMarkedHeld, statusLabel } from './status'
import { LEGEND_COLUMNS, PLAIN_COLUMNS } from './tableColumns'

type View = 'cards' | 'list'

/** What a browser lists: a deck of cards, or the True Words. */
export type BrowserDeck = Deck | 'words'

const ALL = ''

const fieldClasses =
  'rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

/** The Turkish texts of a browser, by what it lists. */
type BrowserTexts = {
  /** The count line's noun: "8 kart", "3 True Word". */
  noun: string
  loading: string
  /** Shown when there is nothing at all. */
  empty: string
  /** Shown when the search and the filters keep nothing. */
  notFound: string
  /** Shown when the definitions cannot be read. */
  error: string
  /** Shown when the stored definitions are not in the expected shape: the import may need to run again. */
  invalidData: string
}

const CARD_TEXTS: BrowserTexts = {
  noun: 'kart',
  loading: 'Kartlar yükleniyor…',
  empty: 'Henüz kart yok.',
  notFound: 'Kart bulunamadı.',
  error: 'Kartlar yüklenemedi.',
  invalidData:
    'Kartlar yüklenemedi: kart verisi beklenen biçimde değil. Kart import’unu yeniden çalıştırmak gerekebilir.',
}

const WORD_TEXTS: BrowserTexts = {
  noun: 'True Word',
  loading: 'True Words yükleniyor…',
  empty: 'Henüz True Word yok.',
  notFound: 'True Word bulunamadı.',
  error: 'True Words yüklenemedi.',
  invalidData:
    'True Words yüklenemedi: True Word verisi beklenen biçimde değil. True Words import’unu yeniden çalıştırmak gerekebilir.',
}

/**
 * The on/off filter of a tab (spec: card-library). `keeps` is what a shown definition passes while it is on, from its
 * status and whether the chosen player knows it.
 */
type Toggle = {
  label: string
  keeps: (status: CardStatus | undefined, isKnown: boolean) => boolean
}

/**
 * What differs between the Kütüphane's tabs (design D3 of merge-library-tabs): the Kartlar tab alone has the set and
 * mechanic pack filters and their columns; each tab has its own on/off filter.
 */
type Setup = {
  hasSetFilters: boolean
  columns: readonly SortKey[]
  texts: BrowserTexts
  toggle: Toggle
}

const SETUPS: Record<BrowserDeck, Setup> = {
  legend: {
    hasSetFilters: true,
    columns: LEGEND_COLUMNS,
    texts: CARD_TEXTS,
    toggle: { label: 'Yalnızca havuzdakiler', keeps: (status) => status?.inPool === true },
  },
  cursed: {
    hasSetFilters: false,
    columns: PLAIN_COLUMNS,
    texts: CARD_TEXTS,
    toggle: {
      label: 'Yalnızca eldekiler',
      keeps: (status) => (status?.holderNames.length ?? 0) > 0,
    },
  },
  words: {
    hasSetFilters: false,
    columns: PLAIN_COLUMNS,
    texts: WORD_TEXTS,
    toggle: { label: 'Yalnızca öğrenilmemişler', keeps: (_status, isKnown) => !isKnown },
  },
}

/**
 * Where the listed definitions are, live: each one's status and, for a deck of cards, the pool's count and the copies
 * in hands. A True Word's holders are those who know it.
 */
export type BrowserStatus = {
  byCard: ReadonlyMap<string, CardStatus>
  poolCount?: number
  handCount?: number
}

function errorMessage(error: SubscriptionError, texts: BrowserTexts): string {
  return error.kind === 'invalid-data' ? texts.invalidData : texts.error
}

/** The mechanic pack filter's options: the packs that have cards, in Turkish alphabetical order. */
function mechanicOptions(cards: readonly Definition[]): string[] {
  const packs = new Set(cards.flatMap((card) => (card.mechanicPack ? [card.mechanicPack] : [])))
  return [...packs].sort(compareLabels)
}

export type CardBrowserProps<T extends Definition> = {
  /** The Legend deck (the Kartlar tab), the Cursed deck, or the True Words. */
  deck: BrowserDeck
  /** The active definitions (see `useDeckCards`), or for the DM those the status filter keeps. */
  cards: Subscription<T[]>
  /**
   * Where the definitions are, live. Until it is known, they show without a status, and the Kartlar and Cursed tabs'
   * on/off filter is off.
   */
  status?: BrowserStatus
  /**
   * On the True Words: whether the chosen player knows a word, marked "Biliyor". Until it is known, the words show
   * unmarked, and "Yalnızca öğrenilmemişler" is off.
   */
  isKnown?: (card: T) => boolean
  /**
   * For the DM: the status filter (spec: card-library, "The DM's status filter"). Outside "Yayında", each face and row
   * shows its definition status. With it, the toolbar stays even when the filter keeps nothing.
   */
  statusFilter?: { value: CardFilterValue; onChange: (value: CardFilterValue) => void }
  /** For the DM: each definition's "✎ Düzenle" control. */
  onEdit?: (card: T) => void
  /**
   * In the Kartlar and Cursed tabs: each face gets the clock control and each list row's name a link to the card's
   * Kart geçmişi (spec: card-library, "History control on library faces").
   */
  linksHistory?: boolean
  /**
   * In the Kartlar tab: called with the code of the set the Set filter chooses, or `null` for "Tüm setler" and for
   * Blessed, which is not a set. The Kütüphane shows the chosen set's Cardmaker (design D5 of
   * `show-set-art-on-draws-and-library`).
   */
  onSetFilterChange?: (setCode: string | null) => void
}

/**
 * Browses one tab of the Kütüphane (spec: card-library): the search, the Cost filter, the set and mechanic pack filters
 * of the Kartlar tab, each tab's on/off filter, a card view and a sortable list view with each definition's Durum, the
 * count line, and the loading, error and empty states.
 */
export function CardBrowser<T extends Definition>({
  deck,
  cards,
  status,
  isKnown,
  statusFilter,
  onEdit,
  linksHistory = false,
  onSetFilterChange,
}: CardBrowserProps<T>) {
  const { texts } = SETUPS[deck]
  if (cards.status === 'loading') {
    return <Spinner label={texts.loading} className="py-12" />
  }
  if (cards.status === 'error') {
    return (
      <p role="alert" className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink">
        {errorMessage(cards.error, texts)}
      </p>
    )
  }
  if (cards.data.length === 0 && statusFilter === undefined) {
    return <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">{texts.empty}</p>
  }
  return (
    <LoadedCardBrowser
      deck={deck}
      cards={cards.data}
      status={status}
      isKnown={isKnown}
      statusFilter={statusFilter}
      onEdit={onEdit}
      linksHistory={linksHistory}
      onSetFilterChange={onSetFilterChange}
    />
  )
}

function LoadedCardBrowser<T extends Definition>({
  deck,
  cards,
  status,
  isKnown,
  statusFilter,
  onEdit,
  linksHistory,
  onSetFilterChange,
}: Omit<CardBrowserProps<T>, 'cards' | 'linksHistory'> & { cards: T[]; linksHistory: boolean }) {
  const ids = useId()
  const setup = SETUPS[deck]
  const [query, setQuery] = useState('')
  const [setFilter, setSetFilter] = useState(ALL)
  const [mechanicFilter, setMechanicFilter] = useState(ALL)
  const [costFilter, setCostFilter] = useState(ALL)
  const [isToggleOn, setIsToggleOn] = useState(false)
  const [view, setView] = useState<View>('cards')
  const [sort, setSort] = useState<CardSort>(DEFAULT_SORT)
  const deferredQuery = useDeferredValue(query)

  const setIndex = useSetIndex()
  const { setName } = setIndex
  const haystacks = useMemo(
    () => new Map(cards.map((card) => [card.id, cardHaystack(card, setName)])),
    [cards, setName],
  )
  const setChoiceList = useMemo(
    () => (setup.hasSetFilters ? setChoices(cards, setIndex, { withBlessed: true }) : []),
    [cards, setup, setIndex],
  )
  const sets = useMemo(() => setChoiceList.map((choice) => choice.label), [setChoiceList])
  const chooseSet = (label: string) => {
    setSetFilter(label)
    const code = setChoiceList.find((choice) => choice.label === label)?.code ?? null
    onSetFilterChange?.(code === BLESSED_SET_CHOICE ? null : code)
  }
  const mechanics = useMemo(
    () => (setup.hasSetFilters ? mechanicOptions(cards) : []),
    [cards, setup],
  )
  const costs = useMemo(() => costChoices(cards), [cards])

  // The on/off filter needs the statuses (Kartlar, Cursed) or the chosen player's words (True Words).
  const canToggle = deck === 'words' ? isKnown !== undefined : status !== undefined
  // Outside "Yayında", the DM sees each definition's status before where it is.
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
        (costFilter === ALL || hasCost(card, costFilter)) &&
        (!isToggleOn ||
          !canToggle ||
          setup.toggle.keeps(status?.byCard.get(card.id), isKnown?.(card) ?? false)) &&
        cardMatchesQuery(haystacks.get(card.id) ?? '', deferredQuery),
    )
    return sortCards(matching, sort, statusText, setName)
  }, [
    cards,
    haystacks,
    setFilter,
    mechanicFilter,
    costFilter,
    isToggleOn,
    canToggle,
    setup,
    status,
    isKnown,
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

  const select = (
    name: string,
    value: string,
    onChange: (value: string) => void,
    allLabel: string,
    choices: readonly string[],
  ) => (
    <>
      <label htmlFor={`${ids}-${name}`} className="sr-only">
        {name}
      </label>
      <select
        id={`${ids}-${name}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClasses} max-w-full min-w-0`}
      >
        <option value={ALL}>{allLabel}</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
    </>
  )

  // The True Words tab says how many words the chosen player knows in its draft section, above the list.
  const countNote =
    deck === 'words' || status?.handCount === undefined
      ? null
      : deck === 'legend'
        ? {
            label: 'Havuz durumu',
            text: `Havuzda ${status.poolCount ?? 0} · Ellerde ${status.handCount}`,
          }
        : { label: 'Eldeki kopyalar', text: `Ellerde ${status.handCount}` }

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
        {setup.hasSetFilters ? (
          <>
            {select('Set', setFilter, chooseSet, 'Tüm setler', sets)}
            {select(
              'Mechanic Pack',
              mechanicFilter,
              setMechanicFilter,
              'Tüm mechanicler',
              mechanics,
            )}
          </>
        ) : null}
        {select('Cost', costFilter, setCostFilter, 'Tüm cost’lar', costs)}
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isToggleOn}
            disabled={!canToggle}
            onChange={(event) => setIsToggleOn(event.target.checked)}
            className="size-4 accent-gold"
          />
          {setup.toggle.label}
        </label>
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
            ? `${cards.length} ${setup.texts.noun}`
            : `${shown.length} ${setup.texts.noun} (toplam ${cards.length})`}
        </p>
        {countNote ? <p aria-label={countNote.label}>{countNote.text}</p> : null}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
          {setup.texts.notFound}
        </p>
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
                isKnown={isKnown?.(card)}
                statusMark={showsStatus ? STATUS_LABELS[card.status] : undefined}
                isHiddenMarked={statusFilter !== undefined && !card.isInLibrary}
                onEdit={onEdit ? () => onEdit(card) : undefined}
                historyPath={linksHistory ? cardHistoryPath(card) : undefined}
              />
            )
          }}
        />
      ) : (
        <CardTable
          columns={setup.columns}
          cards={shown}
          sort={sort}
          onSort={changeSort}
          statusText={statusText}
          onEdit={onEdit}
          marksHidden={statusFilter !== undefined}
          isKnown={isKnown}
          linksHistory={linksHistory}
        />
      )}
    </div>
  )
}
