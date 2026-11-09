import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { useAuth } from '@/features/auth/authContext'
import { visibleText } from '@/features/cards/text'
import { cn } from '@/lib/cn'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { useIsTableBusy } from '@/features/table/tableContext'
import { useIsDm } from '@/features/users/usersContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { costLabel } from './display'
import { toWordFailure, type WordFailure, wordFailureMessage } from './errors'
import { useTrueWordActions, type KnownWordEntry } from './trueWordsContext'

export type TrueWordDialogProps = {
  entry: KnownWordEntry
  /** The name of the player who knows the word. */
  holderName: string
  onClose: () => void
}

/**
 * A known word's details: its picture large, or without one its text, its cost, how it was learned, and whether it is
 * active. The DM switches it active
 * (also while a pack is open) and takes it back, after a confirmation, to correct a mistake. Others only read.
 */
export function TrueWordDialog({ entry, holderName, onClose }: TrueWordDialogProps) {
  const { record, word } = entry
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const isTableBusy = useIsTableBusy()
  const isOnline = useOnlineStatus()
  const actions = useTrueWordActions()
  const picture = usePicture(useArt().wordUrl(word.id))
  const [isConfirming, setIsConfirming] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<WordFailure | null>(null)

  const run = async (action: () => Promise<void>, onDone?: () => void) => {
    setFailure(null)
    setIsBusy(true)
    try {
      await action()
      setIsBusy(false)
      onDone?.()
    } catch (error) {
      setFailure(toWordFailure(error))
      setIsBusy(false)
    }
  }

  const toggleActive = () => void run(() => actions.setActive(record.id, !record.active))
  const takeBack = () => {
    if (uid === null) return
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    void run(() => actions.takeBackWord({ recordId: record.id, by: uid }), onClose)
  }

  const text = visibleText(word.text)
  return (
    <Dialog title={`✦ ${word.name}`} onClose={onClose}>
      {picture.src === null ? null : (
        <CardPicture
          src={picture.src}
          alt={word.name}
          onError={picture.onError}
          className="mx-auto max-w-72"
        />
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-ink-muted">Kimde</dt>
        <dd className="text-ink">{holderName}</dd>
        <dt className="text-ink-muted">Cost</dt>
        <dd className="text-gold tabular-nums">{costLabel(word.cost)}</dd>
        <dt className="text-ink-muted">Nasıl</dt>
        <dd className="text-ink">
          {record.learnedVia === 'draft' ? "Draft'tan öğrendi" : 'DM öğretti'}
        </dd>
        <dt className="text-ink-muted">Durum</dt>
        <dd className={record.active ? 'text-gold' : 'text-ink'}>
          {record.active ? '● Aktif' : 'Aktif değil'}
        </dd>
      </dl>
      <p
        lang="en"
        className={cn(
          'text-sm break-words whitespace-pre-line text-ink',
          picture.src !== null && 'sr-only',
        )}
      >
        {text === '' ? 'Efekt metni yok.' : text}
      </p>
      {word.retired ? (
        <p className="text-sm text-ink-muted">Bu True Word artık listede yok; oyuncuda kalır.</p>
      ) : null}

      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {wordFailureMessage(failure, holderName)}
        </p>
      ) : null}

      {isDm && !isConfirming ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={record.active ? 'secondary' : 'primary'}
            disabled={isBusy}
            onClick={toggleActive}
          >
            {record.active ? '✓ Aktifliği kaldır' : '● Aktif et'}
          </Button>
          <Button
            variant="danger"
            disabled={isBusy || isTableBusy}
            title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
            onClick={() => setIsConfirming(true)}
          >
            Geri al
          </Button>
        </div>
      ) : null}
      {isDm && isTableBusy && !isConfirming ? (
        <p className="text-sm text-ink-muted">{TABLE_BUSY_NOTE}</p>
      ) : null}

      {isDm && isConfirming ? (
        <div className="flex flex-col gap-2 rounded-xl border border-danger-line bg-pane-raised p-3">
          <p className="text-sm text-ink">
            {`${holderName} bu True Word'ü artık bilmeyecek. Kayıt silinmez, İşlem Logu'nda görünür. Geri alınsın mı?`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" disabled={isBusy || isTableBusy} onClick={takeBack}>
              {isBusy ? 'Kaydediliyor…' : 'Evet, geri al'}
            </Button>
            <Button disabled={isBusy} onClick={() => setIsConfirming(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}
