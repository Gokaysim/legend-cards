// The mechanic packs. Imported by the script tests too (Node type config, no `@/` alias), so this module has no
// imports.

/**
 * The eight mechanic packs (docs/domain.md, Mechanic Packs), in Turkish alphabetical order, as the DM's card form
 * offers them. Keep in step with `scripts/lib/cardCatalog.ts` (the drift test checks it).
 */
export const MECHANIC_PACKS: readonly string[] = [
  'Arcanus Divine',
  'Blood & Battle',
  "Dungeoneer's Kit",
  "Gambler's Gambit",
  'Horn of Plenty',
  'Legends of Old',
  'Permamancy',
  'Risk & Reward',
]
