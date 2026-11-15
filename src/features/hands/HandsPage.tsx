import { useId, useMemo, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'

import {
  CHARACTERS_TAB,
  DM_NOTE_TAB,
  HAND_TAB_PARAM,
  handPath,
  packShopPath,
  screenById,
  TRUE_WORDS_TAB,
} from '@/app/screens'
import { DetailsBadges } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { useCardsById } from '@/features/cards/cardsContext'
import { heldEffects } from '@/features/characters/heldEffects'
import { useHandCharacters } from '@/features/characters/useHandCharacters'
import { DrawButtons } from '@/features/draws/DrawButtons'
import { DmNote, PlayerNote } from '@/features/player-notes/HandNotes'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { TableBusyNote } from '@/features/table/TableBusyNote'
import { useIsTableBusy } from '@/features/table/tableContext'
import { ActiveWordsPeek } from '@/features/true-words/ActiveWordsPeek'
import { HandTrueWords } from '@/features/true-words/HandTrueWords'
import { TrueWordDetails } from '@/features/true-words/TrueWordDetails'
import { TrueWordDialog } from '@/features/true-words/TrueWordDialog'
import { wordBadges } from '@/features/true-words/wordBadges'
import {
  knownWordEntries,
  useKnownWords,
  useTrueWords,
} from '@/features/true-words/trueWordsContext'
import { DmOnly } from '@/features/users/DmOnly'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useCurrentProfile, useIsDm, useProfiles } from '@/features/users/usersContext'
import { cn } from '@/lib/cn'
import { useWideWindow } from '@/lib/useWideWindow'

import { handEntries } from './handEntries'
import { GiveCardDialog } from './GiveCardDialog'
import { HandDetailsPanel } from './HandDetailsPanel'
import { HandSummary } from './HandSummary'
import { HandView } from './HandView'
import { holdingBadges } from './holdingBadges'
import { HoldingDetails } from './HoldingDetails'
import { HoldingDialog } from './HoldingDialog'
import { useOpenHoldings } from './holdingsContext'

/**
 * "Oyuncu elleri" from the menu: opens a hand, replacing this URL. A player gets their own hand. The DM gets the
 * first player of the "Oyuncular" list who is not the DM, or their own hand when there is none.
 */
export function HandsPage() {
  const auth = useAuth()
  const currentProfile = useCurrentProfile()
  const profiles = useProfiles()

  if (auth.status !== 'signedIn') return null
  if (currentProfile.status === 'loading' || profiles.status === 'loading') {
    return <Spinner label="El açılıyor…" className="py-12" />
  }
  const isDm = currentProfile.status === 'ready' && currentProfile.data?.role === 'dm'
  const firstPlayer =
    isDm && profiles.status === 'ready'
      ? profiles.data.find((profile) => profile.role !== 'dm')
      : undefined
  return <Navigate to={handPath(firstPlayer?.id ?? auth.user.uid)} replace />
}

/** One player's hand at `/hands/:uid`. */
export function PlayerHandPage() {
  const { uid = '' } = useParams()
  const auth = useAuth()
  const profiles = useProfiles()
  const title = screenById('hands').label

  if (profiles.status === 'loading') {
    return <Spinner label="Oyuncular yükleniyor…" className="py-12" />
  }
  if (profiles.status === 'error') {
    return (
      <section className="flex flex-col gap-6">
        <PageHeader title={title} />
        <p
          role="alert"
          className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink"
        >
          Oyuncular yüklenemedi.
        </p>
      </section>
    )
  }
  const profile = profiles.data.find((candidate) => candidate.id === uid)
  if (!profile) {
    // Right after the first sign-in, the own profile is still being created.
    if (auth.status === 'signedIn' && auth.user.uid === uid) {
      return <Spinner label="Profil hazırlanıyor…" className="py-12" />
    }
    return (
      <section className="flex flex-col gap-6">
        <PageHeader title={title} />
        <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
          Böyle bir oyuncu yok.
        </p>
      </section>
    )
  }
  // Keyed by player, so switching hands starts with a fresh view and no open dialog.
  return <HandScreen key={profile.id} profile={profile} />
}

function HandScreen({ profile }: { profile: UserProfile }) {
  const [isGiving, setIsGiving] = useState(false)
  const isTableBusy = useIsTableBusy()
  const isDm = useIsDm()
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={screenById('hands').label}
        actions={
          <>
            <TableBusyNote />
            <DrawButtons owner={profile} />
            <Link
              to={packShopPath(isDm ? profile.id : undefined)}
              className="rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink hover:bg-pane-raised"
            >
              🎁 Pack Shop
            </Link>
            <DmOnly>
              <Button
                variant="primary"
                disabled={isTableBusy}
                title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
                onClick={() => setIsGiving(true)}
              >
                + Kart ver
              </Button>
            </DmOnly>
          </>
        }
      />
      <HandContent profile={profile} />
      {isGiving ? <GiveCardDialog receiver={profile} onClose={() => setIsGiving(false)} /> : null}
    </section>
  )
}

type HandTab = 'cards' | 'true-words' | 'characters' | 'dm-note'

/**
 * A selected card or word, with the layout it was selected in (design D2). It counts only while the layout is the
 * same: crossing 1024 px drops it, so no dialog opens by itself (spec: card-holdings).
 */
type Selection = { id: string; isWide: boolean }

/** Each tab's value in the URL. The cards tab has none: it is the hand's default. */
const TAB_VALUES: Record<Exclude<HandTab, 'cards'>, string> = {
  'true-words': TRUE_WORDS_TAB,
  characters: CHARACTERS_TAB,
  'dm-note': DM_NOTE_TAB,
}

/**
 * The tab a URL value opens. The DM notu tab is the DM's alone: for a player its value opens the Kartlar tab, and so
 * does any other value, such as the former Notlar tab's `notes`.
 */
function tabOf(value: string | null, isDm: boolean): HandTab {
  if (value === TRUE_WORDS_TAB) return 'true-words'
  if (value === CHARACTERS_TAB) return 'characters'
  if (value === DM_NOTE_TAB && isDm) return 'dm-note'
  return 'cards'
}

/**
 * The hand of one player, live: the summary with the tabs beside it, kept in the URL (`?tab=true-words`,
 * `?tab=characters`, `?tab=dm-note`): the cards, the player's True Words, their characters, and for the DM alone the
 * DM note. The player note shows under
 * every tab. The DM note shows only on its tab and its label never changes, because the DM's screen may face the table
 * (spec: player-notes).
 *
 * On a wide window, the selected card's or True Word's details show in a panel beside the hand; on a narrower one, in a
 * dialog (spec: card-holdings; design D2, D3). The Karakterler tab has no panel: it takes the full width and shows the
 * selected character in the tab itself, on every window (spec: characters, "The selected character's view").
 */
function HandContent({ profile }: { profile: UserProfile }) {
  const ids = useId()
  const isDm = useIsDm()
  const holdings = useOpenHoldings()
  const cardsById = useCardsById()
  const words = useTrueWords()
  const knownWords = useKnownWords(profile.id)
  const [params, setParams] = useSearchParams()
  const isWide = useWideWindow()
  const [cardSelection, setCardSelection] = useState<Selection | null>(null)
  const [wordSelection, setWordSelection] = useState<Selection | null>(null)
  const tab = tabOf(params.get(HAND_TAB_PARAM), isDm)
  // Crossing 1024 px clears a selection made in the other layout, during this render (design D2): a dialog never opens
  // by itself, and going back does not bring the old selection back.
  if (cardSelection !== null && cardSelection.isWide !== isWide) setCardSelection(null)
  if (wordSelection !== null && wordSelection.isWide !== isWide) setWordSelection(null)

  const wordEntries = useMemo(
    () =>
      words.status === 'ready' && knownWords.status === 'ready'
        ? knownWordEntries(knownWords.data, new Map(words.data.map((word) => [word.id, word])))
        : [],
    [words, knownWords],
  )

  const chooseTab = (next: HandTab) => {
    const search = new URLSearchParams(params)
    if (next === 'cards') search.delete(HAND_TAB_PARAM)
    else search.set(HAND_TAB_PARAM, TAB_VALUES[next])
    setParams(search)
  }

  const entries = useMemo(
    () =>
      holdings.status === 'ready' && cardsById.status === 'ready'
        ? handEntries(holdings.data, cardsById.data, profile.id)
        : null,
    [holdings, cardsById, profile.id],
  )

  // What the hand puts on every one of the player's characters: its active cards and True Words (design D6 of
  // add-character-effects).
  const held = useMemo(() => heldEffects(entries ?? [], wordEntries), [entries, wordEntries])
  const handCharacters = useHandCharacters(profile, held)

  if (holdings.status === 'error' || cardsById.status === 'error') {
    return (
      <p role="alert" className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink">
        El yüklenemedi.
      </p>
    )
  }
  if (entries === null) return <Spinner label="El yükleniyor…" className="py-12" />

  // A card that left the hand (used, discarded, or given away, here or on another device) closes its details.
  const selectedCardId = cardSelection?.isWide === isWide ? cardSelection.id : null
  const selected = entries.find((entry) => entry.holding.id === selectedCardId)
  const selectCard = (id: string) => setCardSelection({ id, isWide })
  // A word taken back, here or on another device, closes its details.
  const selectedWordId = wordSelection?.isWide === isWide ? wordSelection.id : null
  const selectedWord = wordEntries.find((entry) => entry.record.id === selectedWordId)
  const selectWord = (id: string) => setWordSelection({ id, isWide })
  // The Karakterler tab shows its selected character in the tab itself (design D3 of redesign-characters-tab).
  const showsPanel = isWide && (tab === 'cards' || tab === 'true-words')
  const tabs: { id: HandTab; label: string }[] = [
    { id: 'cards', label: '♠ Kartlar' },
    { id: 'true-words', label: '✦ True Words' },
    { id: 'characters', label: '🧝 Karakterler' },
    ...(isDm ? [{ id: 'dm-note' as const, label: '🔒 DM notu' }] : []),
  ]
  const name = profileName(profile)
  return (
    <>
      {/* The dashboard (v2.2.8's `.hand-dashboard`): the stats, and the tabs stacked at their right, or in a row
          under them on a phone (design D5). */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <HandSummary entries={entries} words={wordEntries} profile={profile} />
        <div
          role="tablist"
          aria-label="El"
          // On a phone, three tabs share one row; the DM's four take two rows of two, so none is cut off at 360 px.
          className={cn(
            'gap-2 sm:flex sm:w-34 sm:flex-col sm:justify-center',
            tabs.length > 3 ? 'grid grid-cols-2' : 'flex',
          )}
        >
          {tabs.map(({ id, label }) => (
            <Button
              key={id}
              role="tab"
              id={`${ids}-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`${ids}-panel`}
              variant={tab === id ? 'primary' : 'secondary'}
              onClick={() => chooseTab(id)}
              className="min-w-0 flex-1 whitespace-nowrap sm:flex-none"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className={cn('grid gap-4', showsPanel && 'lg:grid-cols-[minmax(0,1fr)_19.5rem]')}>
        <div className="flex min-w-0 flex-col gap-4">
          <div role="tabpanel" id={`${ids}-panel`} aria-labelledby={`${ids}-tab-${tab}`}>
            {tab === 'cards' ? (
              <ActiveWordsPeek entries={wordEntries}>
                <HandView
                  title={`${name} — Kart Eli`}
                  entries={entries}
                  onSelect={selectCard}
                  selectedId={isWide ? (selected?.holding.id ?? null) : null}
                />
              </ActiveWordsPeek>
            ) : tab === 'characters' ? (
              handCharacters.content
            ) : tab === 'dm-note' ? (
              <DmOnly>
                <DmNote profile={profile} />
              </DmOnly>
            ) : words.status === 'error' || knownWords.status === 'error' ? (
              <p
                role="alert"
                className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink"
              >
                True Words yüklenemedi.
              </p>
            ) : words.status === 'loading' || knownWords.status === 'loading' ? (
              <Spinner label="True Words yükleniyor…" className="py-12" />
            ) : (
              <HandTrueWords
                profile={profile}
                words={words.data}
                entries={wordEntries}
                onSelect={selectWord}
                selectedId={isWide ? (selectedWord?.record.id ?? null) : null}
              />
            )}
          </div>
          <PlayerNote profile={profile} />
        </div>
        {showsPanel && tab === 'true-words' ? (
          <HandDetailsPanel
            label="Seçili True Word"
            name={selectedWord?.word.name ?? null}
            badges={selectedWord ? <DetailsBadges badges={wordBadges(selectedWord)} /> : null}
            empty={{
              title: 'Bir True Word seç',
              hint: "Bir True Word'e tıkla, ayrıntıları burada görünsün.",
            }}
          >
            {selectedWord ? (
              <TrueWordDetails
                key={selectedWord.record.id}
                entry={selectedWord}
                holderName={name}
                onDone={() => setWordSelection(null)}
                layout="panel"
              />
            ) : null}
          </HandDetailsPanel>
        ) : null}
        {showsPanel && tab === 'cards' ? (
          <HandDetailsPanel
            label="Seçili Kart"
            name={selected?.card.name ?? null}
            badges={selected ? <DetailsBadges badges={holdingBadges(selected)} /> : null}
            empty={{
              title: 'Bir kart seç',
              hint: 'Elden bir karta tıkla, ayrıntıları burada görünsün.',
            }}
          >
            {selected ? (
              // Keyed by the holding, so a new selection starts without an open step.
              <HoldingDetails
                key={selected.holding.id}
                entry={selected}
                holderName={name}
                onDone={() => setCardSelection(null)}
                layout="panel"
              />
            ) : null}
          </HandDetailsPanel>
        ) : null}
      </div>
      {!isWide && tab === 'cards' && selected ? (
        <HoldingDialog
          key={selected.holding.id}
          entry={selected}
          holderName={name}
          onClose={() => setCardSelection(null)}
        />
      ) : null}
      {tab === 'characters' ? handCharacters.overlays : null}
      {!isWide && tab === 'true-words' && selectedWord ? (
        <TrueWordDialog
          key={selectedWord.record.id}
          entry={selectedWord}
          holderName={name}
          onClose={() => setWordSelection(null)}
        />
      ) : null}
    </>
  )
}
