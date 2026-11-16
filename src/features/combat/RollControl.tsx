import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'

import { useCombatActions } from './combatContext'
import { ROLL_NOT_RECORDED_MESSAGE } from './errors'
import { formatModifier, parseModifier } from './npcs'
import type { Row } from './rows'

/**
 * A character's modifier box and "At" (spec: initiative-tracker, "Rolling initiative"): filled with the modifier the
 * character rolled with last, or +0. "At" is disabled while the box holds no valid modifier, and without a
 * connection.
 */
export function RollControl({ row, isOnline }: { row: Row; isOnline: boolean }) {
  const ids = useId()
  const actions = useCombatActions()
  const remembered = row.character?.initiativeModifier ?? 0
  const [text, setText] = useState(formatModifier(remembered))
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modifier = parseModifier(text)

  const roll = async () => {
    if (modifier === null) return
    setIsBusy(true)
    setError(null)
    try {
      await actions.rollInitiative(row.combatant, row.name, modifier)
    } catch {
      setError(ROLL_NOT_RECORDED_MESSAGE)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <label htmlFor={`${ids}-mod`} className="sr-only">
          {row.name} modifier
        </label>
        <input
          id={`${ids}-mod`}
          inputMode="numeric"
          value={text}
          aria-invalid={modifier === null}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => {
            if (modifier !== null) setText(formatModifier(modifier))
          }}
          className="w-16 rounded-lg border border-control-line bg-control px-2 py-1.5 text-center text-sm text-ink aria-invalid:border-danger-line"
        />
        <Button
          variant="primary"
          disabled={modifier === null || !isOnline || isBusy}
          aria-label={`${row.name} için at`}
          onClick={() => {
            void roll()
          }}
        >
          At
        </Button>
      </div>
      {modifier === null ? (
        <span className="text-xs text-danger-ink">−10 ile +30 arası bir tam sayı</span>
      ) : null}
      {error ? (
        <span role="alert" className="text-xs text-danger-ink">
          {error}
        </span>
      ) : null}
    </div>
  )
}
