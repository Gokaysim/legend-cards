import { useId, useMemo, useState } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { normalize } from '@/features/cards/text'
import {
  type MissingWordField,
  missingWordFields,
  TRUE_WORD_LIMITS,
  type TrueWord,
} from '@/features/true-words/schema'
import { useTrueWords } from '@/features/true-words/trueWordsContext'

import { isNameTaken, type WordFields } from './api'
import { useDefinitionActions } from './definitionsContext'
import { DefinitionForm, FormField } from './DefinitionForm'
import { FIELD_CLASSES } from './fieldClasses'

type FormValues = { name: string; cost: string; text: string }

const MISSING_LABELS: Readonly<Record<MissingWordField, string>> = { cost: 'Cost', text: 'Metin' }

/** An empty cost, or "—": a word's cost is missing until written (spec: "Complete definitions"). */
const isBlank = (value: string) => value === '' || /^[—–-]$/.test(value)

const valuesOf = (word: TrueWord): FormValues => ({
  name: word.name,
  cost: word.cost ?? '',
  text: word.text,
})

function fieldsOf(values: FormValues): WordFields {
  const cost = values.cost.trim()
  return { name: values.name.trim(), cost: isBlank(cost) ? null : cost, text: values.text.trim() }
}

export type WordFormDialogProps = {
  /** The word to edit, or `null` to add one. */
  wordId: string | null
  onClose: () => void
}

/**
 * The DM's True Word form (spec: definition-editing, "Adding a True Word", "Editing a definition"): the name, the cost
 * as written (the LP paid at the table each time the word is used) and the text. A word needs a cost and a text to be
 * published, and a name no other word has.
 */
export function WordFormDialog({ wordId, onClose }: WordFormDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : ''
  const actions = useDefinitionActions()
  const words = useTrueWords()
  const existing = useMemo(() => (words.status === 'ready' ? words.data : []), [words])
  const live = wordId === null ? null : (existing.find((word) => word.id === wordId) ?? null)
  // The word as the form loaded it: a save from it is refused when the word changed since (design D9).
  const [base, setBase] = useState<TrueWord | null>(live)
  const [values, setValues] = useState<FormValues>(() =>
    base === null ? { name: '', cost: '', text: '' } : valuesOf(base),
  )
  const set = (key: keyof FormValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }))

  const fields = fieldsOf(values)
  const nameKey = normalize(fields.name)
  const problems = [
    ...(fields.name === '' ? ['True Word adı boş olamaz.'] : []),
    ...(fields.name !== '' && nameKey === ''
      ? ['True Word adında en az bir harf ya da rakam olmalı.']
      : []),
    ...(fields.name.length > TRUE_WORD_LIMITS.name
      ? [`True Word adı en fazla ${TRUE_WORD_LIMITS.name} karakter olabilir.`]
      : []),
    ...(nameKey !== '' && isNameTaken(nameKey, existing, base?.id ?? null)
      ? ['Bu adla bir True Word zaten var.']
      : []),
    ...((fields.cost?.length ?? 0) > TRUE_WORD_LIMITS.cost
      ? [`Cost en fazla ${TRUE_WORD_LIMITS.cost} karakter olabilir.`]
      : []),
    ...(fields.text.length > TRUE_WORD_LIMITS.text
      ? [`True Word metni en fazla ${TRUE_WORD_LIMITS.text} karakter olabilir.`]
      : []),
  ]
  const missing = missingWordFields(fields).map((field) => MISSING_LABELS[field])

  return (
    <DefinitionForm
      title={base === null ? 'Yeni True Word' : `Düzenle: ${base.name}`}
      what="True Word"
      status={base?.status ?? null}
      missing={missing}
      problems={problems}
      isGone={wordId !== null && words.status === 'ready' && live === null}
      onSave={(publish) =>
        base === null
          ? actions.addWord({ fields, publish, by: uid, existing })
          : actions.saveWord({ word: base, fields, publish, by: uid, existing })
      }
      onSetStatus={(next) =>
        base === null
          ? Promise.resolve()
          : actions.setWordStatus({ word: base, status: next, by: uid })
      }
      onDelete={() =>
        base === null ? Promise.resolve() : actions.deleteWord({ word: base, by: uid })
      }
      onChanged={() => {
        if (live === null) return
        setBase(live)
        setValues(valuesOf(live))
      }}
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <FormField label="True Word adı" htmlFor={`${ids}-name`}>
          <input
            id={`${ids}-name`}
            data-autofocus
            value={values.name}
            onChange={(event) => set('name', event.target.value)}
            className={FIELD_CLASSES}
          />
        </FormField>
        <FormField label="Cost" htmlFor={`${ids}-cost`}>
          <input
            id={`${ids}-cost`}
            value={values.cost}
            placeholder="0–5 ya da X"
            onChange={(event) => set('cost', event.target.value)}
            className={FIELD_CLASSES}
          />
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Metin" htmlFor={`${ids}-text`}>
            <textarea
              id={`${ids}-text`}
              lang="en"
              rows={5}
              value={values.text}
              onChange={(event) => set('text', event.target.value)}
              className={FIELD_CLASSES}
            />
          </FormField>
        </div>
      </div>
    </DefinitionForm>
  )
}
