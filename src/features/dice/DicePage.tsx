import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { TabList, TabPanel } from '@/components/ui/TabList'
import { useAuth } from '@/features/auth/authContext'
import { combatToSwitchFor, markSwitchedFor } from '@/features/combat/asking'
import { useCombat } from '@/features/combat/combatContext'
import { InitiativeTab } from '@/features/combat/InitiativeTab'
import { profileName, useCurrentProfile, useProfiles } from '@/features/users/usersContext'

import { useDiceDeviceSettings, useLastSeen } from './deviceSettings'
import { useDiceActions, useDiceRolls, useFreshRoll } from './diceContext'
import { DiceSettingsDialog } from './DiceSettingsDialog'
import { DICE_TAB_PARAM, DICE_TABS, type DiceTab, diceTabOf, diceTabValue } from './diceTabs'
import { DiceView } from './DiceView'
import { RollEntry } from './RollEntry'
import { RollForm } from './RollForm'
import { DEFAULT_DICE_STYLE, type DiceRoll } from './schema'

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
 * The Zarlar screen (spec: dice-rolls, "The Zarlar screen"; design D8 of add-initiative-tracker): the wide strip where
 * the newest roll tumbles, with the roll form below it, and a column with the "Kanal" and "İnisiyatif" tabs, kept in
 * the URL. The dice style and this device's settings open in a dialog. Opening it clears the menu's count of unseen
 * rolls. On a phone the strip, the form and the tabs are stacked in that order.
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
  const combat = useCombat()
  const ids = useId()
  const [params, setParams] = useSearchParams()
  const tab = diceTabOf(params.get(DICE_TAB_PARAM))
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const chooseTab = (next: DiceTab) => {
    const search = new URLSearchParams(params)
    const value = diceTabValue(next)
    if (value === null) search.delete(DICE_TAB_PARAM)
    else search.set(DICE_TAB_PARAM, value)
    setParams(search)
  }
  const isCombatOpen = combat.status === 'ready' && combat.combat.phase !== 'idle'

  // When the DM asks for initiative and one of the user's characters must roll, the screen opens the İnisiyatif tab,
  // once per combat (design D8 of add-initiative-tracker).
  const switchFor = combatToSwitchFor(combat, uid)
  useEffect(() => {
    if (switchFor === null) return
    markSwitchedFor(switchFor)
    setParams(
      (current) => {
        const search = new URLSearchParams(current)
        search.set(DICE_TAB_PARAM, diceTabValue('initiative') ?? '')
        return search
      },
      { replace: true },
    )
  }, [switchFor, setParams])
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
  }, [list.length, tab])

  const profileOf = (id: string) =>
    profiles.status === 'ready' ? profiles.data.find((candidate) => candidate.id === id) : undefined
  const stripName = shown ? profileOf(shown.roll.by) : undefined

  const channelView = (
    <div
      ref={channel}
      onScroll={(event) => {
        const box = event.currentTarget
        isAtEnd.current = box.scrollHeight - box.scrollTop - box.clientHeight < BOTTOM_SLACK
      }}
      className="max-h-120 overflow-y-auto lg:max-h-[calc(100dvh-13rem)]"
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
          <RollEntry key={roll.id} roll={roll} roller={profileOf(roll.by)} onReplay={replay} />
        ))}
      </ol>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Zarlar" actions={<LiveMark />} />
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section aria-label="Zar tablası" className="flex min-w-0 flex-col gap-3">
          <div
            data-testid="dice-strip"
            className="relative h-56 overflow-hidden rounded-2xl border border-line bg-pane sm:h-72 lg:h-96"
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
            <Button
              variant="secondary"
              onClick={() => setIsSettingsOpen(true)}
              className="absolute top-3 right-3"
            >
              <span aria-hidden="true">🎲</span> Zar stili
            </Button>
          </div>
          <RollForm style={style} />
        </section>

        <section
          aria-label="Kanal ve inisiyatif"
          className="flex min-w-0 flex-col gap-3 lg:order-first"
        >
          <TabList
            tabs={DICE_TABS.map(({ id, label }) => ({
              id,
              label:
                id === 'initiative' && isCombatOpen ? (
                  <>
                    {label}
                    <span
                      aria-label="savaş açık"
                      role="img"
                      className="ml-1.5 inline-block size-2 rounded-full bg-cursed"
                    />
                  </>
                ) : (
                  label
                ),
            }))}
            selected={tab}
            onChange={chooseTab}
            label="Zar ekranı"
            idPrefix={ids}
            tabClassName="flex-1"
          />
          <TabPanel idPrefix={ids} selected={tab}>
            {tab === 'channel' ? channelView : <InitiativeTab />}
          </TabPanel>
        </section>
      </div>
      {isSettingsOpen ? (
        <DiceSettingsDialog style={style} onClose={() => setIsSettingsOpen(false)} />
      ) : null}
    </div>
  )
}
