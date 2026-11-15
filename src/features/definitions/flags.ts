// The behavior flags of a card or True Word definition (spec: definition-editing, "Behavior flags"; design D2 of
// unify-cards-and-true-words). Every definition stores all eight. What each one does lives where it applies: the pool
// helpers in `src/features/cards/pool.ts`, the holdings, the effects and the lists. This module only names them, gives
// their Turkish labels, says which a kind shows or fixes, and gives a new definition's starting values.
//
// No `@/` imports on purpose: the script tests (Node type config) import it to check that `scripts/lib/cardCatalog.ts`
// agrees with it.

/** Every kind of definition in `cards/{cardId}`. Keep in step with `firestore.rules` and `scripts/lib/cardCatalog.ts`. */
export const DEFINITION_KINDS = ['normal', 'blessed', 'cursed', 'trueWord'] as const
export type DefinitionKind = (typeof DEFINITION_KINDS)[number]

/** The eight flags, in the order the form shows them. Keep in step with `firestore.rules`. */
export const BEHAVIOR_FLAGS = [
  'isInLibrary',
  'isInDraws',
  'isInSetPacks',
  'isInMechanicPacks',
  'isRepeatable',
  'hasHeldEffect',
  'hasUseEffect',
  'isKeptOnUse',
] as const
export type BehaviorFlag = (typeof BEHAVIOR_FLAGS)[number]
export type BehaviorFlags = Record<BehaviorFlag, boolean>

/** The first group of the form, "Görünürlük ve kanallar": where a definition shows and where it comes from. */
export const WHERE_FLAGS = [
  'isInLibrary',
  'isInDraws',
  'isInSetPacks',
  'isInMechanicPacks',
] as const

/** The second group, "Sahiplik ve etki". */
export const OWNERSHIP_FLAGS = [
  'isRepeatable',
  'hasHeldEffect',
  'hasUseEffect',
  'isKeptOnUse',
] as const

/** The flags that put a card in a draw or a pack. A card with all of them off is "DM'e özel". */
export const CHANNEL_FLAGS = ['isInDraws', 'isInSetPacks', 'isInMechanicPacks'] as const

/**
 * The flags whose change moves cards in or out of the pool, so it waits for an open pack, as status steps do (spec:
 * definition-editing, "Status steps wait for an open pack"). Keep in step with `changedByDm` in `firestore.rules`.
 */
export const POOL_FLAGS = [
  'isInDraws',
  'isInSetPacks',
  'isInMechanicPacks',
  'isRepeatable',
] as const

/**
 * The flags a kind fixes (spec: definition-editing, "Flags fixed by the kind"): the form does not show them, and
 * the schema and the rules refuse another value. Keep in step with `fixedFlags` in `firestore.rules`.
 */
export const FIXED_FLAGS: Readonly<Record<DefinitionKind, Readonly<Partial<BehaviorFlags>>>> = {
  normal: {},
  blessed: {},
  cursed: { isInSetPacks: false, isInMechanicPacks: false },
  trueWord: {
    isInSetPacks: false,
    isInMechanicPacks: false,
    isRepeatable: true,
    isKeptOnUse: true,
  },
}

/** The flags the form shows for a kind: those it does not fix, in the form's order. */
export function shownFlags(kind: DefinitionKind): BehaviorFlag[] {
  return BEHAVIOR_FLAGS.filter((flag) => !(flag in FIXED_FLAGS[kind]))
}

/** The labels of the form, the log and the lists. The draw flag's label depends on the kind. */
const LABELS: Readonly<Record<Exclude<BehaviorFlag, 'isInDraws'>, string>> = {
  isInLibrary: 'Listede görünür',
  isInSetPacks: 'Set paketlerinde çıkar',
  isInMechanicPacks: 'Mechanic paketlerinde çıkar',
  isRepeatable: 'Birden fazla elde olabilir',
  hasHeldEffect: 'Elde etkili',
  hasUseEffect: 'Kullanınca efekt bırakır',
  isKeptOnUse: 'Kullanınca elde kalır',
}

const DRAW_LABELS: Readonly<Record<DefinitionKind, string>> = {
  normal: 'Kart çekmede çıkar',
  blessed: 'Kart çekmede çıkar',
  cursed: "Cursed Deck'te çıkar",
  trueWord: "Draft'ta çıkar",
}

/** A flag's Turkish label for a definition of `kind`. */
export function flagLabel(flag: BehaviorFlag, kind: DefinitionKind): string {
  return flag === 'isInDraws' ? DRAW_LABELS[kind] : LABELS[flag]
}

/**
 * True for a text whose effect acts while it is held: it starts with "Held:", in any case, after any leading
 * `[bracket]` metadata. Keep in step with `scripts/lib/cardCatalog.ts`.
 */
export function isHeldText(text: string): boolean {
  return /^\s*(?:\[[^\]]*\]\s*)*held\s*:/i.test(text)
}

/**
 * The flags a new definition starts with: its kind's current behavior (spec: definition-editing, "Starting values of
 * the flags"). Every "where" flag and "Kullanınca efekt bırakır" on; one copy only for a normal card; kept on use only
 * for a True Word; held when the text starts with "Held:".
 */
export function startingFlags(kind: DefinitionKind, text: string): BehaviorFlags {
  return {
    isInLibrary: true,
    isInDraws: true,
    isInSetPacks: true,
    isInMechanicPacks: true,
    isRepeatable: kind !== 'normal',
    hasHeldEffect: isHeldText(text),
    hasUseEffect: true,
    isKeptOnUse: false,
    ...FIXED_FLAGS[kind],
  }
}

/** The flags with every value the kind fixes put back, for a form or a write that may have changed one. */
export function withFixedFlags(kind: DefinitionKind, flags: BehaviorFlags): BehaviorFlags {
  return { ...flags, ...FIXED_FLAGS[kind] }
}

/** True when every "where" flag is off: only the DM gives the definition ("Sadece DM verebilir"). */
export function isOnlyFromDm(flags: Pick<BehaviorFlags, (typeof WHERE_FLAGS)[number]>): boolean {
  return WHERE_FLAGS.every((flag) => !flags[flag])
}
