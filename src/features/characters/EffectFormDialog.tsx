import { useId, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormField } from '@/features/definitions/DefinitionForm'
import { FIELD_CLASSES } from '@/features/definitions/fieldClasses'

import { EFFECT_LIMITS } from './effects'

export type EffectFormDialogProps = {
  /** The character's name, for the title. */
  characterName: string
  /** Whether the effect is the DM's: the title then says so. */
  isDm: boolean
  /** Saves the effect. The write is queued offline, so the form closes at once. */
  onSave: (fields: { name: string; text: string }) => void
  onClose: () => void
}

/**
 * The form of an effect written by hand (spec: character-effects, "Adding an effect from the details"): a name of 1 to
 * 60 characters and a text of 1 to 500. The owner's is "Özel", the DM's "DM".
 */
export function EffectFormDialog({ characterName, isDm, onSave, onClose }: EffectFormDialogProps) {
  const ids = useId()
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [problems, setProblems] = useState<string[]>([])

  const save = () => {
    const found = [
      ...(name.trim() === '' ? ['Efektin bir adı olmalı.'] : []),
      ...(text.trim() === '' ? ['Efektin bir metni olmalı.'] : []),
    ]
    setProblems(found)
    if (found.length > 0) return
    onSave({ name, text })
    onClose()
  }

  return (
    <Dialog
      title={`${characterName} için ${isDm ? 'DM efekti' : 'efekt'}`}
      onClose={onClose}
      className="max-w-lg"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <FormField label="Ad" htmlFor={`${ids}-name`}>
          <input
            id={`${ids}-name`}
            data-autofocus
            value={name}
            maxLength={EFFECT_LIMITS.byHand.name}
            onChange={(event) => setName(event.target.value)}
            className={FIELD_CLASSES}
          />
        </FormField>
        <FormField label="Metin" htmlFor={`${ids}-text`}>
          <textarea
            id={`${ids}-text`}
            value={text}
            rows={4}
            maxLength={EFFECT_LIMITS.byHand.text}
            onChange={(event) => setText(event.target.value)}
            className={FIELD_CLASSES}
          />
        </FormField>
        {problems.length > 0 ? (
          <ul role="alert" className="flex flex-col gap-1 text-sm text-danger-ink">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>Vazgeç</Button>
          <Button type="submit" variant="primary">
            Kaydet
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
