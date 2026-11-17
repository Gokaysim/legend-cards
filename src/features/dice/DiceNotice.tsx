import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { screenById } from '@/app/screens'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/features/auth/authContext'
import { profileName, useProfiles } from '@/features/users/usersContext'

import { useDiceDeviceSettings } from './deviceSettings'
import { useFreshRoll } from './diceContext'
import { NaturalMarkLabel } from './FlatDice'
import { modifierText } from './formula'
import { rollView } from './rollView'

/** The card closes this long after it appears (spec: "The notification card closes on its own"). */
export const NOTICE_MS = 6000

/** What the user did to the card of one roll. */
type CardState = {
  rollId: string
  /** Selected: it stays until "Kapat". */
  isKept: boolean
  isClosed: boolean
}

/**
 * Another user's roll on any screen but Zarlar (spec: dice-rolls, "A roll arrives on another screen"; design D3 of
 * reveal-dice-results-after-the-throw): a card at the bottom right of a wide window and at the top of a phone, with
 * the roller, the note, the formula as written with the kept results, the natural mark and the total, all at once and
 * without dice. It closes 6 seconds after it appears, unless the pointer or the focus is on it or the user selected
 * it. A newer roll replaces it. Mounted once in the app shell.
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
    setCard({ rollId: roll.id, isKept: false, isClosed: false })
  }
  const current = roll && card?.rollId === roll.id && !card.isClosed ? card : null

  const isTimerRunning = current !== null && !current.isKept
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
      <div className="flex items-start gap-2.5 p-3 sm:gap-3 sm:p-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <Avatar name={name} photoURL={roller?.photoURL ?? null} size="sm" />
            <strong className="truncate text-ink">{name}</strong>
          </div>
          {content.note ? <p className="text-sm break-words text-ink">{content.note}</p> : null}
          <div className="flex items-end gap-2">
            <p className="min-w-0 flex-1 text-sm break-words text-ink-muted">
              {view.formula} · {kept.join(' + ')}
              {modifierText(content.modifier, content.modifierSum)}
            </p>
            <NaturalMarkLabel view={view} className="shrink-0" />
            <span className="shrink-0 text-3xl leading-none font-extrabold text-gold">
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
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-ink-muted hover:bg-pane"
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
