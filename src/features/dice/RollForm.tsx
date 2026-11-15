import { type FormEvent, useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { DmOnly } from '@/features/users/DmOnly'
import { cn } from '@/lib/cn'

import { useDiceActions } from './diceContext'
import {
  canAdd,
  type DiceCounts,
  DIE_TYPES,
  type DieType,
  emptyCounts,
  FORMULA_ORDER,
  formulaText,
  isSingleD20,
  MAX_DICE,
  MODIFIER_MAX,
  MODIFIER_MIN,
  NOTE_MAX,
  physicalCount,
  type RollMode,
} from './formula'
import type { DiceStyle } from './schema'
import { previewUrl } from './stage/previews'

const FIELD =
  'rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

export type RollFormProps = {
  /** The user's dice style, for the quick dice's pictures. */
  style: DiceStyle
}

/** The fixed number as typed: a whole number from −99 to +99, or 0. */
function modifierOf(text: string): number {
  const value = Number.parseInt(text, 10)
  if (!Number.isFinite(value)) return 0
  return Math.min(MODIFIER_MAX, Math.max(MODIFIER_MIN, value))
}

/**
 * The roll form (spec: dice-rolls, "Building a roll" to "Advantage and disadvantage", "The DM's hidden roll"): the
 * quick dice add to the formula, its dice take one away, then the fixed number, the note, Avantaj or Dezavantaj for
 * a single d20, the DM's "Gizli", and "At".
 */
export function RollForm({ style }: RollFormProps) {
  const actions = useDiceActions()
  const [counts, setCounts] = useState<DiceCounts>(emptyCounts)
  const [modifierText, setModifierText] = useState('')
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<RollMode>('normal')
  const [isHidden, setIsHidden] = useState(false)
  const [isRolling, setIsRolling] = useState(false)
  const [failed, setFailed] = useState(false)
  const ids = { modifier: useId(), note: useId(), limit: useId() }

  const modifier = modifierOf(modifierText)
  const hasDice = physicalCount(counts) > 0
  const isFull = DIE_TYPES.some((type) => !canAdd(counts, type))
  const offersAdvantage = isSingleD20(counts)
  const formula = formulaText(counts, modifier)

  const add = (type: DieType) => setCounts((current) => ({ ...current, [type]: current[type] + 1 }))
  const remove = (type: DieType) =>
    setCounts((current) => ({ ...current, [type]: Math.max(0, current[type] - 1) }))
  const toggleMode = (next: RollMode) => setMode((current) => (current === next ? 'normal' : next))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!hasDice || isRolling) return
    setIsRolling(true)
    setFailed(false)
    actions
      .roll({
        counts,
        mode: offersAdvantage ? mode : 'normal',
        modifier,
        note,
        hidden: isHidden,
      })
      .then(() => setNote(''))
      .catch(() => setFailed(true))
      .finally(() => setIsRolling(false))
  }

  return (
    <form
      aria-label="Zar at"
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-pane p-3"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {DIE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            aria-label={`${type} ekle`}
            aria-describedby={isFull && !canAdd(counts, type) ? ids.limit : undefined}
            disabled={!canAdd(counts, type)}
            onClick={() => add(type)}
            className="flex h-10 items-center gap-0.5 rounded-lg border border-line bg-pane-raised pr-2.5 pl-1 text-sm text-ink transition-colors hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <img src={previewUrl(style, type)} alt="" className="size-7.5" />
            {type}
          </button>
        ))}
        <span className="ml-auto flex gap-1">
          {(['advantage', 'disadvantage'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={offersAdvantage && mode === choice}
              disabled={!offersAdvantage}
              onClick={() => toggleMode(choice)}
              className={cn(
                'h-9 rounded-lg border border-line px-3 text-sm text-ink-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                offersAdvantage && mode === choice && 'border-gold bg-pane-raised text-gold',
              )}
            >
              {choice === 'advantage' ? 'Avantaj' : 'Dezavantaj'}
            </button>
          ))}
        </span>
      </div>

      {isFull ? (
        <p id={ids.limit} className="text-xs text-ink-muted">
          En fazla {MAX_DICE} zar
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <output aria-label="Formül" className="font-bold text-gold">
          {formula || 'Zar seç'}
        </output>
        {FORMULA_ORDER.filter((type) => counts[type] > 0).map((type) => (
          <button
            key={type}
            type="button"
            aria-label={`${type} çıkar`}
            onClick={() => remove(type)}
            className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted hover:border-gold hover:text-ink"
          >
            {counts[type]}
            {type} ×
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor={ids.modifier} className="flex flex-col gap-1 text-xs text-ink-muted">
          Sabit sayı
          <input
            id={ids.modifier}
            type="number"
            inputMode="numeric"
            min={MODIFIER_MIN}
            max={MODIFIER_MAX}
            step={1}
            value={modifierText}
            placeholder="0"
            onChange={(event) => setModifierText(event.target.value)}
            onBlur={() => setModifierText(modifier === 0 ? '' : String(modifier))}
            className={cn(FIELD, 'w-20')}
          />
        </label>
        <label
          htmlFor={ids.note}
          className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-ink-muted"
        >
          Not
          <input
            id={ids.note}
            type="text"
            maxLength={NOTE_MAX}
            value={note}
            placeholder="Not ekle…"
            onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX))}
            className={FIELD}
          />
        </label>
        <DmOnly>
          <label className="flex h-10 items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isHidden}
              onChange={(event) => setIsHidden(event.target.checked)}
              className="size-4.5 accent-gold"
            />
            Gizli
          </label>
        </DmOnly>
        <Button
          type="submit"
          variant="primary"
          disabled={!hasDice || isRolling}
          className="h-10 px-6"
        >
          At
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-danger-ink">
          Atış yapılamadı. Yeniden dene.
        </p>
      ) : null}
    </form>
  )
}
