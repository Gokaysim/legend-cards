import {
  CHARACTERS_TAB,
  DM_NOTE_TAB,
  HAND_CHARACTER_PARAM,
  HAND_TAB_PARAM,
  TRUE_WORDS_TAB,
} from '@/app/screens'

/** The hand's open tab: one of its fixed tabs, or one of its characters (design D3 of redesign-hand-dashboard). */
export type OpenTab =
  | { kind: 'cards' }
  | { kind: 'true-words' }
  | { kind: 'dm-note' }
  | { kind: 'character'; id: string }

const CARDS: OpenTab = { kind: 'cards' }

/** The first active character's tab, or the Kartlar tab when there is none. */
function firstCharacter(characterIds: readonly string[]): OpenTab {
  const [first] = characterIds
  return first === undefined ? CARDS : { kind: 'character', id: first }
}

/**
 * The tab a hand's URL opens (spec: characters, "The selected character's view"; player-notes, "DM notu tab").
 * `characterIds` are the active characters of the hand's user in the order added, or `null` while they load.
 * - `?character=<id>` opens that character; one that is not active, or unknown, opens the first active character, or
 *   the Kartlar tab when there is none. While the characters load, it stays on the named one.
 * - `?tab=characters`, the former Karakterler tab, opens the first active character the same way.
 * - `?tab=dm-note` opens the DM notu tab for the DM alone; `?tab=true-words` the True Words tab; anything else Kartlar.
 */
export function openTabOf(
  params: URLSearchParams,
  isDm: boolean,
  characterIds: readonly string[] | null,
): OpenTab {
  const character = params.get(HAND_CHARACTER_PARAM)
  if (character !== null) {
    if (characterIds === null || characterIds.includes(character)) {
      return { kind: 'character', id: character }
    }
    return firstCharacter(characterIds)
  }
  const tab = params.get(HAND_TAB_PARAM)
  if (tab === TRUE_WORDS_TAB) return { kind: 'true-words' }
  if (tab === CHARACTERS_TAB) return firstCharacter(characterIds ?? [])
  if (tab === DM_NOTE_TAB && isDm) return { kind: 'dm-note' }
  return CARDS
}

/** The URL parameters that open `tab`, keeping any others. */
export function paramsOf(params: URLSearchParams, tab: OpenTab): URLSearchParams {
  const next = new URLSearchParams(params)
  next.delete(HAND_TAB_PARAM)
  next.delete(HAND_CHARACTER_PARAM)
  if (tab.kind === 'true-words') next.set(HAND_TAB_PARAM, TRUE_WORDS_TAB)
  if (tab.kind === 'dm-note') next.set(HAND_TAB_PARAM, DM_NOTE_TAB)
  if (tab.kind === 'character') next.set(HAND_CHARACTER_PARAM, tab.id)
  return next
}

/** A stable key for a tab, for ids and comparisons: `cards`, `true-words`, `dm-note`, or `character-<id>`. */
export function tabKey(tab: OpenTab): string {
  return tab.kind === 'character' ? `character-${tab.id}` : tab.kind
}
