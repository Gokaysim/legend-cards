import { describe, expect, it } from 'vitest'

import { testCard } from '@/test/cardFixtures'
import { testHolding } from '@/test/holdingFixtures'

import { holdingBadges } from './holdingBadges'

const owl = testCard('Night Owl')
const entry = (active: boolean, isExtraCopy: boolean) => ({
  holding: testHolding(owl, 'ayla', 1000, { active }),
  isExtraCopy,
})

describe('holdingBadges', () => {
  it('marks an active extra copy with both badges, "Aktif" first', () => {
    expect(holdingBadges(entry(true, true))).toEqual([
      { label: 'Aktif', tone: 'active' },
      { label: 'Ek kopya', tone: 'plain' },
    ])
  })

  it('gives one badge for one mark', () => {
    expect(holdingBadges(entry(true, false))).toEqual([{ label: 'Aktif', tone: 'active' }])
    expect(holdingBadges(entry(false, true))).toEqual([{ label: 'Ek kopya', tone: 'plain' }])
  })

  it('gives none to an inactive copy that holds the card', () => {
    expect(holdingBadges(entry(false, false))).toEqual([])
  })
})
