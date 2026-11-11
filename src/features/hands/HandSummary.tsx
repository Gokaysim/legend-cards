import { type ReactNode, useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { BalanceDialog } from '@/features/balances/BalanceDialog'
import { formatAmount } from '@/features/balances/format'
import { setDisplayName, setOrder } from '@/features/cards/sets'
import { compareLabels } from '@/features/cards/sort'
import { visibleText } from '@/features/cards/text'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import type { KnownWordEntry } from '@/features/true-words/trueWordsContext'
import { useIsTableBusy } from '@/features/table/tableContext'
import { DmOnly } from '@/features/users/DmOnly'
import type { UserProfile } from '@/features/users/schema'
import { profileName } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import { genitive } from '@/lib/turkish'

import type { HandEntry } from './handEntries'
import { StatTile } from './StatTile'

/** The sets of the hand's normal cards with their card counts, in shop order. Blessed and Cursed have no set. */
function handSets(entries: readonly HandEntry[]): { name: string; count: number }[] {
  const counts = new Map<string, { name: string; order: number; count: number }>()
  for (const { card } of entries) {
    // A held card is active or retired, so a normal one has a set; the check is for the types.
    if (card.kind !== 'normal' || card.setCode === null) continue
    const name = setDisplayName(card.setCode)
    const current = counts.get(name)
    if (current) current.count += 1
    else counts.set(name, { name, order: setOrder(card.setCode), count: 1 })
  }
  return [...counts.values()].sort((a, b) => a.order - b.order || compareLabels(a.name, b.name))
}

/** The two lists that open from their stats. */
type ListId = 'active' | 'sets'

/** Each list's heading, v2.2.8's words. */
const LIST_NAMES: Record<ListId, string> = {
  active: 'Aktif Efektler',
  sets: 'Eldeki setler',
}

/** The name of the button over each list's stat. */
const TRIGGER_NAMES: Record<ListId, string> = {
  active: 'Aktif efektler',
  sets: 'Eldeki setler',
}

const isPointing = (pointerType: string) => pointerType === 'mouse' || pointerType === 'pen'

type ListTriggerProps = {
  id: ListId
  /** The id of the list it opens. */
  controls: string
  onOpen: () => void
  /** Closes its list, if its list is the open one. */
  onClose: () => void
  onToggle: () => void
}

/**
 * The button that covers a stat and opens its list (design D6). A mouse or pen opens the list while it rests on the
 * stat, and its click keeps it open. A tap or a key toggles it. Focus that does not come from a press, that is from the
 * keyboard, opens it, and leaving the stat closes it.
 */
function ListTrigger({ id, controls, onOpen, onClose, onToggle }: ListTriggerProps) {
  /** The pointer type of the last press, and whether a press is under way until its click or the blur. */
  const lastPointer = useRef('')
  const isPressed = useRef(false)
  return (
    <button
      type="button"
      aria-label={TRIGGER_NAMES[id]}
      aria-controls={controls}
      data-list-trigger={id}
      onPointerEnter={(event) => {
        if (isPointing(event.pointerType)) onOpen()
      }}
      onPointerLeave={(event) => {
        if (isPointing(event.pointerType)) onClose()
      }}
      onPointerDown={(event) => {
        lastPointer.current = event.pointerType
        isPressed.current = true
      }}
      onClick={(event) => {
        isPressed.current = false
        // `detail` is 0 for a click from the keyboard.
        if (event.detail !== 0 && isPointing(lastPointer.current)) onOpen()
        else onToggle()
      }}
      onFocus={() => {
        // Focus from a press is left to the click; a tap may focus the button before its click.
        if (!isPressed.current) onOpen()
      }}
      onBlur={() => {
        isPressed.current = false
        onClose()
      }}
      className="absolute inset-0 cursor-help rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    />
  )
}

/**
 * The stats above the hand (v2.2.8's `.stats`): a player's Legend Points (the DM changes them here; the DM has none),
 * how many cards the hand holds, how many effects are active (cards and True Words), from how many sets the cards
 * come, how many are Cursed, and how many True Words the player knows. True Words are not cards.
 *
 * "Aktif efekt ⓘ" opens the list of the active cards with their visible text, then the active True Words marked ✦;
 * "Farklı set ⓘ" opens the sets with their card counts (design D6). A list opens while a mouse or pen rests on its stat,
 * while the stat has the focus from the keyboard, and after a tap until the next tap, a press elsewhere, or Escape. It
 * lies under the whole stats block, so it never widens the page. Closed, it is `sr-only`: screen readers and search
 * still read it.
 */
export function HandSummary({
  entries,
  words,
  profile,
}: {
  entries: readonly HandEntry[]
  /** The player's known True Words, in the order learned. */
  words: readonly KnownWordEntry[]
  /** Whose hand this is, live. */
  profile: UserProfile
}) {
  const ids = useId()
  const [isChangingLp, setIsChangingLp] = useState(false)
  const [openList, setOpenList] = useState<ListId | null>(null)
  const isTableBusy = useIsTableBusy()
  const isPlayer = profile.role === 'player'
  const playerName = profileName(profile)
  const active = entries.filter((entry) => entry.holding.active)
  const activeWords = words.filter((entry) => entry.record.active)
  const sets = handSets(entries)
  const cursedCount = entries.filter((entry) => entry.card.kind === 'cursed').length

  // An open list closes with Escape, or with a press outside its stat (a tap elsewhere on a phone).
  useEffect(() => {
    if (openList === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenList(null)
    }
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const isOnTrigger =
        event.target instanceof Element &&
        event.target.closest(`[data-list-trigger="${openList}"]`) !== null
      if (!isOnTrigger) setOpenList(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [openList])

  /** The button over a stat that opens its list. */
  const trigger = (id: ListId) => (
    <ListTrigger
      id={id}
      controls={`${ids}-${id}`}
      onOpen={() => setOpenList(id)}
      onClose={() => setOpenList((current) => (current === id ? null : current))}
      onToggle={() => setOpenList((current) => (current === id ? null : id))}
    />
  )

  /** A list under the stats: shown while open, `sr-only` while closed. */
  const list = (id: ListId, content: ReactNode) => {
    const isOpen = openList === id
    return (
      <section
        id={`${ids}-${id}`}
        aria-labelledby={`${ids}-${id}-title`}
        data-open={isOpen || undefined}
        className={
          isOpen
            ? 'pointer-events-none absolute inset-x-0 top-full z-40 mt-2 flex max-w-xl flex-col gap-2 rounded-xl border border-gold/60 bg-sidebar p-3 shadow-lg'
            : 'sr-only'
        }
      >
        <h2 id={`${ids}-${id}-title`} className="text-sm font-semibold text-gold">
          {LIST_NAMES[id]}
        </h2>
        {content}
      </section>
    )
  }

  return (
    <div className="relative min-w-0">
      <dl aria-label="El özeti" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {isPlayer ? (
          <StatTile
            label="Legend Point"
            value={formatAmount(profile.lp)}
            action={
              <DmOnly>
                <Button
                  variant="ghost"
                  className="shrink-0 px-2 py-1"
                  aria-label={`${genitive(playerName)} LP'sini değiştir`}
                  disabled={isTableBusy}
                  title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
                  onClick={() => setIsChangingLp(true)}
                >
                  ± LP
                </Button>
              </DmOnly>
            }
          />
        ) : null}
        <StatTile label="Eldeki kart" value={entries.length} />
        <StatTile
          label="Aktif efekt"
          value={active.length + activeWords.length}
          hasInfo
          cover={trigger('active')}
        />
        <StatTile label="Farklı set" value={sets.length} hasInfo cover={trigger('sets')} />
        <StatTile label="☠ Cursed kart" value={cursedCount} tone="cursed" />
        <StatTile label="✦ True Words" value={words.length} tone="word" />
      </dl>
      {list(
        'active',
        active.length === 0 && activeWords.length === 0 ? (
          <p className="text-sm text-ink-muted">Aktif efekt yok.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map(({ holding, card }) => (
              <li
                key={holding.id}
                className={cn(
                  'border-l-2 pl-2 text-sm',
                  card.kind === 'cursed' ? 'border-cursed' : 'border-line',
                )}
              >
                <p lang="en" className="font-semibold break-words text-ink">
                  {card.kind === 'cursed' ? (
                    <>
                      <span aria-hidden="true">☠ </span>
                      <span className="sr-only">Cursed: </span>
                    </>
                  ) : null}
                  {card.name}
                </p>
                <p lang="en" className="break-words whitespace-pre-line text-ink-muted">
                  {visibleText(card.text) || 'Efekt metni yok.'}
                </p>
              </li>
            ))}
            {activeWords.map(({ record, word }) => (
              <li key={record.id} className="border-l-2 border-gold pl-2 text-sm">
                {/* An active True Word's name glows purple (spec: visual-effects). */}
                <p lang="en" className="font-semibold break-words text-ink text-shadow-glow-word">
                  <span aria-hidden="true">✦ </span>
                  <span className="sr-only">True Word: </span>
                  {word.name}
                </p>
                <p lang="en" className="break-words whitespace-pre-line text-ink-muted">
                  {visibleText(word.text) || 'Efekt metni yok.'}
                </p>
              </li>
            ))}
          </ul>
        ),
      )}
      {list(
        'sets',
        sets.length === 0 ? (
          <p className="text-sm text-ink-muted">Henüz set yok.</p>
        ) : (
          <ul className="flex flex-col text-sm">
            {sets.map(({ name, count }) => (
              <li
                key={name}
                className="flex items-baseline justify-between gap-3 border-t border-line py-1 first:border-t-0"
              >
                <span className="min-w-0 break-words text-ink">{name}</span>
                <span className="shrink-0 font-semibold whitespace-nowrap text-gold">
                  {count} kart
                </span>
              </li>
            ))}
          </ul>
        ),
      )}
      {isChangingLp ? (
        <BalanceDialog
          currency="lp"
          uid={profile.id}
          name={playerName}
          balance={profile.lp}
          onClose={() => setIsChangingLp(false)}
        />
      ) : null}
    </div>
  )
}
