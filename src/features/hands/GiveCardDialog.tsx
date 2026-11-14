import { useDeferredValue, useId, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { CardFace } from '@/features/cards/CardFace'
import { useCards } from '@/features/cards/cardsContext'
import { cardHaystack, cardMatchesQuery } from '@/features/cards/display'
import { FilterBar } from '@/features/cards/FilterBar'
import {
  applyFacets,
  type CardTest,
  facetChoices,
  type FacetKey,
  type FacetValues,
  giveFacets,
} from '@/features/cards/filters'
import type { Card } from '@/features/cards/schema'
import { compareLabels } from '@/features/cards/sort'
import { type CardStatus, DM_ONLY_LABEL } from '@/features/cards/status'
import { searchTerms } from '@/features/cards/text'
import { useSetIndex } from '@/features/sets/setsContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useProfiles } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import { genitive } from '@/lib/turkish'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { useCardStatuses } from './cardStatus'
import { type HoldingFailure, holdingFailureMessage, toHoldingFailure } from './errors'
import { useHoldingActions } from './holdingsContext'

/** The grid shows this many more cards each time (spec: card-holdings, "Browsing the cards to give"). */
const PAGE = 20

/** The selected card, and for a held normal card the holder to name before an extra copy. */
type Selection = { card: Card; holderName: string | null }

type Badge = { text: string; tone: 'pool' | 'held' | 'dmOnly' | 'cursed' }

const BADGE_TONES: Record<Badge['tone'], string> = {
  pool: 'border-green text-green',
  held: 'border-gold text-gold',
  dmOnly: 'border-true-word-line text-true-word',
  cursed: 'border-cursed text-cursed-soft',
}

/** The badge on a face: "DM'e özel", the holders' names, "Havuzda", or "Cursed" for a Cursed card no one holds. */
function badgeOf(card: Card, status: CardStatus | undefined): Badge | null {
  if (card.dmOnly) return { text: DM_ONLY_LABEL, tone: 'dmOnly' }
  const names = status?.holderNames ?? []
  if (card.kind === 'cursed') {
    return { text: names.length > 0 ? names.join(', ') : 'Cursed', tone: 'cursed' }
  }
  if (names.length > 0) return { text: names.join(', '), tone: 'held' }
  return status?.inPool ? { text: 'Havuzda', tone: 'pool' } : null
}

export type GiveCardDialogProps = {
  /** The player who gets the cards. */
  receiver: UserProfile
  onClose: () => void
}

/**
 * The DM's "+ Kart ver" (design D5 of `improve-draw-and-give-dialogs`): every active card of both decks as faces in a
 * grid, by name, 20 at a time, narrowed by the search (as the library's) and the filter pills, each face with its
 * status as a badge. Selecting a face selects the card; the bar at the bottom gives it, and for a held normal card
 * first asks whether to give an extra copy. The dialog stays open after a give, so the DM can give several cards in a
 * row.
 */
export function GiveCardDialog({ receiver, onClose }: GiveCardDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const cards = useCards()
  const sets = useSetIndex()
  const profiles = useProfiles()
  const statuses = useCardStatuses()
  const actions = useHoldingActions()
  const isOnline = useOnlineStatus()
  const receiverName = profileName(receiver)

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [values, setValues] = useState<FacetValues>({})
  const [isPoolOnly, setIsPoolOnly] = useState(false)
  const [page, setPage] = useState({ key: '', limit: PAGE })
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<HoldingFailure | null>(null)
  const [given, setGiven] = useState<string | null>(null)

  const facets = useMemo(() => giveFacets(sets), [sets])
  const haystacks = useMemo(
    () =>
      new Map(
        cards.status === 'ready'
          ? cards.data.map((card) => [card.id, cardHaystack(card, sets.setName)])
          : [],
      ),
    [cards, sets],
  )
  const hasQuery = searchTerms(deferredQuery).length > 0
  const test = useMemo<CardTest>(
    () => (card) =>
      (!isPoolOnly || statuses?.get(card.id)?.inPool === true) &&
      (!hasQuery || cardMatchesQuery(haystacks.get(card.id) ?? '', deferredQuery)),
    [isPoolOnly, statuses, hasQuery, haystacks, deferredQuery],
  )
  const base = cards.status === 'ready' ? cards.data : null
  const matches = useMemo(
    () =>
      base === null
        ? []
        : applyFacets(base, facets, values, test).sort((a, b) => compareLabels(a.name, b.name)),
    [base, facets, values, test],
  )

  // The grid starts again at 20 cards whenever the search or a filter changes.
  const pageKey = JSON.stringify([deferredQuery, values, isPoolOnly])
  const limit = page.key === pageKey ? page.limit : PAGE
  const shown = matches.slice(0, limit)

  const isFiltered = isPoolOnly || Object.values(values).some((value) => value != null)
  const setValue = (key: FacetKey, value: string | null) =>
    setValues((current) => ({ ...current, [key]: value }))

  const holderNameOf = (holderUid: string | null) => {
    const holder =
      profiles.status === 'ready'
        ? profiles.data.find((profile) => profile.id === holderUid)
        : undefined
    return holder ? profileName(holder) : 'Başka bir oyuncu'
  }

  // A held normal card gets an extra copy only after asking. A DM-only card is never in the pool, so its holder, not
  // the pool, tells whether someone holds it.
  const select = (card: Card) => {
    setFailure(null)
    setGiven(null)
    const holderName =
      card.kind === 'normal' && card.holder !== null
        ? (statuses?.get(card.id)?.holderNames[0] ?? holderNameOf(card.holder.uid))
        : null
    setSelection({ card, holderName })
  }

  const give = async () => {
    if (uid === null || selection === null) return
    const { card, holderName } = selection
    const allowExtraCopy = holderName !== null
    setFailure(null)
    setGiven(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsBusy(true)
    try {
      await actions.giveCard({ cardId: card.id, uid: receiver.id, by: uid, allowExtraCopy })
      setSelection(null)
      setGiven(`${card.name} → ${receiverName}`)
    } catch (error) {
      const result = toHoldingFailure(error)
      if (result.kind === 'taken' && !allowExtraCopy) {
        // Someone took the card meanwhile: offer the extra copy instead.
        setSelection({ card, holderName: holderNameOf(result.holderUid) })
      } else {
        setFailure(result)
      }
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <Dialog title={`Kart ver: ${receiverName}`} onClose={onClose} className="sm:max-w-5xl">
      <label htmlFor={`${ids}-search`} className="sr-only">
        Kart ara
      </label>
      <input
        id={`${ids}-search`}
        type="search"
        data-autofocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Kart ara: isim, set ya da metin (örn: discard, draw)"
        className="h-12 w-full rounded-xl border border-control-line bg-control px-4 text-base text-ink placeholder:text-ink-muted"
      />

      {base !== null ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <FilterBar
            className="min-w-0 flex-1"
            pills={facets.map((facet) => ({
              key: facet.key,
              name: facet.name,
              choices: facetChoices(base, facets, values, facet.key, test),
              value: values[facet.key] ?? null,
              onChange: (value) => setValue(facet.key, value),
            }))}
            toggle={{ label: 'Yalnızca havuzdakiler', isOn: isPoolOnly, onChange: setIsPoolOnly }}
            isActive={isFiltered}
            onClear={() => {
              setValues({})
              setIsPoolOnly(false)
            }}
          />
          <p aria-live="polite" className="text-sm text-ink-muted">
            <span className="font-semibold text-ink tabular-nums">{matches.length}</span> kart
          </p>
        </div>
      ) : null}

      {cards.status === 'loading' ? (
        <Spinner label="Kartlar yükleniyor…" className="py-6" />
      ) : cards.status === 'error' ? (
        <p role="alert" className="text-sm text-danger-ink">
          Kartlar yüklenemedi.
        </p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-ink-muted">Kart bulunamadı.</p>
      ) : (
        <>
          <ul
            aria-label="Kartlar"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5"
          >
            {shown.map((card) => {
              const badge = badgeOf(card, statuses?.get(card.id))
              return (
                <li key={card.id} className="relative min-w-0">
                  <CardFace
                    card={card}
                    isSelected={selection?.card.id === card.id}
                    onOpen={() => select(card)}
                    openLabel={`${card.name}: seç`}
                  />
                  {badge ? (
                    <span
                      className={cn(
                        'pointer-events-none absolute top-1.5 left-1/2 z-10 max-w-[calc(100%-4rem)] -translate-x-1/2 truncate rounded-full border bg-canvas px-2 py-0.5 text-[11px] font-bold',
                        BADGE_TONES[badge.tone],
                      )}
                    >
                      {badge.text}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {matches.length > shown.length ? (
            <Button
              className="self-center"
              onClick={() => setPage({ key: pageKey, limit: limit + PAGE })}
            >
              Daha fazla göster
            </Button>
          ) : null}
        </>
      )}

      {/* The footer stays at the bottom of the dialog while the grid scrolls (design D5): what was given, an error,
          and the selected card's bar. */}
      {given || failure || selection ? (
        <div className="sticky bottom-0 z-20 flex flex-col gap-2 bg-pane pt-2 shadow-[0_-12px_24px_var(--color-pane)]">
          {given ? (
            <p role="status" className="text-sm text-green">
              ✓ Verildi: {given}
            </p>
          ) : null}
          {failure ? (
            <p
              role="alert"
              className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
            >
              {holdingFailureMessage(failure)}
            </p>
          ) : null}
          {selection ? (
            <div
              role="region"
              aria-label="Seçili kart"
              className="flex flex-wrap items-center gap-3 rounded-xl border border-gold bg-pane-raised p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold break-words text-ink">
                  <span lang="en">{selection.card.name}</span> → {receiverName}
                </p>
                {selection.holderName !== null ? (
                  <p className="text-sm text-gold">
                    {`${genitive(selection.holderName)} elinde. Ek kopya verilsin mi?`}
                  </p>
                ) : null}
              </div>
              <Button disabled={isBusy} onClick={() => setSelection(null)}>
                Vazgeç
              </Button>
              <Button
                variant="primary"
                disabled={isBusy}
                aria-busy={isBusy}
                onClick={() => void give()}
                className="h-11"
              >
                {isBusy ? 'Veriliyor…' : selection.holderName !== null ? 'Ek kopya ver' : 'Ver'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  )
}
