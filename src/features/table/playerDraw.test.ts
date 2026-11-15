import { describe, expect, it } from 'vitest'

import { type DrawFilters, NO_FILTERS } from '@/features/cards/pool'

import {
  filtersUnderMode,
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
