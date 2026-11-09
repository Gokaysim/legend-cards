import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { trueWordsPath } from '@/app/screens'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName, useIsDm } from '@/features/users/usersContext'

import { OpenDraftPanel } from './OpenDraftPanel'
import type { TrueWord } from './schema'
import { TeachWordDialog } from './TeachWordDialog'
import { TrueWordDialog } from './TrueWordDialog'
import { TrueWordTile } from './TrueWordTile'
import { type KnownWordEntry, useOpenDraft } from './trueWordsContext'

export type HandTrueWordsProps = {
  profile: UserProfile
  /** Every word, retired ones included. */
  words: readonly TrueWord[]
  /** The player's known words, in the order learned. */
  entries: readonly KnownWordEntry[]
}

/**
 * A hand's True Words tab: the player's open draft, live, their known words in the order learned with cost, text
 * and active state, and a link to the draft on the True Words screen. Selecting a word opens its details. The DM
 * also gets "+ True Word öğret".
 */
export function HandTrueWords({ profile, words, entries }: HandTrueWordsProps) {
  const isDm = useIsDm()
  const isTableBusy = useIsTableBusy()
  const openDraft = useOpenDraft(profile.id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isTeaching, setIsTeaching] = useState(false)

  const name = profileName(profile)
  const wordsById = useMemo(() => new Map(words.map((word) => [word.id, word])), [words])
  const known = useMemo(() => new Set(entries.map((entry) => entry.record.wordId)), [entries])
  // A word taken back here or on another device closes its details.
  const selected = entries.find((entry) => entry.record.id === selectedId)
  const draft = openDraft.status === 'ready' ? openDraft.data : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">{`${entries.length} True Word · öğrenme sırası`}</p>
        <div className="flex flex-wrap gap-2">
          <Link
            to={trueWordsPath(isDm ? profile.id : undefined)}
            className="rounded-lg border border-control-line bg-control px-3 py-2 text-sm font-medium text-ink hover:bg-pane-raised"
          >
            ✦ True Word Draft
          </Link>
          {isDm ? (
            <Button
              variant="primary"
              disabled={isTableBusy}
              title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
              onClick={() => setIsTeaching(true)}
            >
              + True Word öğret
            </Button>
          ) : null}
        </div>
      </div>

      {openDraft.status === 'loading' ? (
        <Spinner label="Draft yükleniyor…" className="py-4" />
      ) : null}
      {draft !== null ? (
        <OpenDraftPanel draft={draft} wordsById={wordsById} ownerName={name} />
      ) : null}

      {entries.length === 0 ? (
        <p className="rounded-xl border border-line bg-pane p-6 text-ink-muted">
          Henüz True Word öğrenilmedi.
        </p>
      ) : (
        <ol
          aria-label="Bilinen True Words"
          className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3"
        >
          {entries.map(({ record, word }) => (
            <li key={record.id} className="relative">
              <TrueWordTile word={word} isActive={record.active} />
              {/* The whole tile opens the details; the tile itself stays readable as an article. */}
              <button
                type="button"
                onClick={() => setSelectedId(record.id)}
                aria-label={`${word.name}: ayrıntılar`}
                className="absolute inset-0 rounded-2xl hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              />
            </li>
          ))}
        </ol>
      )}

      {selected ? (
        <TrueWordDialog
          key={selected.record.id}
          entry={selected}
          holderName={name}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
      {isTeaching ? (
        <TeachWordDialog
          student={profile}
          words={words}
          known={known}
          onClose={() => setIsTeaching(false)}
        />
      ) : null}
    </div>
  )
}
