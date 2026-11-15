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
import { MECHANIC_PACKS } from '@/features/cards/mechanicPacks'
import { normalize } from '@/features/cards/text'
import { useSetIndex } from '@/features/sets/setsContext'
import { useIsTableBusy } from '@/features/table/tableContext'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

import { type CardFields, deckOfKind, isNameTaken } from './api'
import { BehaviorSection } from './BehaviorSection'
import { useDefinitionActions } from './definitionsContext'
import { DefinitionForm, FormField } from './DefinitionForm'
import { FIELD_CLASSES } from './fieldClasses'
import {
  BEHAVIOR_FLAGS,
  type BehaviorFlags,
  isHeldText,
  POOL_FLAGS,
  startingFlags,
  WHERE_FLAGS,
  withFixedFlags,
} from './flags'
import { PictureField } from './PictureField'
import { choiceOf, KEEP_DRAFT, type PictureDraft } from './pictureDraft'

/** The form's values as typed: empty strings for "not chosen". */
type FormValues = {
  kind: CardKind
  name: string
  setCode: string
  cost: string
  rarity: '' | Rarity
  mechanicPack: string
  text: string
  /** The behavior flags of the "Davranış" section. */
  flags: BehaviorFlags
  /** The DM changed "Elde etkili": it no longer follows the text (design D8 of unify-cards-and-true-words). */
  heldTouched: boolean
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
    flags: Object.fromEntries(BEHAVIOR_FLAGS.map((flag) => [flag, card[flag]])) as BehaviorFlags,
    heldTouched: true,
  }
}

function emptyValues(deck: Deck): FormValues {
  const kind = deck === 'cursed' ? 'cursed' : 'normal'
  return {
    kind,
    name: '',
    setCode: '',
    cost: '',
    rarity: '',
    mechanicPack: '',
    text: '',
    flags: startingFlags(kind, ''),
    heldTouched: false,
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
    ...withFixedFlags(values.kind, values.flags),
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
 * or "—" means no cost, and the text shows its bracket text. The name must be unique in the deck. The "Davranış"
 * section sets the behavior flags (spec: "The Davranış section"): a new card starts with its kind's starting flags, its
 * "Elde etkili" following the text until the DM touches it, and a kind change resets them.
 */
export function CardFormDialog({ deck, cardId, onClose }: CardFormDialogProps) {
  const ids = useId()
  const auth = useAuth()
  const { sets } = useSetIndex()
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
  // A new card's "Elde etkili" follows a text that starts with "Held:" until the DM touches the box.
  const setText = (text: string) =>
    setValues((current) => ({
      ...current,
      text,
      flags: current.heldTouched
        ? current.flags
        : { ...current.flags, hasHeldEffect: isHeldText(text) },
    }))
  // A kind change starts the flags over from the new kind (spec: "A card's kind changes only in a draft").
  const setKind = (kind: 'normal' | 'blessed') =>
    setValues((current) => ({
      ...current,
      kind,
      flags: startingFlags(kind, current.text),
      heldTouched: false,
    }))
  const [picture, setPicture] = useState<PictureDraft>(KEEP_DRAFT)
  const isOnline = useOnlineStatus()
  const isTableBusy = useIsTableBusy()

  const fields = fieldsOf(values)
  const status = base?.status ?? null
  const isGone = cardId !== null && cardsById.status === 'ready' && live === null
  const canChooseKind = values.kind !== 'cursed' && (base === null || base.status === 'draft')
  // A change of a pool flag moves cards in or out of the pool, so it waits for an open pack (design D7).
  const changesPoolFlags = base !== null && POOL_FLAGS.some((flag) => base[flag] !== fields[flag])

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
    sets.map((set) => ({ value: set.code, label: set.name })),
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
      saveWaitsForPack={changesPoolFlags}
      onSave={(publish) =>
        base === null
          ? actions.addCard({ fields, publish, by: uid, existing, picture: choiceOf(picture) })
          : actions.saveCard({
              card: base,
              fields,
              publish,
              by: uid,
              existing,
              picture: choiceOf(picture),
            })
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
        setPicture(KEEP_DRAFT)
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
              onChange={(event) => setKind(event.target.value === 'blessed' ? 'blessed' : 'normal')}
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
              onChange={(event) => setText(event.target.value)}
              className={FIELD_CLASSES}
            />
          </FormField>
          <p className="mt-1 text-xs text-ink-muted">
            [Köşeli parantez] içindeki metin oyunculara gösterilmez, aramada bulunur.
          </p>
        </div>
        <div className="sm:col-span-2">
          <BehaviorSection
            kind={values.kind}
            flags={fields}
            stored={base}
            isTableBusy={isTableBusy}
            onChange={(flag, value) =>
              setValues((current) => ({
                ...current,
                flags: { ...current.flags, [flag]: value },
                heldTouched: current.heldTouched || flag === 'hasHeldEffect',
              }))
            }
            onOnlyFromDm={() =>
              setValues((current) => ({
                ...current,
                flags: {
                  ...current.flags,
                  ...Object.fromEntries(WHERE_FLAGS.map((flag) => [flag, false])),
                },
              }))
            }
          />
        </div>
        <div className="sm:col-span-2">
          <PictureField
            stored={base?.picture ?? null}
            draft={picture}
            onChange={setPicture}
            name={fields.name || title}
            disabled={!isOnline}
          />
        </div>
      </div>
    </DefinitionForm>
  )
}
