import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/authContext'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import { useIsDm } from '@/features/users/usersContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { draftPaymentText, draftRefundText, draftSkipText } from './display'
import { toWordFailure, type WordFailure, wordFailureMessage } from './errors'
import type { TrueWord, WordDraft } from './schema'
import { TrueWordTile } from './TrueWordTile'
import { useKnownWords, useTrueWordActions } from './trueWordsContext'

export type OpenDraftPanelProps = {
  draft: WordDraft
  /** Every word, retired ones included, by ID. */
  wordsById: ReadonlyMap<string, TrueWord>
  /** The draft player's name. */
  ownerName: string
}

type Step = 'idle' | 'skip' | 'cancel'

/** A shown word that is no longer in the list: drawn by its ID until the data says more. */
function missingWord(id: string): TrueWord {
  return { id, name: id, nameKey: id, cost: '?', text: '', retired: true }
}

/**
 * An open True Word draft, live for everyone: its 3 words. The draft's player and the DM learn one ("Öğren") or skip
 * it ("Pas Geç", after a confirmation naming the payment that will not come back), and the DM can cancel it with a
 * refund. A shown word that the player came to know meanwhile is marked and cannot be learned. Every step waits while
 * a pack is open. Inline, not a modal: a draft does not stop the table.
 */
export function OpenDraftPanel({ draft, wordsById, ownerName }: OpenDraftPanelProps) {
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const isTableBusy = useIsTableBusy()
  const isOnline = useOnlineStatus()
  const actions = useTrueWordActions()
  const knownWords = useKnownWords(draft.uid)
  const [step, setStep] = useState<Step>('idle')
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<WordFailure | null>(null)

  const known = useMemo(
    () =>
      new Set(knownWords.status === 'ready' ? knownWords.data.map((record) => record.wordId) : []),
    [knownWords],
  )
  const canAct = uid !== null && (uid === draft.uid || isDm)
  const isBlocked = isBusy || isTableBusy

  const run = async (action: () => Promise<unknown>) => {
    if (uid === null) return
    setFailure(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsBusy(true)
    try {
      await action()
    } catch (error) {
      setFailure(toWordFailure(error))
      setStep('idle')
      setIsBusy(false)
    }
  }

  const learn = (wordId: string) =>
    void run(() => actions.learnWord({ draftId: draft.id, wordId, by: uid ?? '' }))
  const skip = () => void run(() => actions.skipDraft({ draftId: draft.id, by: uid ?? '' }))
  const cancel = () => void run(() => actions.cancelDraft({ draftId: draft.id, by: uid ?? '' }))

  return (
    <section
      aria-label={`${ownerName} için açık True Word draft'ı`}
      className="flex flex-col gap-3 rounded-2xl border border-gold bg-pane-raised p-4"
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">{`✦ True Word Draft · ${ownerName}`}</h2>
        <p className="text-sm text-ink-muted">
          {`Ödeme: ${draftPaymentText(draft)} · ${canAct ? 'Bir True Word öğren veya pas geç.' : `${ownerName} seçiyor…`}`}
        </p>
      </header>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
        {draft.offered.map((wordId) => {
          const word = wordsById.get(wordId) ?? missingWord(wordId)
          const isKnown = known.has(wordId)
          return (
            <li key={wordId}>
              <TrueWordTile word={word} isKnown={isKnown}>
                {canAct ? (
                  <Button
                    variant="primary"
                    disabled={isBlocked || isKnown || word.retired || step !== 'idle'}
                    onClick={() => learn(wordId)}
                    aria-label={`${word.name}: öğren`}
                  >
                    {isKnown ? 'Zaten biliyor' : word.retired ? 'Artık kullanılmıyor' : 'Öğren'}
                  </Button>
                ) : null}
              </TrueWordTile>
            </li>
          )
        })}
      </ul>

      {isTableBusy && canAct ? <p className="text-sm text-ink-muted">{TABLE_BUSY_NOTE}</p> : null}
      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane p-3 text-sm text-danger-ink"
        >
          {wordFailureMessage(failure, ownerName)}
        </p>
      ) : null}

      {canAct && step === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={isBlocked} onClick={() => setStep('skip')}>
            ✕ Pas Geç
          </Button>
          {isDm ? (
            <Button variant="danger" disabled={isBlocked} onClick={() => setStep('cancel')}>
              İptal et ve iade et
            </Button>
          ) : null}
        </div>
      ) : null}

      {canAct && step === 'skip' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-pane p-3">
          <p className="text-sm text-ink">{`${draftSkipText(draft)} Pas geçilsin mi?`}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={isBlocked} onClick={skip}>
              {isBusy ? 'Kaydediliyor…' : 'Evet, pas geç'}
            </Button>
            <Button disabled={isBusy} onClick={() => setStep('idle')}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}

      {canAct && isDm && step === 'cancel' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-danger-line bg-pane p-3">
          <p className="text-sm text-ink">
            {`${draftRefundText(draft, ownerName)} Hiçbir True Word öğrenilmez. Draft iptal edilsin mi?`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={isBlocked} onClick={cancel}>
              {isBusy ? 'Kaydediliyor…' : 'Evet, iptal et'}
            </Button>
            <Button disabled={isBusy} onClick={() => setStep('idle')}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
