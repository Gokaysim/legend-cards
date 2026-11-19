import { describe, expect, it } from 'vitest'

import { type DrawFilters, NO_FILTERS } from '@/features/cards/pool'

import {
  DRAW_COST_MAX,
  drawPrice,
  filtersUnderMode,
  isPricedDraw,
  isValidDrawPrice,
  parseDrawPrice,
  PLAYER_DRAW_LABELS,
  PLAYER_DRAW_MODES,
  playerDrawTools,
  playerFiltersAllowed,
} from './playerDraw'

const facets: DrawFilters = { ...NO_FILTERS, setCode: 'Kesqer', rarity: 'rare' }
const keyword: DrawFilters = { ...NO_FILTERS, keyword: 'Aboleth' }
const both: DrawFilters = { ...facets, keyword: 'Aboleth' }

describe('playerDrawTools', () => {
  it('gives nothing under Kapalı, the facets under Filtreli çekiş, and everything under Kart seçme', () => {
    expect(playerDrawTools('off')).toEqual({ filters: false, keyword: false, peek: false })
    expect(playerDrawTools('filtered')).toEqual({ filters: true, keyword: false, peek: false })
    expect(playerDrawTools('pick')).toEqual({ filters: true, keyword: true, peek: true })
  })
})

describe('playerFiltersAllowed', () => {
  it('always allows a draw without filters', () => {
    for (const mode of PLAYER_DRAW_MODES) expect(playerFiltersAllowed(mode, null)).toBe(true)
  })

  it('denies every filter under Kapalı', () => {
    expect(playerFiltersAllowed('off', facets)).toBe(false)
    expect(playerFiltersAllowed('off', keyword)).toBe(false)
  })

  it('allows the facets but no keyword under Filtreli çekiş', () => {
    expect(playerFiltersAllowed('filtered', facets)).toBe(true)
    expect(playerFiltersAllowed('filtered', keyword)).toBe(false)
    expect(playerFiltersAllowed('filtered', both)).toBe(false)
  })

  it('allows a keyword under Kart seçme', () => {
    expect(playerFiltersAllowed('pick', facets)).toBe(true)
    expect(playerFiltersAllowed('pick', keyword)).toBe(true)
    expect(playerFiltersAllowed('pick', both)).toBe(true)
  })
})

describe('filtersUnderMode', () => {
  it('keeps what the mode allows', () => {
    expect(filtersUnderMode('pick', both)).toEqual(both)
    expect(filtersUnderMode('filtered', both)).toEqual(facets)
    expect(filtersUnderMode('off', both)).toEqual(NO_FILTERS)
  })
})

describe('labels', () => {
  it('names the three modes in Turkish', () => {
    expect(PLAYER_DRAW_LABELS).toEqual({
      off: 'Kapalı',
      filtered: 'Filtreli çekiş',
      pick: 'Kart seçme',
    })
  })
})

describe('drawPrice', () => {
  it('keeps 1 LP for a player and a free draw for the DM under Kapalı, whatever was chosen', () => {
    expect(drawPrice({ kind: 'random', byDm: false, mode: 'off', chosen: 3 })).toBe(1)
    expect(drawPrice({ kind: 'random', byDm: true, mode: 'off', chosen: 3 })).toBe(0)
  })

  it('takes the chosen price while the mode is on, for a player and the DM', () => {
    for (const mode of ['filtered', 'pick'] as const) {
      for (const byDm of [false, true]) {
        expect(drawPrice({ kind: 'random', byDm, mode, chosen: 0 })).toBe(0)
        expect(drawPrice({ kind: 'random', byDm, mode, chosen: 1 })).toBe(1)
        expect(drawPrice({ kind: 'random', byDm, mode, chosen: 3 })).toBe(3)
      }
    }
  })

  it('keeps a Cursed draw free in every mode', () => {
    for (const mode of PLAYER_DRAW_MODES) {
      for (const byDm of [false, true]) {
        expect(drawPrice({ kind: 'cursed', byDm, mode, chosen: 3 })).toBe(0)
      }
    }
  })
})

describe('isPricedDraw', () => {
  it('shows the price control only for a random draw while the mode is on', () => {
    expect(isPricedDraw('random', 'off')).toBe(false)
    expect(isPricedDraw('random', 'filtered')).toBe(true)
    expect(isPricedDraw('random', 'pick')).toBe(true)
    expect(isPricedDraw('cursed', 'pick')).toBe(false)
  })
})

describe('isValidDrawPrice', () => {
  it('takes whole numbers from 0 to the limit', () => {
    expect(isValidDrawPrice(0)).toBe(true)
    expect(isValidDrawPrice(DRAW_COST_MAX)).toBe(true)
    expect(isValidDrawPrice(DRAW_COST_MAX + 1)).toBe(false)
    expect(isValidDrawPrice(-1)).toBe(false)
    expect(isValidDrawPrice(1.5)).toBe(false)
    expect(isValidDrawPrice(Number.NaN)).toBe(false)
  })
})

describe('parseDrawPrice', () => {
  it('reads a whole number of LP, around spaces', () => {
    expect(parseDrawPrice('3')).toBe(3)
    expect(parseDrawPrice(' 0 ')).toBe(0)
    expect(parseDrawPrice('1000000')).toBe(1_000_000)
  })

  it('reads nothing else', () => {
    for (const text of ['', ' ', '1.5', '-1', '1e3', 'abc', '1000001', '2 LP']) {
      expect(parseDrawPrice(text)).toBeNull()
    }
  })
})
