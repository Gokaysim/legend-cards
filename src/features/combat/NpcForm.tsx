import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'

import {
  formatModifier,
  isValidNpcGroup,
  type NpcGroup,
  parseModifier,
  TOO_MANY_MESSAGE,
} from './npcs'
import { COMBAT_LIMITS } from './schema'

const fieldClasses =
  'w-full rounded-lg border border-control-line bg-control px-3 py-2 text-sm text-ink placeholder:text-ink-muted'

/**
 * "NPC ekle" (spec: initiative-tracker, "Typed NPCs"): a name of 1 to 40 characters, a count of 1 to 12 and a modifier.
 * A group that would take the combat over 50 combatants is not added, and the form says so.
 */
export function NpcForm({
  remaining,
  onAdd,
}: {
  /** How many more combatants fit. */
  remaining: number
  onAdd: (group: NpcGroup) => void
}) {
  const ids = useId()
  const [name, setName] = useState('')
  const [count, setCount] = useState('1')
  const [modifier, setModifier] = useState('+0')
  const [error, setError] = useState<string | null>(null)

  const parsedModifier = parseModifier(modifier)
  const group: NpcGroup = { name: name.trim(), count: Number(count), modifier: parsedModifier ?? 0 }
  const isValid = parsedModifier !== null && isValidNpcGroup(group)

  return (
    <div role="group" aria-label="NPC ekle" className="flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_5rem] gap-2">
        <label className="flex flex-col gap-1 text-xs text-ink-muted" htmlFor={`${ids}-name`}>
          Ad
          <input
            id={`${ids}-name`}
            value={name}
            maxLength={COMBAT_LIMITS.name}
            placeholder="Goblin"
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            className={fieldClasses}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted" htmlFor={`${ids}-count`}>
          Adet
          <input
            id={`${ids}-count`}
            type="number"
            inputMode="numeric"
            min={1}
            max={COMBAT_LIMITS.npcCount}
            value={count}
            onChange={(event) => {
              setCount(event.target.value)
              setError(null)
            }}
            className={fieldClasses}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted" htmlFor={`${ids}-modifier`}>
          Modifier
          <input
            id={`${ids}-modifier`}
            inputMode="numeric"
            value={modifier}
            onChange={(event) => {
              setModifier(event.target.value)
              setError(null)
            }}
            onBlur={() => {
              if (parsedModifier !== null) setModifier(formatModifier(parsedModifier))
            }}
            className={fieldClasses}
          />
        </label>
      </div>
      <div className="flex items-center justify-between gap-2">
        {error ? (
          <p role="alert" className="text-xs text-danger-ink">
            {error}
          </p>
        ) : (
          <span className="text-xs text-ink-muted">
            Birden fazla NPC numaralanır: Goblin 1, Goblin 2…
          </span>
        )}
        <Button
          disabled={!isValid}
          onClick={() => {
            if (group.count > remaining) {
              setError(TOO_MANY_MESSAGE)
              return
            }
            onAdd(group)
            setName('')
            setCount('1')
          }}
        >
          + NPC ekle
        </Button>
      </div>
    </div>
  )
}
