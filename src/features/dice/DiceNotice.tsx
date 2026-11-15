import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { screenById } from '@/app/screens'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/features/auth/authContext'
import { profileName, useProfiles } from '@/features/users/usersContext'

import { useDiceDeviceSettings } from './deviceSettings'
import { useFreshRoll } from './diceContext'
import { DiceView } from './DiceView'
import { NaturalMarkLabel } from './FlatDice'
import { rollView } from './rollView'

/** The card closes this long after its dice come to rest (spec: "The notification card closes on its own"). */
export const NOTICE_MS = 4000

/** What the user did to the card of one roll. */
type CardState = {
  rollId: string
  /** The dice lie at rest: the timer may run. */
  isAtRest: boolean
  /** Selected: it stays until "Kapat". */
  isKept: boolean
  isClosed: boolean
}

/**
 * Another user's roll on any screen but Zarlar (spec: dice-rolls, "A roll arrives on another screen"; design D9): a
 * card at the bottom right of a wide window and at the top of a phone, with a small tray where the throw plays, the
 * roller, the note, the formula, the results and the total. It closes 4 seconds after the dice rest, unless the
 * pointer or the focus is on it or the user selected it. A newer roll replaces it. Mounted once in the app shell.
 */
export function DiceNotice() {
  const auth = useAuth()
  const me = auth.status === 'signedIn' ? auth.user.uid : null
  const fresh = useFreshRoll()
  const location = useLocation()
  const settings = useDiceDeviceSettings()
  const profiles = useProfiles()
  const [card, setCard] = useState<CardState | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const isOnDice = location.pathname.startsWith(screenById('dice').path)
  const roll =
    fresh && fresh.by !== me && fresh.content !== null && settings.showRolls && !isOnDice
      ? fresh
      : null
  if (roll && card?.rollId !== roll.id) {
    // A newer roll replaces the card: a fresh state for it.
    setCard({ rollId: roll.id, isAtRest: false, isKept: false, isClosed: false })
  }
  const current = roll && card?.rollId === roll.id && !card.isClosed ? card : null

  const isTimerRunning = current !== null && current.isAtRest && !current.isKept
  const isPaused = isHovered || isFocused
  useEffect(() => {
    if (!isTimerRunning || isPaused) return
    const timer = setTimeout(() => {
      setCard((state) => (state ? { ...state, isClosed: true } : state))
    }, NOTICE_MS)
    return () => clearTimeout(timer)
  }, [isTimerRunning, isPaused, current?.rollId])

  if (!roll || !current || !roll.content) return null
  const content = roll.content
  const view = rollView(content)
  const roller =
    profiles.status === 'ready' ? profiles.data.find((p) => p.id === roll.by) : undefined
  const name = roller ? profileName(roller) : 'Bilinmeyen oyuncu'
  const close = () => setCard((state) => (state ? { ...state, isClosed: true } : state))
  const kept = view.results.filter((result) => result.isKept).map((result) => result.value)

  return (
    <aside
      aria-label={`${name} atışı`}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false)
      }}
      onClick={() => setCard((state) => (state ? { ...state, isKept: true } : state))}
      className="fixed inset-x-2.5 top-2.5 z-30 overflow-hidden rounded-2xl border border-line bg-pane-raised shadow-2xl sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-5 sm:w-95"
    >
      <div className="flex items-center gap-2.5 p-2 sm:items-stretch sm:gap-3 sm:p-3.5">
        <DiceView
          roll={roll}
          variant="card"
          playing
          sound={settings.sound}
          onRest={() =>
            setCard((state) =>
              state && state.rollId === roll.id ? { ...state, isAtRest: true } : state,
            )
          }
          className="size-14 shrink-0 rounded-xl bg-pane sm:size-26"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:inline-flex">
              <Avatar name={name} photoURL={roller?.photoURL ?? null} size="sm" />
            </span>
            <strong className="truncate text-ink">{name}</strong>
            <span className="truncate text-xs text-ink-muted sm:hidden">{view.formula}</span>
          </div>
          {content.note ? <p className="truncate text-sm text-ink">{content.note}</p> : null}
          <div className="mt-auto flex items-baseline gap-2">
            <span className="hidden truncate text-sm text-ink-muted sm:inline">
              {view.formula} · {kept.join(' + ')}
              {content.modifier !== 0
                ? ` ${content.modifier > 0 ? '+' : '−'} ${Math.abs(content.modifier)}`
                : ''}
            </span>
            <NaturalMarkLabel view={view} />
            <span className="ml-auto text-3xl font-extrabold text-gold">
              <span className="sr-only">Toplam: </span>
              {view.total}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Kapat"
          onClick={(event) => {
            event.stopPropagation()
            close()
          }}
          className="flex size-11 shrink-0 items-center justify-center self-start rounded-full text-xl text-ink-muted hover:bg-pane"
        >
          ×
        </button>
      </div>
      <div className="flex items-center justify-between border-t border-line px-3.5 py-2 text-xs text-ink-muted">
        <Link
          to={screenById('dice').path}
          onClick={(event) => {
            event.stopPropagation()
            close()
          }}
          className="text-gold hover:underline"
        >
          Kanalda aç
        </Link>
        {current.isKept ? null : <span className="hidden sm:inline">Kendiliğinden kapanır</span>}
      </div>
    </aside>
  )
}
