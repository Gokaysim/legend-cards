import type { DrawFilters } from '@/features/cards/pool'

/**
 * The table's "Oyuncu kart çekişi" (spec: table-settings): how much of the DM's draw tools the players get in their
 * random draws. Keep in step with `firestore.rules`.
 * - `off`: none, as before the setting existed
 * - `filtered`: the set, cost, mechanic pack and rarity filters; the card is still random among the matches
 * - `pick`: also the keyword and "Destede ne var?", so a player can narrow the deck to one card
 */
export const PLAYER_DRAW_MODES = ['off', 'filtered', 'pick'] as const
export type PlayerDrawMode = (typeof PLAYER_DRAW_MODES)[number]

/** The mode of a table that never set one. */
export const DEFAULT_PLAYER_DRAW_MODE: PlayerDrawMode = 'off'

/** The Turkish name of each mode, as the Ayarlar screen, the banner, the draw chip and the log show it. */
export const PLAYER_DRAW_LABELS: Record<PlayerDrawMode, string> = {
  off: 'Kapalı',
  filtered: 'Filtreli çekiş',
  pick: 'Kart seçme',
}

/** One Turkish line on what each mode lets a player do when drawing. */
export const PLAYER_DRAW_LINES: Record<PlayerDrawMode, string> = {
  off: 'Oyuncular kartı tüm havuzdan rastgele çeker.',
  filtered:
    'Oyuncular kart çekerken set, cost, mechanic pack ve rarity seçebilir; kart yine rastgele gelir.',
  pick: 'Oyuncular ayrıca kelimeyle arayıp destede ne olduğuna bakabilir; istedikleri kartı seçip çekebilir.',
}

/** The draw tools a mode gives a player's random draw. */
export type PlayerDrawTools = {
  /** The set, cost, mechanic pack and rarity filters. */
  filters: boolean
  /** The keyword. */
  keyword: boolean
  /** "Destede ne var?". */
  peek: boolean
}

export function playerDrawTools(mode: PlayerDrawMode): PlayerDrawTools {
  return {
    filters: mode !== 'off',
    keyword: mode === 'pick',
    peek: mode === 'pick',
  }
}

/**
 * Whether a player's draw may record these filters under the mode: no filters always, the four facets from
 * "Filtreli çekiş" on, and a keyword only under "Kart seçme". Mirrors `playerFiltersAllowed` in `firestore.rules`.
 */
export function playerFiltersAllowed(mode: PlayerDrawMode, filters: DrawFilters | null): boolean {
  if (filters === null) return true
  const tools = playerDrawTools(mode)
  if (!tools.filters) return false
  return tools.keyword || filters.keyword === null
}

/**
 * The filters that stay on when the mode changes to `mode`: all of them while the mode allows them, the four facets
 * without the keyword under "Filtreli çekiş", and none under "Kapalı".
 */
export function filtersUnderMode(mode: PlayerDrawMode, filters: DrawFilters): DrawFilters {
  const tools = playerDrawTools(mode)
  if (!tools.filters) {
    return { setCode: null, cost: null, mechanicPack: null, rarity: null, keyword: null }
  }
  return tools.keyword ? filters : { ...filters, keyword: null }
}
