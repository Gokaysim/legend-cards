import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { cardBack, CURSED_BACK, NEUTRAL_BACK, type SpreadBack } from '@/features/art/spreadBack'
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
import {
  drawPrice,
  filtersUnderMode,
  isPricedDraw,
  parseDrawPrice,
  PLAYER_DRAW_LABELS,
  type PlayerDrawTools,
  playerDrawTools,
} from '@/features/table/playerDraw'
import { usePlayerDrawMode } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'
import { genitive } from '@/lib/turkish'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import type { DrawResult } from './api'
import { DeckPile } from './DeckPile'
import { useDrawActions, useDrawSessions } from './drawsContext'
import { DrawPriceControl } from './DrawPriceControl'
import { DrawError, type DrawFailure, drawFailureMessage, toDrawFailure } from './errors'
import { FaceDownCard } from './FaceDownCard'
import { DRAW_LIMITS, DRAW_PRICE, type DrawKind } from './schema'
import { isSessionCardUp, SESSION_TICK_MS, sessionState } from './sessions'
import { DrawSpread } from './table/DrawSpread'
import { DrawTable } from './table/DrawTable'
import { LiveMark } from './table/LiveMark'
import { TableChip, TableChips } from './table/TableChip'
import { useShockOnTurn } from './useShockOnTurn'
import { useNow } from '@/lib/useNow'

const TITLES: Record<DrawKind, string> = {
  random: '🎲 Kart Çek',
  cursed: '☠ Cursed Kart Çek',
}

/** "Destede ne var?" shows this many more cards each time. */
const PEEK_PAGE = 20

/**
 * A drawn card with its back (spec: card-draws, "The deck's back"): the Cursed back in a Cursed draw, and the card's own
 * back in a random draw. And its place in its draw session (spec: live-draws). A dialog's cards are in one session, unless it went stale or was ended meanwhile.
 */
type Drawn = { result: DrawResult; back: SpreadBack; sessionId: string; index: number }

/** The dialog's current session: its ID, and how many of its cards were drawn here. */
type OwnSession = { id: string; count: number }

const turnKey = ({ sessionId, index }: Pick<Drawn, 'sessionId' | 'index'>) =>
  `${sessionId}:${index}`

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
 * - A player's random draw has the tools the table's player draw mode gives (spec: card-draws, "A player's draw tools
 *   follow the mode"): none, the filter pills, or also the keyword and "Destede ne var?". When the DM changes the
 *   mode, the dialog drops what the new mode no longer allows at once.
 * - The DM's random draw can be narrowed with the filter pills and the keyword, and can look into the deck.
 * - The price (design D5 of adjustable-draw-price): under "Kapalı" a player's random draw costs 1 LP and the DM's is
 *   free. While the mode is on, both dialogs show the price control, starting at 1 LP, and each draw costs the price
 *   shown, from the hand owner's LP. Every change of the mode puts the price back to 1 LP.
 * - A Cursed draw is free for both, and has no tools.
 *
 * Every other device watches the draws (spec: live-draws): the first draw starts the dialog's session, each card is
 * turned for everyone through it, and closing the dialog ends it once any draw still running has settled. A session
 * that went stale or was ended meanwhile is replaced by a new one at the next draw.
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

  const playerMode = usePlayerDrawMode()
  const tools: PlayerDrawTools =
    mode !== 'random'
      ? { filters: false, keyword: false, peek: false }
      : isDm
        ? { filters: true, keyword: true, peek: true }
        : playerDrawTools(playerMode)
  const priced = isPricedDraw(mode, playerMode)
  const hasFilters = tools.filters

  const [filters, setFilters] = useState<DrawFilters>(NO_FILTERS)
  const [priceText, setPriceText] = useState(String(DRAW_PRICE))
  const chosen = priced ? parseDrawPrice(priceText) : DRAW_PRICE
  /** The next draw's price, or `null` while the price control holds no valid price. */
  const price =
    chosen === null ? null : drawPrice({ kind: mode, byDm: isDm, mode: playerMode, chosen })
  const paid = price !== null && price > 0
  /** The price as the chips, the draw control and the note show it: "3". */
  const shownPrice = formatAmount(price ?? 0)
  const [drawn, setDrawn] = useState<Drawn[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<DrawFailure | null>(null)
  const [peekCount, setPeekCount] = useState(0)
  const [turnedHere, setTurnedHere] = useState<ReadonlySet<string>>(new Set())
  // A change of the player draw mode drops what the new mode no longer allows, during the render that sees it.
  const [seenMode, setSeenMode] = useState(playerMode)
  if (seenMode !== playerMode) {
    setSeenMode(playerMode)
    setPriceText(String(DRAW_PRICE))
    if (!isDm) {
      setFilters((current) => filtersUnderMode(playerMode, current))
      if (!playerDrawTools(playerMode).peek) setPeekCount(0)
    }
  }
  const sessions = useDrawSessions()
  const now = useNow(SESSION_TICK_MS)
  const ownSession = useRef<OwnSession | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)
  const latest = useRef({ actions, uid, sessions })
  useEffect(() => {
    latest.current = { actions, uid, sessions }
  })

  // Closing the dialog ends its session, after a draw that is still running has settled (design D3 of live-draws).
  useEffect(
    () => () => {
      const end = () => {
        const session = ownSession.current
        const { actions: current, uid: by, sessions: stored } = latest.current
        if (session === null || session.count === 0 || by === null) return
        const found = stored.find((entry) => entry.id === session.id)
        if (found && sessionState(found, Date.now()) === 'ended') return
        current.endDrawSession(session.id, by).catch(() => undefined)
      }
      if (inFlight.current) void inFlight.current.finally(end)
      else end()
    },
    [],
  )

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

  // The deck shows the chosen set's cardback. A drawn card shows its own back instead (`cardBack`), which under a set
  // filter is the same one.
  const deckBack: SpreadBack =
    mode === 'cursed'
      ? CURSED_BACK
      : hasFilters && filters.setCode !== null
        ? { kind: 'set', setCode: filters.setCode }
        : NEUTRAL_BACK

  const isShort = paid && owner.lp < price
  const canDraw =
    uid !== null &&
    !isBusy &&
    price !== null &&
    !isShort &&
    candidates !== null &&
    candidates.length > 0

  /** The session the next draw joins: a new one at first, and after the last one went stale. */
  const sessionForDraw = (): OwnSession => {
    const current = ownSession.current
    const stored = current && sessions.find((entry) => entry.id === current.id)
    if (current === null || (stored && sessionState(stored, Date.now()) === 'ended')) {
      ownSession.current = { id: actions.newSessionId(), count: 0 }
    }
    return ownSession.current as OwnSession
  }

  const runDraw = async (by: string, drawFrom: NonNullable<typeof candidates>, cost: number) => {
    const input = {
      kind: mode,
      uid: owner.id,
      by,
      price: cost,
      byDm: isDm,
      filters: hasFilters ? activeFilters(filters) : null,
      candidates: drawFrom,
    }
    let session = sessionForDraw()
    try {
      let result: DrawResult
      try {
        result = await actions.drawCard({ ...input, sessionId: session.id })
      } catch (error) {
        // The DM or another tab ended the session meanwhile: draw once more, into a new one.
        if (!(error instanceof DrawError && error.kind === 'session-ended')) throw error
        session = { id: actions.newSessionId(), count: 0 }
        ownSession.current = session
        result = await actions.drawCard({ ...input, sessionId: session.id })
      }
      const index = session.count
      session.count += 1
      const back = mode === 'cursed' ? CURSED_BACK : cardBack(result.card)
      setDrawn((current) => [...current, { result, back, sessionId: session.id, index }])
    } catch (error) {
      const failure = toDrawFailure(error)
      if (failure.kind === 'mode-changed') {
        // The server's mode no longer allows these filters or this price, even if this device has not heard of the
        // change yet.
        setFilters(NO_FILTERS)
        setPeekCount(0)
        setPriceText(String(DRAW_PRICE))
      }
      setFailure(failure)
    }
  }

  const draw = async () => {
    if (!canDraw || uid === null || candidates === null || price === null) return
    setFailure(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsBusy(true)
    const running = runDraw(uid, candidates, price)
    inFlight.current = running
    await running
    if (inFlight.current === running) inFlight.current = null
    setIsBusy(false)
  }

  /** Whether a drawn card is face up: turned here or on another device, or its session has ended. */
  const isUp = (entry: Drawn) => {
    if (turnedHere.has(turnKey(entry))) return true
    const stored = sessions.find((session) => session.id === entry.sessionId)
    return stored !== undefined && isSessionCardUp(stored, entry.index, sessionState(stored, now))
  }

  const turn = (entry: Drawn) => {
    setTurnedHere((current) => new Set([...current, turnKey(entry)]))
    actions.turnDrawCard(entry.sessionId, entry.index).catch(() => undefined)
  }

  // The shocked pair for a Blessed card turned here or on another device; not for the cards a session's end shows.
  const turnedKeys = drawn
    .filter((entry) => {
      const stored = sessions.find((session) => session.id === entry.sessionId)
      return turnedHere.has(turnKey(entry)) || (stored?.turned.includes(entry.index) ?? false)
    })
    .map(turnKey)
  const isBlessedKey = useCallback(
    (key: string) =>
      drawn.some((entry) => turnKey(entry) === key && entry.result.card.kind === 'blessed'),
    [drawn],
  )
  useShockOnTurn(turnedKeys, isBlessedKey, shock)

  const control =
    mode === 'cursed' ? '☠ Cursed Kart Çek' : paid ? `🎲 Çek · ${shownPrice} LP` : '🎲 Çek'

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
      <TableChips label="Çekiş">
        <TableChip variant={mode === 'cursed' ? 'cursed' : 'plain'}>
          {mode === 'cursed' ? '☠ Cursed' : '🎲 Rastgele'}
        </TableChip>
        <TableChip>{`${genitive(ownerName)} eline`}</TableChip>
        {mode === 'random' && !isDm && playerMode !== 'off' ? (
          <TableChip variant="mode">{`✦ ${PLAYER_DRAW_LABELS[playerMode]}`}</TableChip>
        ) : null}
        {paid || priced ? (
          <TableChip variant="gold">
            <span className="sr-only">Bakiye: </span>
            <span className="tabular-nums">{formatAmount(owner.lp)} LP</span>
          </TableChip>
        ) : null}
        {price === null ? null : paid ? (
          <TableChip>Her kart {shownPrice} LP</TableChip>
        ) : (
          <TableChip>Ücretsiz</TableChip>
        )}
      </TableChips>

      {priced ? <DrawPriceControl value={priceText} onChange={setPriceText} /> : null}

      {hasFilters && pool !== null ? (
        <FilterBar
          pills={pills}
          keyword={
            tools.keyword
              ? {
                  value: filters.keyword ?? '',
                  onChange: (keyword) =>
                    setFilters((current) => ({ ...current, keyword: keyword || null })),
                  maxLength: DRAW_LIMITS.keyword,
                }
              : undefined
          }
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

      {isShort ? (
        <p className="text-sm text-ink-muted">{`Kart çekmek için ${shownPrice} LP gerekiyor.`}</p>
      ) : null}

      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {drawFailureMessage(failure, ownerName)}
        </p>
      ) : null}

      <DrawTable
        tone={mode === 'cursed' ? 'cursed' : 'neutral'}
        source={
          <>
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
            {tools.peek ? (
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
          </>
        }
      >
        <section aria-labelledby={`${ids}-drawn`} className="flex flex-col gap-3">
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
            <DrawSpread
              items={drawn}
              itemKey={({ result }) => result.drawId}
              renderItem={(entry, index) => (
                <FaceDownCard
                  card={entry.result.card}
                  position={index + 1}
                  back={entry.back}
                  isRevealed={isUp(entry)}
                  onReveal={() => turn(entry)}
                />
              )}
            />
          )}
        </section>
      </DrawTable>

      <p className="flex items-center gap-2 text-sm text-ink-muted">
        <LiveMark />
        Herkes bu çekişi canlı görür; çevirdiğin kartlar onlarda da döner.
      </p>

      {tools.peek && peekCount > 0 ? (
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
