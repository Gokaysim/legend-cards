import { useState } from 'react'

import { DetailsBadges } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BinIcon, BoltIcon, PersonIcon, PowerIcon } from '@/components/ui/icons'
import { Pill } from '@/components/ui/Pill'
import { ToolSection } from '@/components/ui/ToolSection'
import { useArt } from '@/features/art/artContext'
import { CardPicture } from '@/features/art/CardPicture'
import { usePicture } from '@/features/art/usePicture'
import { useAuth } from '@/features/auth/authContext'
import { formatDelta } from '@/features/balances/format'
import {
  confirmUseLabel,
  initialEntered,
  planUsePayment,
  shortfallNote,
  type UsePayer,
} from '@/features/balances/paymentPlan'
import { UsePayment } from '@/features/balances/UsePayment'
import { CharacterPicker } from '@/features/characters/CharacterPicker'
import { useCharacterChoice } from '@/features/characters/useCharacterChoice'
import { visibleText } from '@/features/cards/text'
import { cn } from '@/lib/cn'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { TableBusyNote } from '@/features/table/TableBusyNote'
import { useIsTableBusy } from '@/features/table/tableContext'
import { useIsDm, useProfiles } from '@/features/users/usersContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { costLabel } from './display'
import { toWordFailure, type WordFailure, wordFailureMessage } from './errors'
import { useTrueWordActions, type KnownWordEntry } from './trueWordsContext'
import { wordBadges } from './wordBadges'

export type TrueWordDetailsProps = {
  entry: KnownWordEntry
  /** The name of the player who knows the word. */
  holderName: string
  /** Called after the word was taken back from here. */
  onDone: () => void
  /** `dialog` shows the badges at the top; in the `panel` beside the hand, the panel shows them by its label. */
  layout: 'dialog' | 'panel'
}

/** The DM's two buttons: an icon over a short label, in equal columns. */
const TOOL_BUTTON_CLASSES = 'min-h-14 flex-col gap-1 px-1 py-2 text-xs'

/**
 * A known word's details, the same in the dialog and in the panel beside the hand, in the frame of a card's details
 * (spec: true-words, "True Words tab on the hand screen"; design D4 of `redesign-selected-card-panel`): its picture,
 * large and glowing purple while active, or without one its name and text; labels for its cost and how it was learned;
 * who knows it; "Kullan" across the details; and the DM's tools. The picture carries the name and text, which stay
 * for screen readers. The player who knows the word and the DM use it, paying from the player's LP in a step in place
 * of the button (spec: true-words, "Using a True Word"); the word stays, and the details say it was used. The DM
 * switches it active (also while a pack is open) and takes it back, after a confirmation in place of the buttons, to
 * correct a mistake. Others only read.
 */
export function TrueWordDetails({ entry, holderName, onDone, layout }: TrueWordDetailsProps) {
  const { record, word } = entry
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const isTableBusy = useIsTableBusy()
  const isOnline = useOnlineStatus()
  const actions = useTrueWordActions()
  const profiles = useProfiles()
  const picture = usePicture(useArt().pictureUrl(word.picture))
  const [isConfirming, setIsConfirming] = useState(false)
  const [isUsing, setIsUsing] = useState(false)
  const [entered, setEntered] = useState('')
  /** The LP paid by the last use from here, to say that the word was used; `null` before any. */
  const [lastUse, setLastUse] = useState<number | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<WordFailure | null>(null)
  // The use step's character, the player's group first (spec: true-words, "The use step of a word").
  const choice = useCharacterChoice(record.uid, () => setFailure({ kind: 'character-unavailable' }))

  const canUse = isDm || (uid !== null && uid === record.uid)
  // The player's LP pays for a use, live. Until the profiles load, the payment is not known and a use waits.
  const ownerProfile =
    profiles.status === 'ready'
      ? profiles.data.find((profile) => profile.id === record.uid)
      : undefined
  const payer: UsePayer | null =
    ownerProfile?.role === 'player' ? { name: holderName, lp: ownerProfile.lp } : null
  const payment = planUsePayment({ cost: word.cost, payer, isDm, entered })

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
    void run(() => actions.takeBackWord({ recordId: record.id, by: uid }), onDone)
  }

  const startUse = () => {
    setFailure(null)
    setLastUse(null)
    setEntered(initialEntered(word.cost, isDm))
    setIsUsing(true)
  }

  const confirmUse = () => {
    const { amount } = payment
    if (uid === null || amount === null) return
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    void run(
      () =>
        actions
          .recordWordUse({
            recordId: record.id,
            by: uid,
            amount,
            target: choice.target,
            addEffect: choice.addEffect,
          })
          .then(() => undefined),
      () => {
        setIsUsing(false)
        setLastUse(amount)
      },
    )
  }

  const useStep = (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-pane-raised p-3">
      <CharacterPicker choice={choice} onInput={() => setFailure(null)} />
      <UsePayment
        plan={payment}
        payer={payer}
        cost={word.cost}
        entered={entered}
        onEnteredChange={setEntered}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={isBusy || isTableBusy || ownerProfile === undefined || !payment.canConfirm}
          title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
          onClick={confirmUse}
        >
          {isBusy ? 'Kaydediliyor…' : confirmUseLabel(payment.amount)}
        </Button>
        <Button disabled={isBusy} onClick={() => setIsUsing(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  )

  const text = visibleText(word.text)
  const hasPicture = picture.src !== null
  return (
    <div className="flex flex-col gap-4">
      {layout === 'dialog' ? <DetailsBadges badges={wordBadges(entry)} /> : null}
      {picture.src !== null ? (
        <div data-details-face="" className="relative mx-auto w-full max-w-66">
          {record.active ? (
            <div
              aria-hidden="true"
              data-stage-light=""
              className="pointer-events-none absolute -inset-4 rounded-full bg-radial from-glow-word/20 to-transparent to-70%"
            />
          ) : null}
          <CardPicture
            src={picture.src}
            alt={word.name}
            onError={picture.onError}
            className={cn('relative w-full', record.active && 'glow-word')}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-true-word-line bg-pane-raised p-4">
          <p lang="en" className="font-semibold break-words text-true-word">
            ✦ {word.name}
          </p>
          <p lang="en" className="text-sm break-words whitespace-pre-line text-ink">
            {text === '' ? 'Efekt metni yok.' : text}
          </p>
        </div>
      )}
      {hasPicture ? (
        <p lang="en" className="sr-only">
          {text === '' ? 'Efekt metni yok.' : text}
        </p>
      ) : null}

      <ul aria-label="True Word bilgileri" className="flex flex-wrap gap-1.5">
        <li>
          <Pill tone="true-word">{costLabel(word.cost)}</Pill>
        </li>
        <li>
          <Pill isMuted>{record.learnedVia === 'draft' ? "Draft'tan öğrendi" : 'DM öğretti'}</Pill>
        </li>
      </ul>

      <p className="flex items-center gap-2 text-[13px] text-ink-muted">
        <PersonIcon />
        {holderName} biliyor
      </p>

      {word.status === 'retired' ? (
        <p className="text-sm text-ink-muted">Bu True Word artık listede yok; oyuncuda kalır.</p>
      ) : null}

      {canUse && !isUsing ? (
        <Button
          variant="primary"
          disabled={isTableBusy}
          title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
          onClick={startUse}
          className="h-11 w-full text-[15px] font-semibold"
        >
          <BoltIcon />
          Kullan
        </Button>
      ) : null}
      {canUse && isUsing ? useStep : null}
      {canUse && !isDm && !isUsing ? <TableBusyNote /> : null}
      {lastUse !== null && !isUsing ? (
        <p role="status" className="text-sm text-ink">
          {lastUse > 0
            ? `${word.name} kullanıldı (${formatDelta(-lastUse)} LP).`
            : `${word.name} kullanıldı.`}
        </p>
      ) : null}

      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {failure.kind === 'insufficient'
            ? shortfallNote(holderName, failure.balance, failure.amount)
            : wordFailureMessage(failure, holderName)}
        </p>
      ) : null}

      {isDm ? (
        <ToolSection title="DM araçları">
          {isConfirming ? (
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
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                disabled={isBusy}
                onClick={toggleActive}
                className={cn(TOOL_BUTTON_CLASSES, record.active && 'border-green/55')}
              >
                <PowerIcon className={cn('size-4.5', record.active && 'text-green')} />
                {record.active ? 'Aktifliği kaldır' : 'Aktif et'}
              </Button>
              <Button
                variant="danger"
                disabled={isBusy || isTableBusy}
                title={isTableBusy ? TABLE_BUSY_NOTE : undefined}
                onClick={() => setIsConfirming(true)}
                className={TOOL_BUTTON_CLASSES}
              >
                <BinIcon className="size-4.5" />
                Geri al
              </Button>
            </div>
          )}
          {isTableBusy && !isConfirming ? (
            <p className="text-sm text-ink-muted">{TABLE_BUSY_NOTE}</p>
          ) : null}
        </ToolSection>
      ) : null}
    </div>
  )
}
