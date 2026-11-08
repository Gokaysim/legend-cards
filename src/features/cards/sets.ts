// The official set names. Imported by the script tests too (Node type config, no `@/` alias), hence the
// explicit `.ts` extension below and no other imports.
import { normalize } from './text.ts'

export type OfficialSet = {
  /** The set code as the card data writes it. */
  code: string
  /** The official name the interface shows. */
  name: string
  /** Other spellings that also mean this set. */
  aliases: readonly string[]
}

/**
 * The official sets, in shop order (docs/domain.md, Sets). A fixed list: never derive set names from data.
 * Keep in step with `scripts/lib/cardCatalog.ts` (the drift test checks it).
 */
export const OFFICIAL_SETS: readonly OfficialSet[] = [
  { code: 'The End is Nigh', name: 'The End is Nigh', aliases: ['endisnigh'] },
  { code: 'Pentagon', name: 'Conclave at Pentagon', aliases: [] },
  { code: 'Rhodelen', name: 'Rituals in Rhodelen', aliases: [] },
  { code: 'Ashavir', name: 'The Overlord of Ashavir', aliases: [] },
  { code: 'Kesqer', name: 'Kesqerian Nights', aliases: [] },
  { code: 'Godtower', name: 'The Godtower', aliases: [] },
  { code: 'Davarron', name: 'Descent Under Davarron', aliases: [] },
  { code: 'Havenholm', name: 'Throne of Havenholm', aliases: [] },
  { code: 'Ulagal', name: 'Ballad of Ulagal', aliases: [] },
  { code: 'Nordhallr', name: 'Ragnarök: Nordhallr', aliases: ['ragnarok', 'ragnarök'] },
  { code: 'Gurgitea', name: 'The Lost City of Gurgitea', aliases: [] },
  { code: 'Pandemonium', name: 'Pandemonium', aliases: [] },
]

const setsByKey = new Map(
  OFFICIAL_SETS.flatMap((set, index) =>
    [set.code, ...set.aliases].map((spelling) => [normalize(spelling), { set, index }] as const),
  ),
)

/** The official set for a code or alias, ignoring case, accents and spaces. */
export function officialSet(code: string): OfficialSet | undefined {
  return setsByKey.get(normalize(code))?.set
}

/** The name to show for a set code: the official name, or the code as written when it is not in the list. */
export function setDisplayName(code: string): string {
  return officialSet(code)?.name ?? code
}

/** The shop position of a set code. Codes that are not in the list come after every known set. */
export function setOrder(code: string): number {
  return setsByKey.get(normalize(code))?.index ?? OFFICIAL_SETS.length
}
