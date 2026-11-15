import { useId, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { LIBRARY_FOR_PARAM } from '@/app/screens'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth/authContext'
import { CardBrowser } from '@/features/cards/CardBrowser'
import { useWordEditing } from '@/features/definitions/useWordEditing'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'

import { DraftStart } from './DraftStart'
import { OpenDraftPanel } from './OpenDraftPanel'
import type { TrueWord } from './schema'
import { useKnownWords, useOpenDraft, useTrueWords } from './trueWordsContext'
import { useWordStatuses } from './wordStatus'

/**
 * The Kütüphane's True Words tab (spec: true-words, "The Kütüphane's True Words tab"): the chosen player's draft above
 * the words, which the Kütüphane's browser lists as faces or rows (spec: card-library). A player sees the tab for
 * themselves; the DM picks the player, kept in the URL (`?for=`). The chosen player's known words are marked
 * "Biliyor", and their open draft shows above the list, live. The DM also edits words here, and browses the drafts and
 * the retired words through the status filter.
 */
export function TrueWordsTab() {
  const ids = useId()
  const auth = useAuth()
  const isDm = useIsDm()
  const profiles = useProfiles()
  const words = useTrueWords()
  const editing = useWordEditing()
  const statuses = useWordStatuses()
  const [params, setParams] = useSearchParams()

  const profileList = profiles.status === 'ready' ? profiles.data : []
  const myUid = auth.status === 'signedIn' ? auth.user.uid : null
  const requested = params.get(LIBRARY_FOR_PARAM)
  const owner: UserProfile | undefined = isDm
    ? (profileList.find((profile) => profile.id === requested) ??
      profileList.find((profile) => profile.role !== 'dm') ??
      profileList.find((profile) => profile.id === myUid))
    : profileList.find((profile) => profile.id === myUid)

  const knownWords = useKnownWords(owner?.id ?? '')
  const openDraft = useOpenDraft(owner?.id ?? '')
  const known = useMemo(
    () =>
      knownWords.status === 'ready'
        ? new Set(knownWords.data.map((record) => record.wordId))
        : null,
    [knownWords],
  )
  const wordsById = useMemo(
    () => new Map(words.status === 'ready' ? words.data.map((word) => [word.id, word]) : []),
    [words],
  )
  const isKnown = useMemo(
    () =>
      known === null || owner === undefined ? undefined : (word: TrueWord) => known.has(word.id),
    [known, owner],
  )
  const draft = openDraft.status === 'ready' ? openDraft.data : null

  return (
    <div className="flex flex-col gap-6">
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
              next.set(LIBRARY_FOR_PARAM, event.target.value)
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

      {owner === undefined ? null : words.status === 'ready' &&
        known !== null &&
        openDraft.status === 'ready' ? (
        <DraftStart owner={owner} words={words.data} known={known} hasOpenDraft={draft !== null} />
      ) : words.status === 'error' ? null : (
        <Spinner label="True Words yükleniyor…" className="py-4" />
      )}

      {owner !== undefined && draft !== null ? (
        <OpenDraftPanel draft={draft} wordsById={wordsById} ownerName={profileName(owner)} />
      ) : null}

      <CardBrowser
        deck="words"
        cards={editing.cards}
        status={statuses === null ? undefined : { byCard: statuses }}
        isKnown={isKnown}
        {...editing.browserProps}
      />
      {editing.dialog}
    </div>
  )
}
