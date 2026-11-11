import { type ReactNode, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useIsTableBusy } from '@/features/table/tableContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import {
  DefinitionChangedError,
  type DefinitionFailure,
  definitionFailureMessage,
  toDefinitionFailure,
} from './errors'
import { type DefinitionStatus, STATUS_LABELS } from './status'

/** A labelled field of the form. */
export function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

type Confirm = 'retire' | 'delete'

export type DefinitionFormProps = {
  title: string
  /** What the definition is, in the messages: "kart" or "True Word". */
  what: 'kart' | 'True Word'
  /** The definition's status, or `null` for a new one. */
  status: DefinitionStatus | null
  /** The Turkish names of the required fields that are empty. */
  missing: readonly string[]
  /** Problems that block every save, such as an empty or taken name, in Turkish. */
  problems: readonly string[]
  /** The definition was deleted on another device while the form was open. */
  isGone?: boolean
  /** Saves the fields; `publish` adds a new definition as active, or publishes a draft. */
  onSave: (publish: boolean) => Promise<unknown>
  /** Retires an active definition, or brings a retired one back. */
  onSetStatus: (status: 'active' | 'retired') => Promise<void>
  /** Deletes a draft. */
  onDelete: () => Promise<void>
  /** Called after the definition changed on another device: the form loads its new values. */
  onChanged: () => void
  onClose: () => void
  /** The fields. */
  children: ReactNode
}

/**
 * The DM's form for one card or True Word (spec: definition-editing): the fields, then the steps the status allows.
 * A new definition offers "Kaydet" (a draft) and "Kaydet ve yayınla"; a draft "Kaydet", "Yayınla" and "Sil"; an active
 * one "Kaydet" and "Kaldır"; a retired one "Kaydet" and "Geri al". "Kaldır" and "Sil" ask first. Disabled controls say
 * why: the empty fields, a pack the table waits for, or no connection. A step that succeeds closes the form; a failure
 * shows its Turkish message, and a definition changed elsewhere is reloaded.
 */
export function DefinitionForm({
  title,
  what,
  status,
  missing,
  problems,
  isGone = false,
  onSave,
  onSetStatus,
  onDelete,
  onChanged,
  onClose,
  children,
}: DefinitionFormProps) {
  const isTableBusy = useIsTableBusy()
  const isOnline = useOnlineStatus()
  const [isWorking, setIsWorking] = useState(false)
  const [failure, setFailure] = useState<DefinitionFailure | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const isComplete = missing.length === 0
  const isLive = status === 'active' || status === 'retired'
  const isBlocked = isWorking || isGone || !isOnline
  const canSave = !isBlocked && problems.length === 0 && (isComplete || !isLive)
  const canPublish = !isBlocked && problems.length === 0 && isComplete && !isTableBusy
  const canStep = !isBlocked && !isTableBusy

  const run = async (step: () => Promise<unknown>) => {
    setConfirm(null)
    setFailure(null)
    if (!isOnline) {
      setFailure({ kind: 'offline' })
      return
    }
    setIsWorking(true)
    try {
      await step()
      onClose()
    } catch (error) {
      setFailure(toDefinitionFailure(error))
      if (error instanceof DefinitionChangedError) onChanged()
      setIsWorking(false)
    }
  }

  const missingText = missing.join(', ')
  return (
    <Dialog title={title} onClose={onClose} className="max-w-xl">
      <div className="flex flex-col gap-4">
        {status === null ? null : (
          <p className="text-sm text-ink-muted">
            Durum: <span className="font-semibold text-ink">{STATUS_LABELS[status]}</span>
          </p>
        )}
        {children}

        {problems.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm text-danger-ink">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}
        {!isComplete ? (
          <p className="text-sm text-ink-muted">
            {isLive
              ? `${STATUS_LABELS[status]} bir ${what} için doldur: ${missingText}.`
              : `Yayınlamak için doldur: ${missingText}.`}
          </p>
        ) : null}
        {isTableBusy ? (
          <p className="text-sm text-ink-muted">
            Bir Pack açık: yayınlama, kaldırma, geri alma ve silme seçim yapılana kadar bekler.
          </p>
        ) : null}
        {!isOnline ? (
          <p className="text-sm text-ink-muted">Bağlantı yok: değişiklikler kaydedilemez.</p>
        ) : null}
        {isGone ? (
          <p role="alert" className="text-sm text-danger-ink">
            Bu {what} bu arada silindi.
          </p>
        ) : null}
        {failure ? (
          <p role="alert" className="text-sm text-danger-ink">
            {definitionFailureMessage(failure, what)}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          {status === 'draft' ? (
            <Button variant="danger" disabled={!canStep} onClick={() => setConfirm('delete')}>
              Sil
            </Button>
          ) : null}
          {status === 'active' ? (
            <Button variant="danger" disabled={!canStep} onClick={() => setConfirm('retire')}>
              Kaldır
            </Button>
          ) : null}
          {status === 'retired' ? (
            <Button disabled={!canStep} onClick={() => void run(() => onSetStatus('active'))}>
              Geri al
            </Button>
          ) : null}
          <Button disabled={!canSave} onClick={() => void run(() => onSave(false))}>
            Kaydet
          </Button>
          {status === null || status === 'draft' ? (
            <Button
              variant="primary"
              disabled={!canPublish}
              onClick={() => void run(() => onSave(true))}
            >
              {status === null ? 'Kaydet ve yayınla' : 'Yayınla'}
            </Button>
          ) : null}
        </div>
      </div>

      {confirm === 'retire' ? (
        <Dialog
          title={`${what === 'kart' ? 'Kartı' : "True Word'ü"} kaldır`}
          onClose={() => setConfirm(null)}
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              Kütüphaneden, havuzdan, paketlerden ve draft'lardan çıkar. Elinde ya da bilgisinde
              olanlarda kalır; istediğinde geri alabilirsin.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConfirm(null)}>Vazgeç</Button>
              <Button variant="danger" onClick={() => void run(() => onSetStatus('retired'))}>
                Kaldır
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
      {confirm === 'delete' ? (
        <Dialog title="Taslağı sil" onClose={() => setConfirm(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              Bu taslak silinir. Değişiklik kayıtları İşlem Logu'nda kalır.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setConfirm(null)}>Vazgeç</Button>
              <Button variant="danger" onClick={() => void run(onDelete)}>
                Sil
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </Dialog>
  )
}
