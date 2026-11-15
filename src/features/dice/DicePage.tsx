import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { profileName, useCurrentProfile, useProfiles } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'

import { useDiceDeviceSettings, useLastSeen } from './deviceSettings'
import { useDiceActions, useDiceRolls, useFreshRoll } from './diceContext'
import { DiceView } from './DiceView'
import { RollEntry } from './RollEntry'
import { RollForm } from './RollForm'
import { DEFAULT_DICE_STYLE, DICE_STYLE_LABELS, DICE_STYLES, type DiceRoll } from './schema'
import { previewUrl } from './stage/previews'

/** What the strip shows: a roll, playing or at rest, and a key that restarts its playback. */
type StripState = { roll: DiceRoll; playing: boolean; key: number }

/** How close to the bottom the channel counts as scrolled to the end, in pixels. */
const BOTTOM_SLACK = 48

function LiveMark() {
  return (
    <span className="flex items-center gap-1.5 text-xs text-green">
      <span aria-hidden="true" className="size-2 rounded-full bg-green" />
      Canlı
    </span>
  )
}

/**
 * The Zarlar screen in the V2 · Sohbet layout (design D10 of dice-channel): the strip where the newest roll tumbles,
 * the channel below it like a chat, the roll form, and a side column with the user's dice style and this device's
 * settings. Opening it clears the menu's count of unseen rolls.
 */
export function DicePage() {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const rolls = useDiceRolls()
  const fresh = useFreshRoll()
  const actions = useDiceActions()
  const profiles = useProfiles()
  const profile = useCurrentProfile()
  const settings = useDiceDeviceSettings()
  const { markSeen } = useLastSeen(uid)
  const style =
    profile.status === 'ready' && profile.data ? profile.data.diceStyle : DEFAULT_DICE_STYLE

  const list = rolls.status === 'ready' ? rolls.rolls : []
  const newestWithContent = [...list].reverse().find((roll) => roll.content !== null) ?? null

  // The strip plays each fresh roll as it arrives, the user's own included; a newer roll replaces the one playing.
  const [strip, setStrip] = useState<StripState | null>(null)
  const [playedFresh, setPlayedFresh] = useState<string | null>(fresh?.id ?? null)
  if (fresh && fresh.id !== playedFresh) {
    setPlayedFresh(fresh.id)
    setStrip({ roll: fresh, playing: true, key: (strip?.key ?? 0) + 1 })
  }
  const shown: StripState | null =
    strip ?? (newestWithContent ? { roll: newestWithContent, playing: false, key: 0 } : null)
  const replay = (roll: DiceRoll) => setStrip({ roll, playing: true, key: (strip?.key ?? 0) + 1 })

  // While the screen is open, every roll counts as seen.
  useEffect(() => {
    markSeen(Date.now())
  }, [list.length, markSeen])

  // The channel keeps to its newest roll when a roll arrives, if the user was at the end already.
  const channel = useRef<HTMLDivElement>(null)
  const isAtEnd = useRef(true)
  useLayoutEffect(() => {
    const box = channel.current
    if (box && isAtEnd.current) box.scrollTop = box.scrollHeight
  }, [list.length])

  const profileOf = (id: string) =>
    profiles.status === 'ready' ? profiles.data.find((candidate) => candidate.id === id) : undefined
  const stripName = shown ? profileOf(shown.roll.by) : undefined

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Zarlar" actions={<LiveMark />} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section aria-label="Kanal" className="flex min-w-0 flex-col gap-3">
          <div
            data-testid="dice-strip"
            className="relative h-44 overflow-hidden rounded-2xl border border-line bg-pane"
          >
            {shown ? (
              <>
                <DiceView
                  key={shown.roll.id}
                  roll={shown.roll}
                  variant="strip"
                  playing={shown.playing}
                  playKey={shown.key}
                  sound={settings.sound}
                  className="size-full"
                />
                <span className="absolute top-3 left-3 rounded-full bg-canvas/75 px-2.5 py-1 text-xs text-ink-muted">
                  Son atış:{' '}
                  <strong className="text-ink">
                    {stripName ? profileName(stripName) : 'Bilinmeyen oyuncu'}
                  </strong>
                </span>
              </>
            ) : (
              <p className="flex size-full items-center justify-center text-sm text-ink-muted">
                Henüz zar atılmadı.
              </p>
            )}
          </div>

          <div
            ref={channel}
            onScroll={(event) => {
              const box = event.currentTarget
              isAtEnd.current = box.scrollHeight - box.scrollTop - box.clientHeight < BOTTOM_SLACK
            }}
            className="max-h-120 overflow-y-auto"
          >
            {rolls.status === 'loading' ? <Spinner /> : null}
            {rolls.status === 'error' ? (
              <p role="alert" className="text-sm text-danger-ink">
                Atışlar yüklenemedi.
              </p>
            ) : null}
            {rolls.status === 'ready' && rolls.hasOlder ? (
              <div className="flex justify-center py-2">
                <Button variant="ghost" onClick={actions.loadOlder}>
                  Daha eski atışlar
                </Button>
              </div>
            ) : null}
            {rolls.status === 'ready' && list.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-muted">Kanal boş. İlk zarı sen at.</p>
            ) : null}
            <ol aria-label="Atışlar" className="flex flex-col gap-0.5">
              {list.map((roll) => (
                <RollEntry
                  key={roll.id}
                  roll={roll}
                  roller={profileOf(roll.by)}
                  onReplay={replay}
                />
              ))}
            </ol>
          </div>

          <RollForm style={style} />
        </section>

        <aside
          aria-label="Zar ayarları"
          className="flex flex-col gap-6 rounded-2xl border border-line bg-sidebar p-5"
        >
          <section aria-labelledby="dice-style-heading">
            <h2 id="dice-style-heading" className="mb-3 text-sm font-semibold text-ink">
              Zar stilin
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {DICE_STYLES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === style}
                  onClick={() => {
                    actions.setDiceStyle(option).catch(() => undefined)
                  }}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg border-2 border-transparent bg-pane px-0.5 py-1.5 text-xs text-ink-muted',
                    option === style && 'border-gold bg-pane-raised text-ink',
                  )}
                >
                  <img src={previewUrl(option, 'd20')} alt="" className="size-9.5" />
                  {DICE_STYLE_LABELS[option]}
                </button>
              ))}
            </div>
          </section>
          <section aria-labelledby="dice-device-heading" className="flex flex-col gap-3 text-sm">
            <h2 id="dice-device-heading" className="text-sm font-semibold text-ink">
              Bu cihazda
            </h2>
            <label className="flex items-center gap-2 text-ink-muted">
              <input
                type="checkbox"
                checked={settings.showRolls}
                onChange={(event) => settings.setShowRolls(event.target.checked)}
                className="size-4.5 accent-gold"
              />
              Atışları göster
            </label>
            <label className="flex items-center gap-2 text-ink-muted">
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(event) => {
                  settings.setSound(event.target.checked)
                  // The switch's own click may wake the audio: browsers start it only after a gesture.
                  if (event.target.checked) {
                    import('./stage/audio')
                      .then((audio) => audio.prepareSounds())
                      .catch(() => undefined)
                  }
                }}
                className="size-4.5 accent-gold"
              />
              Zar sesi
            </label>
          </section>
        </aside>
      </div>
    </div>
  )
}
