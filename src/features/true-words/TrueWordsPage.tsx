import { useId, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { screenById } from '@/app/screens'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'

import { DraftStart } from './DraftStart'
import { OpenDraftPanel } from './OpenDraftPanel'
import type { TrueWord } from './schema'
import { TrueWordTile } from './TrueWordTile'
import { activeWordsSorted, useKnownWords, useOpenDraft, useTrueWords } from './trueWordsContext'

/** The search parameter of the DM's chosen player; see `trueWordsPath`. */
const FOR_PARAM = 'for'

/**
 * The True Words screen: every active word, sorted by name, with its cost and text, and the draft. A player sees it
 * for themselves; the DM picks the player, kept in the URL (`?for=`). The chosen player's known words are marked
 * "Biliyor", and their open draft shows above the list, live.
 */
export function TrueWordsPage() {
  const title = screenById('true-words').label
  const words = useTrueWords()
  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={title} />
      {words.status === 'loading' ? (
        <Spinner label="True Words yükleniyor…" className="py-12" />
      ) : words.status === 'error' ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-line bg-pane p-4 text-danger-ink"
        >
          True Words yüklenemedi.
        </p>
      ) : (
        <TrueWordsScreen words={words.data} />
      )}
    </section>
  )
}

function TrueWordsScreen({ words }: { words: readonly TrueWord[] }) {
  const ids = useId()
  const auth = useAuth()
  const isDm = useIsDm()
  const profiles = useProfiles()
  const [params, setParams] = useSearchParams()

  const profileList = profiles.status === 'ready' ? profiles.data : []
  const myUid = auth.status === 'signedIn' ? auth.user.uid : null
  const requested = params.get(FOR_PARAM)
  const owner: UserProfile | undefined = isDm
    ? (profileList.find((profile) => profile.id === requested) ??
      profileList.find((profile) => profile.role !== 'dm') ??
      profileList.find((profile) => profile.id === myUid))
    : profileList.find((profile) => profile.id === myUid)

  const knownWords = useKnownWords(owner?.id ?? '')
  const openDraft = useOpenDraft(owner?.id ?? '')
  const known = useMemo(
    () =>
      new Set(knownWords.status === 'ready' ? knownWords.data.map((record) => record.wordId) : []),
    [knownWords],
  )
  const wordsById = useMemo(() => new Map(words.map((word) => [word.id, word])), [words])
  const active = useMemo(() => activeWordsSorted(words), [words])
  const draft = openDraft.status === 'ready' ? openDraft.data : null

  return (
    <>
      {isDm ? (
        <div className="flex max-w-sm flex-col gap-1">
          <label htmlFor={`${ids}-for`} className="text-sm font-medium text-ink">
            Kimin için
          </label>
          <select
            id={`${ids}-for`}
            value={owner?.id ?? ''}
            onChange={(event) => {
              const next = new URLSearchParams(params)
              next.set(FOR_PARAM, event.target.value)
              setParams(next)
            }}
            className="w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink"
          >
            {profileList.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profileName(profile)}
                {profile.role === 'dm' ? ' (DM)' : ''}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {owner === undefined ? null : knownWords.status === 'ready' &&
        openDraft.status === 'ready' ? (
        <DraftStart owner={owner} words={words} known={known} hasOpenDraft={draft !== null} />
      ) : (
        <Spinner label="True Words yükleniyor…" className="py-4" />
      )}

      {owner !== undefined && draft !== null ? (
        <OpenDraftPanel draft={draft} wordsById={wordsById} ownerName={profileName(owner)} />
      ) : null}

      <section aria-labelledby={`${ids}-list`} className="flex flex-col gap-3">
        <h2 id={`${ids}-list`} className="text-lg font-semibold text-ink">
          {`True Words (${active.length})`}
        </h2>
        {active.length === 0 ? (
          <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
            Henüz True Word yok.
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
            {active.map((word) => (
              <li key={word.id}>
                <TrueWordTile word={word} isKnown={known.has(word.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
