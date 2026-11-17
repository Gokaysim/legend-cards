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
  formulaInputText,
  isSingleD20,
  MAX_DICE,
  maxCount,
  NOTE_MAX,
  parseFormula,
  type ParsedFormula,
  physicalCount,
  type RollMode,
} from './formula'
import type { DiceStyle } from './schema'
import { previewUrl } from './stage/previews'

const FIELD =
  'rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

/** The longest formula the field takes: every die type with a count, and eight two-digit numbers, with room. */
const FORMULA_TEXT_MAX = 120

type ValidFormula = Extract<ParsedFormula, { ok: true }>

const EMPTY_FORMULA: ValidFormula = {
  ok: true,
  counts: emptyCounts(),
  modifier: 0,
  modifierSum: null,
}

export type RollFormProps = {
  /** The user's dice style, for the quick dice's pictures. */
  style: DiceStyle
}

type CountFieldProps = {
  type: DieType
  count: number
  disabled: boolean
  /** A count typed on the chip, capped by the caller to what fits. Returns the count the formula now holds. */
  onCount: (count: number) => number
  onRemove: () => void
}

/**
 * A dice chip's count (design D2 of dice-formula-and-sixty-dice): typing changes the formula at once, an empty field
 * leaves it as it was, and leaving the field empty or at 0 takes the die type away.
 */
function CountField({ type, count, disabled, onCount, onRemove }: CountFieldProps) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={`${type} sayısı`}
      disabled={disabled}
      value={draft ?? String(count)}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 3)
        const wanted = Number(digits)
        if (digits === '' || wanted === 0) {
          setDraft(digits)
          return
        }
        setDraft(String(onCount(wanted)))
      }}
      onBlur={() => {
        if (draft === '' || draft === '0') onRemove()
        setDraft(null)
      }}
      className="w-9 rounded-md border border-control-line bg-control px-1 text-center text-xs text-ink disabled:opacity-40"
    />
  )
}

/**
 * The roll form (spec: dice-rolls, "Building a roll" to "Advantage and disadvantage", "The DM's hidden roll"). The
 * formula text is the one source (design D1 of dice-formula-and-sixty-dice): the user types it, and the quick dice and
 * the chips rewrite it in its canonical form. Then the note, Avantaj or Dezavantaj for a single d20, the DM's "Gizli",
 * and "At".
 */
export function RollForm({ style }: RollFormProps) {
  const actions = useDiceActions()
  const [text, setText] = useState('')
  // The last formula that parsed, which the controls show while the text is invalid.
  const [lastValid, setLastValid] = useState<ValidFormula>(EMPTY_FORMULA)
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<RollMode>('normal')
  const [isHidden, setIsHidden] = useState(false)
  const [isRolling, setIsRolling] = useState(false)
  const [failed, setFailed] = useState(false)
  const ids = { formula: useId(), formulaError: useId(), note: useId(), limit: useId() }

  const parsed = parseFormula(text)
  const isValid = parsed.ok
  const shown = parsed.ok ? parsed : lastValid
  const counts = shown.counts
  const hasDice = isValid && physicalCount(counts) > 0
  const isFull = isValid && DIE_TYPES.some((type) => !canAdd(counts, type))
  const offersAdvantage = isValid && isSingleD20(counts)

  const update = (next: string) => {
    setText(next)
    const result = parseFormula(next)
    if (result.ok) setLastValid(result)
  }
  const write = (next: DiceCounts) =>
    update(formulaInputText(next, shown.modifier, shown.modifierSum))
  const add = (type: DieType) => write({ ...counts, [type]: counts[type] + 1 })
  const setCount = (type: DieType, wanted: number) => {
    const count = Math.min(wanted, maxCount(counts, type))
    write({ ...counts, [type]: count })
    return count
  }
  const remove = (type: DieType) => write({ ...counts, [type]: 0 })
  const toggleMode = (next: RollMode) => setMode((current) => (current === next ? 'normal' : next))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!parsed.ok || !hasDice || isRolling) return
    setIsRolling(true)
    setFailed(false)
    actions
      .roll({
        counts: parsed.counts,
        mode: offersAdvantage ? mode : 'normal',
        modifier: parsed.modifier,
        modifierSum: parsed.modifierSum,
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
            disabled={!isValid || !canAdd(counts, type)}
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.formula} className="text-xs text-ink-muted">
          Formül
        </label>
        <input
          id={ids.formula}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={FORMULA_TEXT_MAX}
          value={text}
          placeholder="örneğin 1d20+5"
          aria-invalid={!isValid}
          aria-describedby={isValid ? undefined : ids.formulaError}
          onChange={(event) => update(event.target.value)}
          onBlur={() => {
            if (parsed.ok)
              setText(formulaInputText(parsed.counts, parsed.modifier, parsed.modifierSum))
          }}
          className={cn(FIELD, 'font-bold text-gold', !isValid && 'border-danger-line')}
        />
        {physicalCount(counts) > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {FORMULA_ORDER.filter((type) => counts[type] > 0).map((type) => (
              <span
                key={type}
                className="flex items-center gap-1 rounded-full border border-line py-0.5 pr-1 pl-1 text-xs text-ink-muted"
              >
                <CountField
                  type={type}
                  count={counts[type]}
                  disabled={!isValid}
                  onCount={(wanted) => setCount(type, wanted)}
                  onRemove={() => remove(type)}
                />
                {type}
                <button
                  type="button"
                  aria-label={`${type} çıkar`}
                  disabled={!isValid}
                  onClick={() => remove(type)}
                  className="rounded-full px-1 hover:text-ink disabled:opacity-40"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2">
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
      {isValid ? null : (
        <p id={ids.formulaError} className="text-sm text-danger-ink">
          {parsed.reason === 'tooMany'
            ? `En fazla ${MAX_DICE} zar`
            : 'Formül zarlardan (40d6, d20, d%) ve 0–99 arası sayılardan, + ve − işaretleriyle oluşabilir: örneğin 1d20+4+4-5. Sayıların toplamı −99 ile +99 arasında olmalı.'}
        </p>
      )}
      {failed ? (
        <p role="alert" className="text-sm text-danger-ink">
          Atış yapılamadı. Yeniden dene.
        </p>
      ) : null}
    </form>
  )
}
