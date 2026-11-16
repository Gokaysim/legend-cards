import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import type { Character } from '@/features/characters/schema'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import type { Joining } from './combatContext'
import { COMBAT_OFFLINE_NOTE, combatFailureMessage } from './errors'
import { NpcForm } from './NpcForm'
import { type NpcGroup, npcGroupText, TOO_MANY_MESSAGE } from './npcs'

/** One owner's characters in the list. */
export type JoinGroup = { uid: string; name: string; characters: readonly Character[] }

export type JoinCombatDialogProps = {
  title: string
  submitLabel: string
  /** The characters that can join, by owner. */
  groups: readonly JoinGroup[]
  /** The characters checked at first. */
  initiallyChecked: ReadonlySet<string>
  /** How many more combatants fit in the combat. */
  remaining: number
  /** A line under the title, for example that the added combatants get no roll. */
  note?: string
  onSubmit: (joining: Joining) => Promise<void>
  onClose: () => void
}

/**
 * The DM's list of who joins (spec: initiative-tracker, "Setting up a combat" and "Adding during the fight"): the
 * table's characters by owner, with checkboxes, and typed NPC groups. The submit is disabled without anyone, and
 * without a connection. On success the dialog closes.
 */
export function JoinCombatDialog({
  title,
  submitLabel,
  groups,
  initiallyChecked,
  remaining,
  note,
  onSubmit,
  onClose,
}: JoinCombatDialogProps) {
  const isOnline = useOnlineStatus()
  const [checked, setChecked] = useState<ReadonlySet<string>>(initiallyChecked)
  const [npcGroups, setNpcGroups] = useState<readonly NpcGroup[]>([])
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const npcCount = npcGroups.reduce((sum, group) => sum + group.count, 0)
  const total = checked.size + npcCount
  const isTooMany = total > remaining

  const toggle = (id: string) => {
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = async () => {
    setIsBusy(true)
    setError(null)
    try {
      await onSubmit({
        // In the order of the list, owner by owner.
        characters: groups.flatMap((group) =>
          group.characters
            .filter((c) => checked.has(c.id))
            .map((c) => ({ characterId: c.id, uid: c.uid })),
        ),
        npcGroups,
      })
      onClose()
    } catch (failure) {
      setError(combatFailureMessage(failure))
      setIsBusy(false)
    }
  }

  return (
    <Dialog title={title} onClose={onClose} className="max-w-lg">
      <div className="flex flex-col gap-5">
        {note ? <p className="text-sm text-ink-muted">{note}</p> : null}
        <section aria-labelledby="join-characters" className="flex flex-col gap-3">
          <h3 id="join-characters" className="text-sm font-semibold text-ink">
            Karakterler
          </h3>
          {groups.length === 0 ? (
            <p className="text-sm text-ink-muted">Eklenebilecek karakter yok.</p>
          ) : null}
          {groups.map((group) => (
            <fieldset key={group.uid} className="flex flex-col gap-1.5">
              <legend className="mb-1 text-xs tracking-wide text-ink-muted uppercase">
                {group.name}
              </legend>
              {group.characters.map((character) => (
                <label key={character.id} className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={checked.has(character.id)}
                    onChange={() => toggle(character.id)}
                    className="size-4.5 accent-gold"
                  />
                  {character.name}
                </label>
              ))}
            </fieldset>
          ))}
        </section>

        <section aria-labelledby="join-npcs" className="flex flex-col gap-3">
          <h3 id="join-npcs" className="text-sm font-semibold text-ink">
            NPC&apos;ler
          </h3>
          {npcGroups.length > 0 ? (
            <ul aria-label="Eklenecek NPC'ler" className="flex flex-col gap-1">
              {npcGroups.map((group, index) => (
                <li
                  key={`${group.name}-${String(index)}`}
                  className="flex items-center justify-between rounded-lg bg-pane px-3 py-1.5 text-sm text-ink"
                >
                  {npcGroupText(group)}
                  <Button
                    variant="ghost"
                    aria-label={`${group.name} çıkar`}
                    onClick={() => setNpcGroups((current) => current.filter((_, i) => i !== index))}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <NpcForm
            remaining={remaining - total}
            onAdd={(group) => setNpcGroups((current) => [...current, group])}
          />
        </section>

        {error ? (
          <p role="alert" className="text-sm text-danger-ink">
            {error}
          </p>
        ) : null}
        {!isOnline ? <p className="text-sm text-ink-muted">{COMBAT_OFFLINE_NOTE}</p> : null}
        {isTooMany ? <p className="text-sm text-danger-ink">{TOO_MANY_MESSAGE}</p> : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-muted">{total} katılımcı</span>
          <Button
            variant="primary"
            disabled={total === 0 || isTooMany || !isOnline || isBusy}
            onClick={() => {
              void submit()
            }}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
