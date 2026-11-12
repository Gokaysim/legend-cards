import { useDeferredValue, useId, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { useCards } from '@/features/cards/cardsContext'
import { cardHaystack, cardMatchesQuery, kindLabel, setLabel } from '@/features/cards/display'
import type { Card } from '@/features/cards/schema'
import { compareLabels } from '@/features/cards/sort'
import { statusLabel } from '@/features/cards/status'
import { searchTerms } from '@/features/cards/text'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useProfiles } from '@/features/users/usersContext'
import { genitive } from '@/lib/turkish'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { useCardStatuses } from './cardStatus'
import { type HoldingFailure, holdingFailureMessage, toHoldingFailure } from './errors'
import { useHoldingActions } from './holdingsContext'

/** At most this many results are listed; a narrower search shows the rest. */
const RESULT_LIMIT = 30

/** A held normal card waiting for the DM to confirm an extra copy. */
type ExtraCopyQuestion = { card: Card; holderName: string }

export type GiveCardDialogProps = {
  /** The player who gets the cards. */
  receiver: UserProfile
  onClose: () => void
}

/**
 * The DM's "+ Kart ver": searches every active card of both decks as the library does, shows each card's status,
 * and gives the chosen card. A held normal card first asks whether to give an extra copy. The dialog stays open
 * after a give, so the DM can give several cards in a row.
 */
export function GiveCardDialog({ receiver, onClose }: GiveCardDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const cards = useCards()
  const profiles = useProfiles()
  const statuses = useCardStatuses()
  const actions = useHoldingActions()
  const isOnline = useOnlineStatus()
  const receiverName = profileName(receiver)

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [question, setQuestion] = useState<ExtraCopyQuestion | null>(null)
  const [busyCardId, setBusyCardId] = useState<string | null>(null)
  const [failure, setFailure] = useState<HoldingFailure | null>(null)
  const [given, setGiven] = useState<string | null>(null)

  const haystacks = useMemo(
    () =>
      new Map(
        cards.status === 'ready' ? cards.data.map((card) => [card.id, cardHaystack(card)]) : [],
      ),
    [cards],
  )
  const hasQuery = searchTerms(deferredQuery).length > 0
  const matches = useMemo(() => {
    if (cards.status !== 'ready' || !hasQuery) return []
    return cards.data
      .filter((card) => cardMatchesQuery(haystacks.get(card.id) ?? '', deferredQuery))
      .sort((a, b) => compareLabels(a.name, b.name))
  }, [cards, haystacks, deferredQuery, hasQuery])

  const nameOf = (holderUid: string | null) =>
    (profiles.status === 'ready' && profiles.data.find((profile) => profile.id === holderUid)) ||
    null

  const give = async (card: Card, allowExtraCopy: boolean) => {
    if (uid === null) return
    setFailure(null)
    setGiven(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setBusyCardId(card.id)
    try {
      await actions.giveCard({ cardId: card.id, uid: receiver.id, by: uid, allowExtraCopy })
      setQuestion(null)
      setGiven(`${card.name} → ${receiverName}`)
    } catch (error) {
      const result = toHoldingFailure(error)
      if (result.kind === 'taken' && !allowExtraCopy) {
        // Someone took the card meanwhile: offer the extra copy instead.
        const holder = nameOf(result.holderUid)
        setQuestion({ card, holderName: holder ? profileName(holder) : 'Başka bir oyuncu' })
      } else {
        setQuestion(null)
        setFailure(result)
      }
    } finally {
      setBusyCardId(null)
    }
  }

  // A held normal card gets an extra copy only after asking. A DM-only card is never in the pool, so its holder, not
  // the pool, tells whether someone holds it.
  const choose = (card: Card) => {
    const status = statuses?.get(card.id)
    if (card.kind === 'normal' && card.holder !== null) {
      setFailure(null)
      setGiven(null)
      setQuestion({ card, holderName: status?.holderNames[0] ?? 'Başka bir oyuncu' })
      return
    }
    void give(card, false)
  }

  return (
    <Dialog title={`Kart ver: ${receiverName}`} onClose={onClose}>
      <label htmlFor={`${ids}-search`} className="sr-only">
        Kart ara
      </label>
      <input
        id={`${ids}-search`}
        type="search"
        data-autofocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="İsim / metin ara (örn: discard, draw)"
        className="w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
      />

      {question ? (
        <div className="flex flex-col gap-2 rounded-xl border border-gold bg-pane-raised p-3">
          <p className="text-sm text-ink">
            <span lang="en" className="font-semibold">
              {question.card.name}
            </span>
            {`: ${genitive(question.holderName)} elinde. Ek kopya verilsin mi?`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={busyCardId !== null}
              onClick={() => void give(question.card, true)}
            >
              Ek kopya ver
            </Button>
            <Button disabled={busyCardId !== null} onClick={() => setQuestion(null)}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}

      {given ? (
        <p
          role="status"
          className="rounded-lg border border-green bg-pane-raised p-3 text-sm text-ink"
        >
          Verildi: {given}
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

      {cards.status === 'loading' ? (
        <Spinner label="Kartlar yükleniyor…" className="py-6" />
      ) : cards.status === 'error' ? (
        <p role="alert" className="text-sm text-danger-ink">
          Kartlar yüklenemedi.
        </p>
      ) : !hasQuery ? (
        <p className="text-sm text-ink-muted">
          Vermek istediğin kartı isim, set ya da metinle ara.
        </p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-ink-muted">Kart bulunamadı.</p>
      ) : (
        <>
          <ul aria-label="Arama sonuçları" className="flex flex-col divide-y divide-line">
            {matches.slice(0, RESULT_LIMIT).map((card) => {
              const status = statuses?.get(card.id)
              const kind = kindLabel(card)
              return (
                <li key={card.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p lang="en" className="text-sm font-semibold break-words text-ink">
                      {card.name}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {[
                        card.kind === 'normal' ? setLabel(card) : null,
                        kind ?? (status ? statusLabel(card, status) : null),
                      ]
                        .filter((part) => part !== null)
                        .join(' · ')}
                    </p>
                  </div>
                  <Button
                    className="shrink-0"
                    disabled={busyCardId !== null}
                    aria-label={`${card.name} ver`}
                    onClick={() => choose(card)}
                  >
                    {busyCardId === card.id ? 'Veriliyor…' : 'Ver'}
                  </Button>
                </li>
              )
            })}
          </ul>
          <p aria-live="polite" className="text-xs text-ink-muted">
            {matches.length > RESULT_LIMIT
              ? `${matches.length} sonuçtan ilk ${RESULT_LIMIT} gösteriliyor. Aramayı daralt.`
              : `${matches.length} sonuç`}
          </p>
        </>
      )}
    </Dialog>
  )
}
