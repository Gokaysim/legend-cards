// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { parseCardFile } from './cardRows.ts'

const dataFile = (name: string) =>
  readFileSync(new URL(`../../data/${name}`, import.meta.url), 'utf8')

const LEGEND_HEADER = 'Name,Set,Cost,Rarity,Drawn?,Text,Mechanic Pack,Shuffle'
const legend = (...rows: string[]) => [LEGEND_HEADER, ...rows].join('\n')
const CURSED_HEADER = 'Name,Set,Cost,Text'
const cursed = (...rows: string[]) => [CURSED_HEADER, ...rows].join('\n')

describe('parseCardFile: columns', () => {
  it('reports the missing columns of a wrong file and returns no cards', () => {
    const result = parseCardFile('Name,Cost,Text\nAbyss,5,Once per turn.', 'legend')
    expect(result.errors).toEqual([
      { kind: 'missing-columns', columns: ['set', 'rarity', 'mechanic pack'] },
    ])
    expect(result.cards).toEqual([])
  })

  it('matches column names regardless of case, underscores and extra spaces', () => {
    const result = parseCardFile(
      'NAME,set,COST,Rarity,text,Mechanic_Pack\nA,Kesqer,1,Common,Hit.,Blood & Battle',
      'legend',
    )
    expect(result.errors).toEqual([])
    expect(result.cards).toHaveLength(1)
  })

  it('ignores extra columns such as Drawn? and Shuffle', () => {
    const result = parseCardFile(
      legend('Aboleth\'s Eyes,Kesqer,1,Common,Yes,"Gain Immune.",Arcanus Divine,0.81'),
      'legend',
    )
    expect(result.cards[0]?.card).toEqual({
      kind: 'normal',
      name: "Aboleth's Eyes",
      nameKey: 'abolethseyes',
      setCode: 'Kesqer',
      cost: '1',
      rarity: 'common',
      mechanicPack: 'Arcanus Divine',
      text: 'Gain Immune.',
    })
  })

  it('reads a file with a byte order mark and Windows line ends', () => {
    const result = parseCardFile(
      `\uFEFF${CURSED_HEADER}\r\nVisions of Death,Cursed,1,Held: draw.\r\n`,
      'cursed',
    )
    expect(result.errors).toEqual([])
    expect(result.cards.map(({ card }) => card.name)).toEqual(['Visions of Death'])
  })

  it('reports a file it cannot read', () => {
    const result = parseCardFile(`${CURSED_HEADER}\nBroken,Cursed,1,"never closed`, 'cursed')
    expect(result.errors).toEqual([{ kind: 'unreadable', detail: expect.any(String) as string }])
  })
})

describe('parseCardFile: values', () => {
  it('trims every value and keeps line breaks inside quoted text', () => {
    const result = parseCardFile(
      legend(
        '  Padded  , Kesqer ,  X ,  Rare ,No," First line.\nSecond line. ",  Risk & Reward ,0',
      ),
      'legend',
    )
    expect(result.cards[0]?.card).toMatchObject({
      name: 'Padded',
      setCode: 'Kesqer',
      cost: 'X',
      rarity: 'rare',
      mechanicPack: 'Risk & Reward',
      text: 'First line.\nSecond line.',
    })
  })

  it('keeps a cost as written, and reads an empty cost or a dash as no cost', () => {
    const result = parseCardFile(
      legend(
        "Dice,Kesqer,d6,Common,No,Roll.,Gambler's Gambit,0",
        'Empty,Kesqer,,Rare,No,Nothing.,Legends of Old,0',
        'Dash,Kesqer,—,Rare,No,Nothing.,Legends of Old,0',
      ),
      'legend',
    )
    expect(result.cards.map(({ card }) => card.cost)).toEqual(['d6', null, null])
  })

  it('reads an empty mechanic pack as none', () => {
    const result = parseCardFile(legend('Loose,Kesqer,1,Common,No,Text.,,0'), 'legend')
    expect(result.cards[0]?.card.mechanicPack).toBeNull()
  })

  it('numbers rows as a spreadsheet does, counting blank rows and the header', () => {
    const result = parseCardFile(
      legend(
        'Good,Kesqer,1,Common,No,Text.,Permamancy,0',
        '',
        'Bad,Kesqer,1,Epic,No,Text.,Permamancy,0',
      ),
      'legend',
    )
    expect(result.errors).toEqual([{ kind: 'invalid-rarity', row: 4, name: 'Bad', rarity: 'Epic' }])
  })

  it('skips rows whose cells are all empty', () => {
    const result = parseCardFile(
      legend(',,,,,,,', 'A,Kesqer,1,Common,No,T.,Permamancy,0'),
      'legend',
    )
    expect(result.errors).toEqual([])
    expect(result.cards).toHaveLength(1)
  })
})

describe('parseCardFile: Legend rows', () => {
  it('makes a row with the set Blessed a Blessed card with no set and no rarity', () => {
    const result = parseCardFile(
      legend('Dawn of Fortune,Blessed,—,—,—,Gain 1 LP.,Risk & Reward,'),
      'legend',
    )
    expect(result.errors).toEqual([])
    expect(result.cards[0]?.card).toEqual({
      kind: 'blessed',
      name: 'Dawn of Fortune',
      nameKey: 'dawnoffortune',
      setCode: null,
      cost: null,
      rarity: null,
      mechanicPack: 'Risk & Reward',
      text: 'Gain 1 LP.',
    })
  })

  it('accepts an empty rarity on a Blessed card', () => {
    const result = parseCardFile(legend('Halo,blessed,,,,Shine.,Permamancy,'), 'legend')
    expect(result.cards[0]?.card.kind).toBe('blessed')
  })

  it('refuses a Blessed card with an ordinary rarity', () => {
    const result = parseCardFile(legend('Halo,Blessed,—,Rare,—,Shine.,Permamancy,'), 'legend')
    expect(result.errors).toEqual([
      { kind: 'blessed-with-rarity', row: 2, name: 'Halo', rarity: 'Rare' },
    ])
  })

  it.each(['Epic', '', '—'])('refuses the rarity %j on a normal card', (rarity) => {
    const result = parseCardFile(legend(`Odd,Kesqer,1,${rarity},No,T.,Permamancy,0`), 'legend')
    expect(result.errors).toEqual([{ kind: 'invalid-rarity', row: 2, name: 'Odd', rarity }])
    expect(result.cards).toEqual([])
  })

  it('accepts Common and Rare in any case', () => {
    const result = parseCardFile(
      legend('A,Kesqer,1,COMMON,No,T.,Permamancy,0', 'B,Kesqer,1,rare,No,T.,Permamancy,0'),
      'legend',
    )
    expect(result.cards.map(({ card }) => card.rarity)).toEqual(['common', 'rare'])
  })

  it('skips a row without a set, with a warning', () => {
    const result = parseCardFile(
      legend('The Cartographer,,1,,,"Until you leave this Dungeon, gain Advantage.",,'),
      'legend',
    )
    expect(result.errors).toEqual([])
    expect(result.cards).toEqual([])
    expect(result.warnings).toEqual([
      { kind: 'skipped-without-set', row: 2, name: 'The Cartographer' },
    ])
  })

  it('stops on an invalid row, but still checks every other row', () => {
    const result = parseCardFile(
      legend(
        'Good,Kesqer,1,Common,No,T.,Permamancy,0',
        'Bad,Kesqer,1,Epic,No,T.,Permamancy,0',
        ',Kesqer,1,Common,No,T.,Permamancy,0',
      ),
      'legend',
    )
    expect(result.errors).toEqual([
      { kind: 'invalid-rarity', row: 3, name: 'Bad', rarity: 'Epic' },
      { kind: 'empty-name', row: 4 },
    ])
  })
})

describe('parseCardFile: Cursed rows', () => {
  it('makes every row a Cursed card, ignoring the Set column', () => {
    const result = parseCardFile(cursed('Visions of Death,Cursed,1,Held: draw.'), 'cursed')
    expect(result.cards[0]?.card).toEqual({
      kind: 'cursed',
      name: 'Visions of Death',
      nameKey: 'visionsofdeath',
      setCode: null,
      cost: '1',
      rarity: null,
      mechanicPack: null,
      text: 'Held: draw.',
    })
  })

  it('needs no Set column', () => {
    const result = parseCardFile('Name,Cost,Text\nHex,0,Bad luck.', 'cursed')
    expect(result.errors).toEqual([])
    expect(result.cards).toHaveLength(1)
  })
})

describe('parseCardFile: names and limits', () => {
  it('reports two rows whose names match after normalization as a duplicate', () => {
    const result = parseCardFile(
      legend(
        "Aboleth's Eyes,Kesqer,1,Common,No,T.,Arcanus Divine,0",
        'Aboleths Eyes,Kesqer,1,Common,No,T.,Arcanus Divine,0',
      ),
      'legend',
    )
    expect(result.errors).toEqual([{ kind: 'duplicate', rows: [2, 3], name: 'Aboleths Eyes' }])
    expect(result.cards).toHaveLength(1)
  })

  it('refuses a name without letters or digits', () => {
    const result = parseCardFile(cursed('?!,Cursed,1,Text.'), 'cursed')
    expect(result.errors).toEqual([{ kind: 'name-without-letters', row: 2, name: '?!' }])
  })

  it.each([
    ['name', `${'N'.repeat(201)},Cursed,1,T.`],
    ['cost', 'Long Cost,Cursed,12345678901,T.'],
    ['text', `Long Text,Cursed,1,${'t'.repeat(2001)}`],
  ] as const)('refuses a %s over its limit', (field, row) => {
    const result = parseCardFile(cursed(row), 'cursed')
    expect(result.errors).toEqual([expect.objectContaining({ kind: 'too-long', row: 2, field })])
  })

  it('refuses a mechanic pack over its limit', () => {
    const result = parseCardFile(legend(`Big,Kesqer,1,Common,No,T.,${'M'.repeat(101)},0`), 'legend')
    expect(result.errors).toEqual([
      expect.objectContaining({ kind: 'too-long', field: 'mechanicPack', max: 100 }),
    ])
  })
})

describe('parseCardFile: warnings', () => {
  it('warns once per unknown set code, with its card count, and still imports the cards', () => {
    const result = parseCardFile(
      legend(
        'A,Kesqeria,1,Common,No,T.,Permamancy,0',
        'B,Kesqeria,1,Common,No,T.,Permamancy,0',
        'C,The End Is Nigh,1,Common,No,T.,Permamancy,0',
      ),
      'legend',
    )
    expect(result.cards).toHaveLength(3)
    expect(result.warnings).toEqual([{ kind: 'unknown-set', setCode: 'Kesqeria', count: 2 }])
  })

  it('warns about a mechanic pack that is not one of the eight', () => {
    const result = parseCardFile(legend('A,Kesqer,1,Common,No,T.,Blood and Battle,0'), 'legend')
    expect(result.cards).toHaveLength(1)
    expect(result.warnings).toEqual([
      { kind: 'unknown-mechanic-pack', mechanicPack: 'Blood and Battle', count: 1 },
    ])
  })
})

describe('parseCardFile: the repository data', () => {
  it('reads data/legend-cards.csv as 571 normal and 19 Blessed cards, skipping The Cartographer', () => {
    const result = parseCardFile(dataFile('legend-cards.csv'), 'legend')
    expect(result.errors).toEqual([])
    expect(result.cards).toHaveLength(590)
    expect(result.cards.filter(({ card }) => card.kind === 'normal')).toHaveLength(571)
    expect(result.cards.filter(({ card }) => card.kind === 'blessed')).toHaveLength(19)
    expect(result.warnings).toEqual([
      { kind: 'skipped-without-set', row: expect.any(Number) as number, name: 'The Cartographer' },
    ])
  })

  it('reads data/cursed-cards.csv as 154 Cursed cards', () => {
    const result = parseCardFile(dataFile('cursed-cards.csv'), 'cursed')
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.cards).toHaveLength(154)
    expect(result.cards.every(({ card }) => card.kind === 'cursed')).toBe(true)
  })

  it('refuses data/true-words.csv as a Legend card file', () => {
    const result = parseCardFile(dataFile('true-words.csv'), 'legend')
    expect(result.errors).toEqual([
      { kind: 'missing-columns', columns: ['set', 'rarity', 'mechanic pack'] },
    ])
  })
})
