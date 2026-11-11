/**
 * The status of a card or True Word definition (spec: definition-editing, "Definition statuses"). A draft is being
 * prepared by the DM and only the DM reads it; an active definition is in play; a retired one is out of play but
 * stays with the hands that hold it and the players who know it. Keep in step with `firestore.rules` and
 * `scripts/lib/cardRows.ts`.
 *
 * Not to be confused with a True Word Draft (the three words a player chooses from) or with an active card or word
 * in a hand (its effect is on): those are other things that share the words.
 */
export const DEFINITION_STATUSES = ['draft', 'active', 'retired'] as const
export type DefinitionStatus = (typeof DEFINITION_STATUSES)[number]

/** The statuses a player's device reads. Drafts never leave the server for a player (design D3). */
export const PLAYER_VISIBLE_STATUSES: readonly DefinitionStatus[] = ['active', 'retired']

/** The interface's names: "Aktif" already means an active card or word in a hand. */
export const STATUS_LABELS: Readonly<Record<DefinitionStatus, string>> = {
  draft: 'Taslak',
  active: 'Yayında',
  retired: 'Kaldırıldı',
}
