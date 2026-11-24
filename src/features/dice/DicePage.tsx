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
import { naturalMarkOf, playNatural, playNaturalOnce } from './sound/natural'

/** What the strip shows: a roll, playing or at rest, and a key that restarts its playback. */
type StripState = { roll: DiceRoll; playing: boolean; key: number }

/** How close to the bottom the channel counts as scrolled to the end, in pixels. */
const BOTTOM_SLACK = 48

/**
 * A new roll's result shows at the latest this long after it starts playing, even if the strip never reports its dice
 * at rest (spec: dice-rolls, "When a hidden result shows"; design D1 of reveal-dice-results-after-the-throw).
 */
export const SETTLE_MAX_MS = 10_000

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
  // The fresh roll whose dice still tumble in the strip: its channel entry hides its result until they rest (spec:
  // "Results hidden until the dice rest"). "Tekrar izle" never sets it; a newer fresh roll replaces it.
  const [settlingId, setSettlingId] = useState<string | null>(null)
  if (fresh && fresh.id !== playedFresh) {
    setPlayedFresh(fresh.id)
    setStrip({ roll: fresh, playing: true, key: (strip?.key ?? 0) + 1 })
    setSettlingId(fresh.content ? fresh.id : null)
  }
  const settle = (rollId: string) =>
    setSettlingId((current) => (current === rollId ? null : current))
  useEffect(() => {
    if (settlingId === null) return
    const timer = setTimeout(
      () => setSettlingId((current) => (current === settlingId ? null : current)),
      SETTLE_MAX_MS,
    )
    return () => clearTimeout(timer)
  }, [settlingId])
  // The strip forgets its roll once the roll has been in the channel and is gone from it: the DM reset the channel
  // (design D4 of release-1-0-0). A roll just made may reach the strip a moment before the channel, so a roll the
  // channel never held stays.
  const isStripInList = strip !== null && list.some((roll) => roll.id === strip.roll.id)
  const [stripListed, setStripListed] = useState<string | null>(null)
  if (strip && isStripInList && stripListed !== strip.roll.id) setStripListed(strip.roll.id)
  const isStripGone = strip !== null && !isStripInList && stripListed === strip.roll.id
  const shown: StripState | null =
    (isStripGone ? null : strip) ??
    (newestWithContent ? { roll: newestWithContent, playing: false, key: 0 } : null)
  // "Tekrar izle" plays a natural's sound again when its dice rest, on this device only (spec: "Natural sounds when
  // watching again"). The strip's key tells a replay's rest from a roll shown at rest, whose key is 0.
  const [replayKey, setReplayKey] = useState<number | null>(null)
  const replay = (roll: DiceRoll) => {
    const key = (strip?.key ?? 0) + 1
    setStrip({ roll, playing: true, key })
    setReplayKey(key)
  }
  const onStripRest = (state: StripState) => {
    settle(state.roll.id)
    if (state.key !== replayKey) return
    setReplayKey(null)
    const mark = naturalMarkOf(state.roll)
    if (mark && settings.naturalSound) playNatural(mark)
  }

  // A fresh roll's natural sound plays when its result shows (spec: "Natural sounds"; design D6 of
  // tune-dice-feel-and-natural-sounds): when the settling roll stops settling, as its dice rest, a newer roll replaces
  // it, or the wait runs out. Without the 3D dice or with reduced motion, that is at once.
  const freshRolls = useRef(new Map<string, DiceRoll>())
  useEffect(() => {
    if (fresh) freshRolls.current.set(fresh.id, fresh)
  }, [fresh])
  const wasSettling = useRef<string | null>(null)
  const naturalSound = settings.naturalSound
  useEffect(() => {
    const before = wasSettling.current
    wasSettling.current = settlingId
    if (before === null || before === settlingId) return
    const roll = freshRolls.current.get(before)
    freshRolls.current.delete(before)
    if (roll) playNaturalOnce(roll, naturalSound)
  }, [settlingId, naturalSound])

  // While the screen is open, every roll counts as seen.
  useEffect(() => {
    markSeen(Date.now())
  }, [list.length, markSeen])

  // The channel keeps to its newest roll when a roll arrives, if the user was at the end already (spec: "The
  // channel"). It follows the newest roll's id, not the count: a full window of 50 keeps its count as a roll arrives
  // and the oldest leaves. A result that shows after the dice rest can change its entry's height, so the settling
  // roll counts too (design D1 of tune-dice-feel-and-natural-sounds).
  const channel = useRef<HTMLDivElement>(null)
  const isAtEnd = useRef(true)
  const newestId = list.at(-1)?.id ?? null
  useLayoutEffect(() => {
    const box = channel.current
    if (box && isAtEnd.current) box.scrollTop = box.scrollHeight
  }, [newestId, settlingId, tab])

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
      // `relative` keeps the entries' sr-only text inside the box: without it, that text escaped the scroll box and
      // made the whole page scroll as far as the channel's content (spec: "The Zarlar screen").
      className="relative max-h-120 overflow-y-auto lg:max-h-[calc(100dvh-13rem)]"
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
            isSettling={roll.id === settlingId}
            onReplay={replay}
          />
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
                  playing={shown.playing}
                  playKey={shown.key}
                  sound={settings.sound}
                  show3d={settings.show3d}
                  onRest={() => onStripRest(shown)}
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
