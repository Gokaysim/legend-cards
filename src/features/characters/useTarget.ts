/** The longest name a use keeps (`usedOn`). Keep in step with `validUsedOn` in `firestore.rules`. */
export const USED_ON_MAX = 100

/**
 * On which character a card or a True Word is used (spec: card-holdings, "Choosing the character of a use"): none,
 * one of the table's characters, or a name typed for one that has no record (blank means none).
 */
export type UseTarget =
  { kind: 'none' } | { kind: 'character'; characterId: string } | { kind: 'typed'; name: string }

export const NO_USE_TARGET: UseTarget = { kind: 'none' }

/**
 * The name a use keeps, and, when it was chosen from the list, the character and its owner (the owner of an effect
 * the use adds).
 */
export type ResolvedUseTarget = {
  name: string
  characterId: string | null
  ownerUid: string | null
}
