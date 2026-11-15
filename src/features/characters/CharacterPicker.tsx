import { useId } from 'react'

import { FIELD_CLASSES } from '@/features/definitions/fieldClasses'

import type { CharacterChoice } from './useCharacterChoice'
import { TYPED_CHOICE } from './useCharacterChoice'
import { USED_ON_MAX } from './useTarget'

export type CharacterPickerProps = {
  choice: CharacterChoice
  /** Called when the user changes the choice, for example to clear an old failure. */
  onInput?: () => void
}

/**
 * The use step's "Hangi karakter üzerinde?" (design D5 of add-character-effects): "Karakter seçilmedi", the table's
 * active characters grouped by owner, and "Başka (yaz)…" with its text field. For a chosen character of a definition
 * that leaves an effect when used, "Aktif efekt olarak ekle", checked by default. The card's and the True Word's use
 * steps share it.
 */
export function CharacterPicker({ choice, onInput }: CharacterPickerProps) {
  const ids = useId()
  const { state, change, groups, isCharacterChosen, offersEffect } = choice
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${ids}-used-on`} className="text-sm font-medium text-ink">
        Hangi karakter üzerinde?
      </label>
      <select
        id={`${ids}-used-on`}
        value={state.value}
        onChange={(event) => {
          onInput?.()
          change({ value: event.target.value })
        }}
        className={FIELD_CLASSES}
      >
        <option value="">Karakter seçilmedi</option>
        {groups.map((group) => (
          <optgroup key={group.uid} label={group.name}>
            {group.characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={TYPED_CHOICE}>Başka (yaz)…</option>
      </select>
      {state.value === TYPED_CHOICE ? (
        <>
          <label htmlFor={`${ids}-typed`} className="sr-only">
            Karakterin adı
          </label>
          <input
            id={`${ids}-typed`}
            value={state.typedName}
            maxLength={USED_ON_MAX}
            placeholder="Örneğin Goblin şefi"
            onChange={(event) => change({ typedName: event.target.value })}
            className={FIELD_CLASSES}
          />
        </>
      ) : null}
      {isCharacterChosen && offersEffect ? (
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={state.addEffect}
            onChange={(event) => change({ addEffect: event.target.checked })}
            aria-describedby={`${ids}-effect-note`}
            className="mt-0.5 size-4 accent-gold"
          />
          <span className="flex flex-col">
            Aktif efekt olarak ekle
            <span id={`${ids}-effect-note`} className="text-xs text-ink-muted">
              Metni karakterin aktif efektlerine yazılır; bitince elle kaldırılır.
            </span>
          </span>
        </label>
      ) : null}
    </div>
  )
}
