import { useId, useMemo, useState } from 'react'

import { useAuth } from '@/features/auth/authContext'
import { type Deck, useCardsById } from '@/features/cards/cardsContext'
import {
  type Card,
  CARD_LIMITS,
  type CardKind,
  type MissingCardField,
  missingCardFields,
  type Rarity,
} from '@/features/cards/schema'
import { MECHANIC_PACKS, OFFICIAL_SETS } from '@/features/cards/sets'
import { normalize } from '@/features/cards/text'

import { type CardFields, deckOfKind, isNameTaken } from './api'
import { useDefinitionActions } from './definitionsContext'
import { DefinitionForm, FormField } from './DefinitionForm'
import { FIELD_CLASSES } from './fieldClasses'

/** The form's values as typed: empty strings for "not chosen". */
type FormValues = {
  kind: CardKind
  name: string
  setCode: string
  cost: string
  rarity: '' | Rarity
  mechanicPack: string
  text: string
}

const MISSING_LABELS: Readonly<Record<MissingCardField, string>> = {
  setCode: 'Set',
  rarity: 'Rarity',
  mechanicPack: 'Mechanic Pack',
  text: 'Metin',
}

const KIND_LABELS: Readonly<Record<'normal' | 'blessed', string>> = {
  normal: 'Normal (Common / Rare)',
  blessed: 'Blessed',
}

/** "—" or an empty cost: the card has no cost (spec: "Card form fields"). */
const isNoCost = (cost: string) => cost === '' || /^[—–-]$/.test(cost)

function valuesOf(card: Card): FormValues {
  return {
    kind: card.kind,
    name: card.name,
    setCode: card.setCode ?? '',
    cost: card.cost ?? '',
    rarity: card.rarity ?? '',
    mechanicPack: card.mechanicPack ?? '',
    text: card.text,
  }
}

function emptyValues(deck: Deck): FormValues {
  return {
    kind: deck === 'cursed' ? 'cursed' : 'normal',
    name: '',
    setCode: '',
    cost: '',
    rarity: '',
    mechanicPack: '',
    text: '',
  }
}

/** The values as a definition: trimmed, empty choices as `null`, and only the fields the kind has. */
function fieldsOf(values: FormValues): CardFields {
  const cost = values.cost.trim()
  return {
    kind: values.kind,
    name: values.name.trim(),
    setCode: values.kind === 'normal' && values.setCode !== '' ? values.setCode : null,
    cost: isNoCost(cost) ? null : cost,
    rarity: values.kind === 'normal' && values.rarity !== '' ? values.rarity : null,
    mechanicPack:
      values.kind !== 'cursed' && values.mechanicPack !== '' ? values.mechanicPack : null,
    text: values.text.trim(),
  }
}

/** The choices of a select, with a value the card has that the fixed list lacks kept as written. */
function withCurrent(options: readonly { value: string; label: string }[], current: string) {
  return current === '' || options.some((option) => option.value === current)
    ? options
    : [...options, { value: current, label: current }]
}

export type CardFormDialogProps = {
  /** The deck a new card joins: normal or Blessed for the library, Cursed for the Cursed Deck. */
  deck: Deck
  /** The card to edit, or `null` to add one. */
  cardId: string | null
  onClose: () => void
}

/**
 * The DM's card form (spec: definition-editing, "Adding a card", "Card form fields", "Editing a definition"). It offers
 * the fields of the card's kind; the kind itself only for a draft, between normal and Blessed. The set, rarity and
 * mechanic pack come from the fixed lists, each with an empty choice for a draft. The cost is free text, where empty
 * or "—" means no cost, and the text shows its bracket text. The name must be unique in the deck.
 */
export function CardFormDialog({ deck, cardId, onClose }: CardFormDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const uid = auth.status === 'signedIn' ? auth.user.uid : ''
  const actions = useDefinitionActions()
  const cardsById = useCardsById()
  const existing = useMemo(
    () => (cardsById.status === 'ready' ? [...cardsById.data.values()] : []),
    [cardsById],
  )
  const live =
    cardId === null || cardsById.status !== 'ready' ? null : (cardsById.data.get(cardId) ?? null)
  // The card as the form loaded it: a save from it is refused when the card changed since (design D9).
  const [base, setBase] = useState<Card | null>(live)
  const [values, setValues] = useState<FormValues>(() =>
    base === null ? emptyValues(deck) : valuesOf(base),
  )
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const fields = fieldsOf(values)
  const status = base?.status ?? null
  const isGone = cardId !== null && cardsById.status === 'ready' && live === null
  const canChooseKind = values.kind !== 'cursed' && (base === null || base.status === 'draft')

  const sameDeck = existing.filter((card) => deckOfKind(card.kind) === deckOfKind(values.kind))
  const nameKey = normalize(fields.name)
  const problems = [
    ...(fields.name === '' ? ['Kart adı boş olamaz.'] : []),
    ...(fields.name !== '' && nameKey === ''
      ? ['Kart adında en az bir harf ya da rakam olmalı.']
      : []),
    ...(fields.name.length > CARD_LIMITS.name
      ? [`Kart adı en fazla ${CARD_LIMITS.name} karakter olabilir.`]
      : []),
    ...(nameKey !== '' && isNameTaken(nameKey, sameDeck, base?.id ?? null)
      ? ['Bu adla bir kart zaten var.']
      : []),
    ...((fields.cost?.length ?? 0) > CARD_LIMITS.cost
      ? [`Cost en fazla ${CARD_LIMITS.cost} karakter olabilir.`]
      : []),
    ...(fields.text.length > CARD_LIMITS.text
      ? [`Kart metni en fazla ${CARD_LIMITS.text} karakter olabilir.`]
      : []),
  ]
  const missing = missingCardFields(fields).map((field) => MISSING_LABELS[field])

  const setOptions = withCurrent(
    OFFICIAL_SETS.map((officialSet) => ({ value: officialSet.code, label: officialSet.name })),
    values.setCode,
  )
  const packOptions = withCurrent(
    MECHANIC_PACKS.map((pack) => ({ value: pack, label: pack })),
    values.mechanicPack,
  )

  const title =
    base === null ? (deck === 'cursed' ? 'Yeni Cursed kart' : 'Yeni kart') : `Düzenle: ${base.name}`

  return (
    <DefinitionForm
      title={title}
      what="kart"
      status={status}
      missing={missing}
      problems={problems}
      isGone={isGone}
      onSave={(publish) =>
        base === null
          ? actions.addCard({ fields, publish, by: uid, existing })
          : actions.saveCard({ card: base, fields, publish, by: uid, existing })
      }
      onSetStatus={(next) =>
        base === null
          ? Promise.resolve()
          : actions.setCardStatus({ card: base, status: next, by: uid })
      }
      onDelete={() =>
        base === null ? Promise.resolve() : actions.deleteCard({ card: base, by: uid })
      }
      onChanged={() => {
        if (live === null) return
        setBase(live)
        setValues(valuesOf(live))
      }}
      onClose={onClose}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="Kart adı" htmlFor={`${ids}-name`}>
            <input
              id={`${ids}-name`}
              data-autofocus
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              className={FIELD_CLASSES}
            />
          </FormField>
        </div>
        {canChooseKind ? (
          <FormField label="Tür" htmlFor={`${ids}-kind`}>
            <select
              id={`${ids}-kind`}
              value={values.kind}
              onChange={(event) =>
                set('kind', event.target.value === 'blessed' ? 'blessed' : 'normal')
              }
              className={FIELD_CLASSES}
            >
              {(['normal', 'blessed'] as const).map((kind) => (
                <option key={kind} value={kind}>
                  {KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
        <FormField label="Cost" htmlFor={`${ids}-cost`}>
          <input
            id={`${ids}-cost`}
            value={values.cost}
            placeholder="— (yok)"
            onChange={(event) => set('cost', event.target.value)}
            className={FIELD_CLASSES}
          />
        </FormField>
        {values.kind === 'normal' ? (
          <>
            <FormField label="Set" htmlFor={`${ids}-set`}>
              <select
                id={`${ids}-set`}
                value={values.setCode}
                onChange={(event) => set('setCode', event.target.value)}
                className={FIELD_CLASSES}
              >
                <option value="">Seçilmedi</option>
                {setOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Rarity" htmlFor={`${ids}-rarity`}>
              <select
                id={`${ids}-rarity`}
                value={values.rarity}
                onChange={(event) =>
                  set(
                    'rarity',
                    event.target.value === 'common' || event.target.value === 'rare'
                      ? event.target.value
                      : '',
                  )
                }
                className={FIELD_CLASSES}
              >
                <option value="">Seçilmedi</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
              </select>
            </FormField>
          </>
        ) : null}
        {values.kind !== 'cursed' ? (
          <FormField label="Mechanic Pack" htmlFor={`${ids}-pack`}>
            <select
              id={`${ids}-pack`}
              value={values.mechanicPack}
              onChange={(event) => set('mechanicPack', event.target.value)}
              className={FIELD_CLASSES}
            >
              <option value="">Seçilmedi</option>
              {packOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
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
          <p className="mt-1 text-xs text-ink-muted">
            [Köşeli parantez] içindeki metin oyunculara gösterilmez, aramada bulunur.
          </p>
        </div>
      </div>
    </DefinitionForm>
  )
}
