import type { SortKey } from './sort'

/** The Kartlar tab's columns, as in the legacy app. The İşlem (edit) column shows for the DM only. */
export const LEGEND_COLUMNS: readonly SortKey[] = [
  'name',
  'set',
  'cost',
  'rarity',
  'mechanicPack',
  'text',
  'status',
]

/** The columns of the Cursed and True Words tabs, which have no set, rarity or mechanic pack. */
export const PLAIN_COLUMNS: readonly SortKey[] = ['name', 'cost', 'text', 'status']
