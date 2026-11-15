import { describe, expect, it } from 'vitest'

import { handEntries } from '@/features/hands/handEntries'
import { testCard } from '@/test/cardFixtures'
import { testHolding } from '@/test/holdingFixtures'

import { heldEffects } from './heldEffects'

const card = (
  id: string,
  name: string,
  active: boolean,
  kind = 'normal',
  text = `${name} text.`,
) => ({
  holding: { id, active },
  card: { name, text, kind },
})
const word = (id: string, name: string, active: boolean) => ({
  record: { id, active },
  word: { name, text: `${name} [hidden] word.` },
})

describe('heldEffects', () => {
  it('lists the active cards, then the active words, with their visible text', () => {
    expect(
      heldEffects(
        [
          card('h1', 'Devil’s Pride', true, 'cursed', 'Held: no Natural 20 [note].'),
          card('h2', 'Night Owl', false),
          card('h3', 'Second Wind', true, 'blessed'),
        ],
        [word('r1', 'Abyss', true), word('r2', 'Chaos', false)],
      ),
    ).toEqual([
      {
        id: 'h1',
        kind: 'held',
        name: 'Devil’s Pride',
        text: 'Held: no Natural 20 .',
        cursed: true,
      },
      {
        id: 'h3',
        kind: 'held',
        name: 'Second Wind',
        text: 'Second Wind text.',
        cursed: false,
      },
      { id: 'r1', kind: 'word', name: 'Abyss', text: 'Abyss word.', cursed: false },
    ])
  })

  it('gives nothing for a hand without active cards or words', () => {
    expect(heldEffects([card('h2', 'Night Owl', false)], [word('r2', 'Chaos', false)])).toEqual([])
  })

  it('leaves out an active holding whose card no longer acts while held', () => {
    const owl = testCard('Night Owl', { hasHeldEffect: false })
    const entries = handEntries(
      [testHolding(owl, 'ayla', 1000, { active: true })],
      new Map([[owl.id, owl]]),
      'ayla',
    )
    expect(heldEffects(entries, [])).toEqual([])
  })
})
