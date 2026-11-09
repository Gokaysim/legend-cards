import { useId, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { matchesAllTerms, normalize, searchTerms } from '@/features/cards/text'
import { useAuth } from '@/features/auth/authContext'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import type { UserProfile } from '@/features/users/schema'
import { profileName } from '@/features/users/usersContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { dative } from '@/lib/turkish'

import { learnableWords } from './api'
import { toWordFailure, type WordFailure, wordFailureMessage } from './errors'
import type { TrueWord } from './schema'
import { TrueWordTile } from './TrueWordTile'
import { activeWordsSorted, useTrueWordActions } from './trueWordsContext'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

export type TeachWordDialogProps = {
  /** The player who learns the word. */
  student: UserProfile
  /** Every word. */
  words: readonly TrueWord[]
  /** The IDs of the words the player knows. */
  known: ReadonlySet<string>
  onClose: () => void
}

/**
 * The DM's "+ True Word öğret": searches the active words the player does not know, by name and text (terms
 * separated by commas or semicolons must all match, as in the library), and teaches the chosen one without a draft
 * and without LP. Waits while a pack is open.
 */
export function TeachWordDialog({ student, words, known, onClose }: TeachWordDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const actions = useTrueWordActions()
  const isTableBusy = useIsTableBusy()
  const isOnline = useOnlineStatus()
  const [query, setQuery] = useState('')
  const [busyWordId, setBusyWordId] = useState<string | null>(null)
  const [failure, setFailure] = useState<WordFailure | null>(null)

  const name = profileName(student)
  const candidates = useMemo(() => activeWordsSorted(learnableWords(words, known)), [words, known])
  const terms = searchTerms(query)
  const shown =
    terms.length === 0
      ? candidates
      : candidates.filter((word) => matchesAllTerms(normalize(`${word.name} ${word.text}`), terms))

  const teach = async (word: TrueWord) => {
    if (uid === null) return
    setFailure(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setBusyWordId(word.id)
    try {
      await actions.teachWord({ uid: student.id, wordId: word.id, by: uid })
      onClose()
    } catch (error) {
      setFailure(toWordFailure(error))
      setBusyWordId(null)
    }
  }

  return (
    <Dialog title={`${dative(name)} True Word öğret`} onClose={onClose}>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-search`} className="text-sm font-medium text-ink">
          Ara
        </label>
        <input
          id={`${ids}-search`}
          type="search"
          data-autofocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ad veya metin"
          className={fieldClasses}
        />
        <p className="text-xs text-ink-muted">
          {`${shown.length} True Word · ${name} bunları henüz bilmiyor.`}
        </p>
      </div>
      {isTableBusy ? <p className="text-sm text-ink-muted">{TABLE_BUSY_NOTE}</p> : null}
      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {wordFailureMessage(failure, name)}
        </p>
      ) : null}
      {shown.length === 0 ? (
        <p className="text-sm text-ink-muted">Öğretilebilecek True Word yok.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((word) => (
            <li key={word.id}>
              <TrueWordTile word={word}>
                <Button
                  variant="primary"
                  aria-label={`${word.name}: öğret`}
                  disabled={busyWordId !== null || isTableBusy}
                  onClick={() => void teach(word)}
                >
                  {busyWordId === word.id ? 'Kaydediliyor…' : 'Öğret'}
                </Button>
              </TrueWordTile>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
