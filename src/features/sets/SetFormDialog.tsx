import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/authContext'
import { FormField } from '@/features/definitions/DefinitionForm'
import { FIELD_CLASSES } from '@/features/definitions/fieldClasses'
import { PictureField } from '@/features/definitions/PictureField'
import { choiceOf, KEEP_DRAFT, type PictureDraft } from '@/features/definitions/pictureDraft'
import { useIsTableBusy } from '@/features/table/tableContext'
import { cn } from '@/lib/cn'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import type { SetFields } from './api'
import { SetChangedError, type SetFailure, setFailureMessage, toSetFailure } from './errors'
import { type CardSet, PACK_LAYOUT_LABELS, PACK_LAYOUTS, type PackLayout } from './schema'
import { useSetActions, useSets } from './setsContext'
import { parseAliases, setFormProblems } from './validation'

type FormValues = { code: string; name: string; aliases: string; packLayout: PackLayout }

const EMPTY_VALUES: FormValues = { code: '', name: '', aliases: '', packLayout: 'standard' }

function valuesOf(set: CardSet): FormValues {
  return {
    code: set.code,
    name: set.name,
    aliases: set.aliases.join(', '),
    packLayout: set.packLayout,
  }
}

function fieldsOf(values: FormValues): SetFields {
  return {
    name: values.name.trim(),
    aliases: parseAliases(values.aliases),
    packLayout: values.packLayout,
  }
}

export type SetFormDialogProps = {
  /** The set to edit, or `null` to add one. */
  setId: string | null
  /** How many cards the DM's device holds with each set, by its ID, whatever their status. */
  cardCounts: ReadonlyMap<string, number>
  onClose: () => void
}

/**
 * The DM's set form (spec: card-sets, "Adding a set", "Editing a set", "Deleting a set", "The pictures in the set
 * form"): the code (fixed once the set exists), the official name, the aliases, the pack layout, and the cardback and
 * the Cardmaker. "Sil" deletes an unused set after a confirmation; while cards use it, it is disabled and says how many.
 * A layout change and a delete wait for an open pack. A set changed on another device is reloaded, never overwritten.
 */
export function SetFormDialog({ setId, cardCounts, onClose }: SetFormDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : ''
  const actions = useSetActions()
  const sets = useSets()
  const stored = sets.status === 'ready' ? sets.data : []
  const live = setId === null ? null : (stored.find((set) => set.id === setId) ?? null)
  // The set as the form loaded it: a save from it is refused when the set changed since.
  const [base, setBase] = useState<CardSet | null>(live)
  const [values, setValues] = useState<FormValues>(() =>
    base === null ? EMPTY_VALUES : valuesOf(base),
  )
  const [cardback, setCardback] = useState<PictureDraft>(KEEP_DRAFT)
  const [mascot, setMascot] = useState<PictureDraft>(KEEP_DRAFT)
  const [isWorking, setIsWorking] = useState(false)
  const [failure, setFailure] = useState<SetFailure | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const isOnline = useOnlineStatus()
  const isTableBusy = useIsTableBusy()

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))
  const fields = fieldsOf(values)
  const code = values.code.trim()
  const problems = setFormProblems(
    { id: base?.id ?? null, code, name: fields.name, aliases: fields.aliases },
    stored,
  )
  const isGone = setId !== null && sets.status === 'ready' && live === null
  const changesLayout = base !== null && base.packLayout !== values.packLayout
  const cardCount = base === null ? 0 : (cardCounts.get(base.id) ?? 0)
  const isBlocked = isWorking || isGone
  const canSave = !isBlocked && problems.length === 0 && !(changesLayout && isTableBusy)
  const canDelete = !isBlocked && cardCount === 0 && !isTableBusy

  const run = async (step: () => Promise<unknown>) => {
    setIsConfirming(false)
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
      setFailure(toSetFailure(error))
      if (error instanceof SetChangedError && live !== null) {
        setBase(live)
        setValues(valuesOf(live))
        setCardback(KEEP_DRAFT)
        setMascot(KEEP_DRAFT)
      }
      setIsWorking(false)
    }
  }

  const save = () =>
    base === null
      ? actions.addSet({
          code,
          fields,
          by: uid,
          existing: stored,
          cardback: choiceOf(cardback),
          mascot: choiceOf(mascot),
        })
      : actions.saveSet({
          set: base,
          fields,
          by: uid,
          cardback: choiceOf(cardback),
          mascot: choiceOf(mascot),
        })

  const title = base === null ? 'Yeni set' : `Seti düzenle: ${base.name}`
  return (
    <Dialog title={title} onClose={onClose} className="max-w-xl">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Code" htmlFor={`${ids}-code`}>
            <input
              id={`${ids}-code`}
              data-autofocus={base === null || undefined}
              value={values.code}
              readOnly={base !== null}
              aria-describedby={`${ids}-code-note`}
              onChange={(event) => set('code', event.target.value)}
              className={cn(FIELD_CLASSES, 'read-only:bg-pane read-only:text-ink-muted')}
            />
            <span id={`${ids}-code-note`} className="text-xs text-ink-muted">
              Kartlar seti bu kodla tanır.
              {base === null ? ' Kayıttan sonra değişmez.' : ' Değiştirilemez.'}
            </span>
          </FormField>
          <FormField label="Ad" htmlFor={`${ids}-name`}>
            <input
              id={`${ids}-name`}
              data-autofocus={base !== null || undefined}
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              className={FIELD_CLASSES}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Alias'lar" htmlFor={`${ids}-aliases`}>
              <input
                id={`${ids}-aliases`}
                value={values.aliases}
                placeholder="Başka yazımlar, virgülle ayır"
                aria-describedby={`${ids}-aliases-note`}
                onChange={(event) => set('aliases', event.target.value)}
                className={FIELD_CLASSES}
              />
              <span id={`${ids}-aliases-note`} className="text-xs text-ink-muted">
                Büyük-küçük harf, aksan ve boşluk fark etmez.
              </span>
            </FormField>
          </div>
        </div>

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm text-ink-muted">Paketler</legend>
          {PACK_LAYOUTS.map((layout) => (
            <label key={layout} className="flex min-h-10 items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name={`${ids}-layout`}
                value={layout}
                checked={values.packLayout === layout}
                onChange={() => set('packLayout', layout)}
                className="size-4 accent-gold"
              />
              {PACK_LAYOUT_LABELS[layout]}
              {layout === 'pandemonium' ? (
                <span className="text-xs text-ink-muted">(Pandemonium gibi)</span>
              ) : null}
            </label>
          ))}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <PictureField
            title="Cardback"
            stored={base?.cardback ?? null}
            draft={cardback}
            onChange={setCardback}
            name={`${fields.name || code} cardback`}
            disabled={!isOnline || isBlocked}
          />
          <PictureField
            title="Cardmaker"
            shape="cardmaker"
            stored={base?.mascot ?? null}
            draft={mascot}
            onChange={setMascot}
            name={`${fields.name || code} Cardmaker`}
            disabled={!isOnline || isBlocked}
          />
        </div>

        {problems.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm text-danger-ink">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}
        {isTableBusy ? (
          <p className="text-sm text-ink-muted">
            Bir Pack açık: paket düzeni değişikliği ve silme seçim yapılana kadar bekler.
          </p>
        ) : null}
        {!isOnline ? (
          <p className="text-sm text-ink-muted">Bağlantı yok: değişiklikler kaydedilemez.</p>
        ) : null}
        {isGone ? (
          <p role="alert" className="text-sm text-danger-ink">
            Bu set bu arada silindi.
          </p>
        ) : null}
        {failure ? (
          <p role="alert" className="text-sm text-danger-ink">
            {setFailureMessage(failure)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {base === null ? (
            <span />
          ) : (
            <div className="flex flex-col items-start gap-1">
              <Button
                variant="danger"
                disabled={!canDelete}
                aria-describedby={cardCount > 0 ? `${ids}-in-use` : undefined}
                onClick={() => setIsConfirming(true)}
              >
                Sil
              </Button>
              {cardCount > 0 ? (
                <span id={`${ids}-in-use`} className="text-xs text-ink-muted">
                  {cardCount} kart bu seti kullanıyor.
                </span>
              ) : null}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={onClose}>Vazgeç</Button>
            <Button variant="primary" disabled={!canSave} onClick={() => void run(save)}>
              Kaydet
            </Button>
          </div>
        </div>
      </div>

      {isConfirming && base !== null ? (
        <Dialog title="Seti sil" onClose={() => setIsConfirming(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink">
              {base.name} seti, cardback'i ve Cardmaker'ı ile silinir. Değişiklik kayıtları İşlem
              Logu'nda kalır.
            </p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setIsConfirming(false)}>Vazgeç</Button>
              <Button
                variant="danger"
                onClick={() => void run(() => actions.deleteSet({ set: base, cardCount, by: uid }))}
              >
                Sil
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </Dialog>
  )
}
