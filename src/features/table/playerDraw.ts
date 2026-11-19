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

/** The sentence on the price that the modes that are on add to their line (design D6 of adjustable-draw-price). */
const PRICE_LINE = 'Bir çekiş 1 LP; çeken kişi fiyatı değiştirebilir.'

/** One Turkish line on what each mode lets a player do when drawing, the price included while the mode is on. */
export const PLAYER_DRAW_LINES: Record<PlayerDrawMode, string> = {
  off: 'Oyuncular kartı tüm havuzdan rastgele çeker.',
  filtered: `Oyuncular kart çekerken set, cost, mechanic pack ve rarity seçebilir; kart yine rastgele gelir. ${PRICE_LINE}`,
  pick: `Oyuncular ayrıca kelimeyle arayıp destede ne olduğuna bakabilir; istedikleri kartı seçip çekebilir. ${PRICE_LINE}`,
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

/**
 * The LP a draw costs unless the drawer changes it: a player's draw under "Kapalı", and the starting price while a mode
 * is on (spec: card-draws, "The draw price while the mode is on").
 */
export const DEFAULT_DRAW_PRICE = 1

/** The most LP one draw can cost: the ledger's largest single change. Keep in step with `firestore.rules`. */
export const DRAW_COST_MAX = 1_000_000

/** Whether a draw dialog of `kind` shows the price control: a random draw while the mode is on, the DM's as well. */
export function isPricedDraw(kind: 'random' | 'cursed', mode: PlayerDrawMode): boolean {
  return kind === 'random' && mode !== 'off'
}

/**
 * The LP the next draw costs (design D1 of adjustable-draw-price): nothing for a Cursed draw; under "Kapalı" 1 LP for a
 * player and nothing for the DM; while the mode is on, the price chosen in the dialog, from 0 up. Mirrors the price
 * checks of `drawnByPlayer` and the DM's branch in `firestore.rules`.
 */
export function drawPrice({
  kind,
  byDm,
  mode,
  chosen,
}: {
  kind: 'random' | 'cursed'
  byDm: boolean
  mode: PlayerDrawMode
  chosen: number
}): number {
  if (kind === 'cursed') return 0
  if (!isPricedDraw(kind, mode)) return byDm ? 0 : DEFAULT_DRAW_PRICE
  return chosen
}

/** Whether a price is one a draw can take: a whole number of LP from 0 to `DRAW_COST_MAX`. */
export function isValidDrawPrice(price: number): boolean {
  return Number.isInteger(price) && price >= 0 && price <= DRAW_COST_MAX
}

/** A price typed in the price control, or `null` when it is not a whole number of LP from 0 to `DRAW_COST_MAX`. */
export function parseDrawPrice(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const price = Number(trimmed)
  return isValidDrawPrice(price) ? price : null
}
