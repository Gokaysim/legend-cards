import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/authContext'
import type { CustomCard, CustomCardEffect } from '@/features/cards/schema'
import { toDefinitionFailure, definitionFailureMessage } from '@/features/definitions/errors'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { useCustomDraftActions, useCustomEffects } from './customDraftContext'
import {
  cardCost,
  costLine,
  CUSTOM_COSTS,
  type CustomCost,
  EFFECT_TYPES,
  type EffectType,
  effectLine,
  variantText,
} from './draftRules'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

export type CustomEffectsDialogProps = {
  card: CustomCard
  onClose: () => void
}

/**
 * The DM's "Efektleri düzenle" on a Custom Card (spec: custom-cards, "The DM edits a Custom Card's effects"; design D8
 * of add-custom-card-draft): removes an effect while one remains, and adds a type the card lacks at a cost that has a
 * text, with that text as it is stored now. The new cost shows before saving. Saving needs a connection.
 */
export function CustomEffectsDialog({ card, onClose }: CustomEffectsDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : null
  const actions = useCustomDraftActions()
  const stored = useCustomEffects()
  const isOnline = useOnlineStatus()
  const variants = stored.status === 'ready' ? stored.data : {}

  const [effects, setEffects] = useState<CustomCardEffect[]>(card.effects)
  const missing = EFFECT_TYPES.filter((type) => !effects.some((effect) => effect.type === type))
  const [newType, setNewType] = useState<EffectType | ''>('')
  const costs =
    newType === ''
      ? []
      : CUSTOM_COSTS.filter((cost) => variantText(variants, newType, cost) !== null)
  const [newCost, setNewCost] = useState<CustomCost | ''>('')
  const newText = newType === '' || newCost === '' ? null : variantText(variants, newType, newCost)
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const isChanged = JSON.stringify(effects) !== JSON.stringify(card.effects)

  const add = () => {
    if (newType === '' || newCost === '' || newText === null) return
    setEffects([...effects, { type: newType, cost: newCost, text: newText }])
    setNewType('')
    setNewCost('')
  }

  const save = async () => {
    if (uid === null || !isChanged) return
    setMessage(null)
    if (!isOnline) {
      setMessage('Bağlantı yok: efektleri değiştirmek için internet bağlantısı gerekiyor.')
      return
    }
    setIsBusy(true)
    try {
      await actions.editEffects({ card, effects, by: uid })
      onClose()
    } catch (error) {
      setMessage(definitionFailureMessage(toDefinitionFailure(error), 'kart'))
      setIsBusy(false)
    }
  }

  return (
    <Dialog title="Efektleri düzenle" onClose={onClose}>
      <p className="text-sm text-ink">
        <span className="text-ink-muted">Maliyet: </span>
        <span className="font-semibold tabular-nums">{costLine(cardCost(card.base, effects))}</span>
      </p>
      <ol aria-label="Efektler" className="flex flex-col gap-2">
        {effects.map((effect) => (
          <li
            key={effect.type}
            className="flex items-start gap-2 rounded-lg border border-line bg-pane-raised p-2"
          >
            <span lang="en" className="min-w-0 flex-1 text-sm break-words text-ink">
              {effectLine(effect)}
            </span>
            <Button
              variant="danger"
              disabled={effects.length <= 1 || isBusy}
              aria-label={`${effect.type}: kaldır`}
              onClick={() => setEffects(effects.filter((other) => other.type !== effect.type))}
            >
              Kaldır
            </Button>
          </li>
        ))}
      </ol>

      <fieldset className="flex flex-col gap-2 rounded-lg border border-line p-3">
        <legend className="px-1 text-sm font-medium text-ink">Efekt ekle</legend>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-type`} className="text-xs text-ink-muted">
              Tür
            </label>
            <select
              id={`${ids}-type`}
              value={newType}
              onChange={(event) => {
                setNewType(event.target.value as EffectType | '')
                setNewCost('')
              }}
              className={fieldClasses}
            >
              <option value="">Seç</option>
              {missing.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-cost`} className="text-xs text-ink-muted">
              Maliyet
            </label>
            <select
              id={`${ids}-cost`}
              value={newCost}
              disabled={newType === ''}
              onChange={(event) =>
                setNewCost(
                  event.target.value === '' ? '' : (Number(event.target.value) as CustomCost),
                )
              }
              className={fieldClasses}
            >
              <option value="">Seç</option>
              {costs.map((cost) => (
                <option key={cost} value={cost}>{`${cost}-Cost`}</option>
              ))}
            </select>
          </div>
        </div>
        {newText === null ? null : (
          <p lang="en" className="text-xs break-words text-ink-muted">
            {newText}
          </p>
        )}
        <div>
          <Button disabled={newText === null || isBusy} onClick={add}>
            Ekle
          </Button>
        </div>
      </fieldset>

      {message === null ? null : (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-pane-raised p-3 text-sm text-danger-ink"
        >
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={!isChanged || isBusy} onClick={() => void save()}>
          {isBusy ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
        <Button disabled={isBusy} onClick={onClose}>
          Vazgeç
        </Button>
      </div>
    </Dialog>
  )
}
