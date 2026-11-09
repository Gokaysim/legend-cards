import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/authContext'
import { CardFace } from '@/features/cards/CardFace'
import { NO_VALUE } from '@/features/cards/display'
import { TABLE_BUSY_NOTE } from '@/features/table/errors'
import { TableBusyNote } from '@/features/table/TableBusyNote'
import { useIsTableBusy } from '@/features/table/tableContext'
import { profileName, useIsDm, useProfiles } from '@/features/users/usersContext'
import { genitive } from '@/lib/turkish'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { type HoldingFailure, holdingFailureMessage, toHoldingFailure } from './errors'
import type { HandEntry } from './handEntries'
import { useHoldingActions } from './holdingsContext'
import { HOLDING_LIMITS } from './schema'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

/**
 * A text field saved when it loses focus, if it changed. While the user types, and until the subscription shows
 * the saved value, the field keeps what the user wrote; otherwise it follows the stored value live.
 */
function useSavedField(
  stored: string,
  save: (value: string) => Promise<void>,
  onError: (error: unknown) => void,
  normalize: (value: string) => string = (value) => value,
) {
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  if (saving !== null && saving === stored) setSaving(null)

  return {
    value: draft ?? saving ?? stored,
    onFocus: () => setDraft(saving ?? stored),
    onChange: (value: string) => setDraft(value),
    onBlur: () => {
      if (draft === null) return
      setDraft(null)
      const next = normalize(draft)
      if (next === stored) return
      setSaving(next)
      save(next).catch((error: unknown) => {
        setSaving(null)
        onError(error)
      })
    },
  }
}

type Step = 'idle' | 'use' | 'discard' | 'transfer'

export type HoldingDialogProps = {
  entry: HandEntry
  /** The name of the player who holds the card. */
  holderName: string
  onClose: () => void
}

/**
 * The details of a held card: its face, its note, its cost in this hand, and the actions the signed-in user may
 * take. The holder and the DM edit the note and use the card; only the DM switches it active, sets its cost,
 * discards it, or gives it to another player. Controls the user may not use are not shown; the rules decide.
 * Every confirmation is a step inside the dialog. While a pack is open, the card cannot leave the hand: using,
 * discarding and giving it away wait, and the note, the active switch and the cost stay available.
 */
export function HoldingDialog({ entry, holderName, onClose }: HoldingDialogProps) {
  const { holding, card, cost, isExtraCopy } = entry
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const isDm = useIsDm()
  const isHolder = uid !== null && uid === holding.uid
  const canUse = isDm || isHolder
  const actions = useHoldingActions()
  const isOnline = useOnlineStatus()
  const profiles = useProfiles()
  const isTableBusy = useIsTableBusy()
  const busyTitle = isTableBusy ? TABLE_BUSY_NOTE : undefined

  const [step, setStep] = useState<Step>('idle')
  const [usedOn, setUsedOn] = useState('')
  const [receiver, setReceiver] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [failure, setFailure] = useState<HoldingFailure | null>(null)
  const showError = (error: unknown) => setFailure(toHoldingFailure(error))

  const note = useSavedField(holding.note, (value) => actions.setNote(holding.id, value), showError)
  const costOverride = useSavedField(
    holding.costOverride ?? '',
    (value) => actions.setCost(holding.id, value),
    showError,
    (value) => value.trim(),
  )

  const receivers =
    profiles.status === 'ready' ? profiles.data.filter((profile) => profile.id !== holding.uid) : []

  const goTo = (next: Step) => {
    setFailure(null)
    setStep(next)
  }

  /** Runs a card movement. Movements need the server: offline, it says so instead of trying. */
  const move = async (run: (by: string) => Promise<unknown>) => {
    if (uid === null) return
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setFailure(null)
    setIsBusy(true)
    try {
      await run(uid)
      onClose()
    } catch (error) {
      showError(error)
      setIsBusy(false)
    }
  }

  const toggleActive = () => {
    setFailure(null)
    actions.setActive(holding.id, !holding.active).catch(showError)
  }

  return (
    <Dialog title={card.name} onClose={onClose}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="mx-auto w-full max-w-72 shrink-0 sm:mx-0 sm:w-60">
          <CardFace
            card={card}
            handCost={cost}
            isActive={holding.active}
            hasNote={holding.note !== ''}
            isExtraCopy={isExtraCopy}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="text-sm text-ink-muted">
            {genitive(holderName)} elinde{isExtraCopy ? ' · Ek kopya' : ''}
          </p>

          <div className="flex flex-col gap-1">
            {canUse ? (
              <label htmlFor={`${ids}-note`} className="text-sm font-medium text-ink">
                Kart notu
              </label>
            ) : (
              <p className="text-sm font-medium text-ink">Kart notu</p>
            )}
            {canUse ? (
              <textarea
                id={`${ids}-note`}
                value={note.value}
                maxLength={HOLDING_LIMITS.note}
                rows={3}
                placeholder="Bu kart için oyuncuya özel not"
                onFocus={note.onFocus}
                onChange={(event) => note.onChange(event.target.value)}
                onBlur={note.onBlur}
                className={fieldClasses}
              />
            ) : (
              <p className="text-sm whitespace-pre-line text-ink">{holding.note || 'Not yok.'}</p>
            )}
          </div>

          {isDm ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={`${ids}-cost`} className="text-sm font-medium text-ink">
                Bu eldeki cost (boş = temel cost: {card.cost ?? NO_VALUE})
              </label>
              <input
                id={`${ids}-cost`}
                value={costOverride.value}
                maxLength={HOLDING_LIMITS.costOverride}
                placeholder={card.cost ?? NO_VALUE}
                onFocus={costOverride.onFocus}
                onChange={(event) => costOverride.onChange(event.target.value)}
                onBlur={costOverride.onBlur}
                className={fieldClasses}
              />
            </div>
          ) : null}
        </div>
      </div>

      {step === 'idle' && (canUse || isDm) ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {canUse ? (
              <Button
                variant="primary"
                disabled={isTableBusy}
                title={busyTitle}
                onClick={() => goTo('use')}
              >
                Kullan
              </Button>
            ) : null}
            {isDm ? (
              <>
                <Button variant={holding.active ? 'primary' : 'secondary'} onClick={toggleActive}>
                  {holding.active ? '✓ Aktifliği kaldır' : '● Aktif et'}
                </Button>
                <Button disabled={isTableBusy} title={busyTitle} onClick={() => goTo('transfer')}>
                  Başkasına ver
                </Button>
                <Button
                  variant="danger"
                  disabled={isTableBusy}
                  title={busyTitle}
                  onClick={() => goTo('discard')}
                >
                  At
                </Button>
              </>
            ) : null}
          </div>
          <TableBusyNote />
        </div>
      ) : null}

      {step === 'use' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-pane-raised p-3">
          <label htmlFor={`${ids}-used-on`} className="text-sm font-medium text-ink">
            Hangi karakter üzerinde? (isteğe bağlı)
          </label>
          <input
            id={`${ids}-used-on`}
            value={usedOn}
            maxLength={HOLDING_LIMITS.usedOn}
            onChange={(event) => setUsedOn(event.target.value)}
            className={fieldClasses}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={isBusy || isTableBusy}
              title={busyTitle}
              onClick={() =>
                void move((by) =>
                  actions.closeHolding({ holdingId: holding.id, by, reason: 'used', usedOn }),
                )
              }
            >
              {isBusy ? 'Kaydediliyor…' : 'Kullanımı onayla'}
            </Button>
            <Button disabled={isBusy} onClick={() => goTo('idle')}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'discard' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-danger-line bg-pane-raised p-3">
          <p className="text-sm text-ink">
            Bu kart kullanılmadan elden atılsın mı?
            {card.kind === 'normal' && !isExtraCopy ? ' Kart havuza döner.' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              disabled={isBusy || isTableBusy}
              title={busyTitle}
              onClick={() =>
                void move((by) =>
                  actions.closeHolding({ holdingId: holding.id, by, reason: 'discarded' }),
                )
              }
            >
              {isBusy ? 'Kaydediliyor…' : 'Evet, at'}
            </Button>
            <Button disabled={isBusy} onClick={() => goTo('idle')}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'transfer' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-pane-raised p-3">
          <label htmlFor={`${ids}-receiver`} className="text-sm font-medium text-ink">
            Kime verilsin?
          </label>
          <select
            id={`${ids}-receiver`}
            value={receiver}
            onChange={(event) => setReceiver(event.target.value)}
            className={fieldClasses}
          >
            <option value="">Oyuncu seç</option>
            {receivers.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profileName(profile)}
              </option>
            ))}
          </select>
          <p className="text-sm text-ink-muted">
            Kart, seçilen oyuncunun elinin sonuna eklenir. Not, cost ve aktiflik korunur.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={isBusy || isTableBusy || receiver === ''}
              title={busyTitle}
              onClick={() =>
                void move((by) =>
                  actions.transferHolding({ holdingId: holding.id, toUid: receiver, by }),
                )
              }
            >
              {isBusy ? 'Kaydediliyor…' : 'Onayla ve ver'}
            </Button>
            <Button disabled={isBusy} onClick={() => goTo('idle')}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}

      {failure ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {holdingFailureMessage(failure)}
        </p>
      ) : null}
    </Dialog>
  )
}
