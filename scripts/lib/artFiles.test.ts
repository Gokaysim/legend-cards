// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  type ArtAlias,
  type ArtCard,
  type ArtData,
  type ArtDefinition,
  type ArtFile,
  type ArtPlan,
  type ArtPlanMode,
  type ArtSet,
  NO_DEFINITIONS,
  planArt,
  readAliases,
} from './artFiles.ts'
import { normalize } from './cardCatalog.ts'
import type { CardKind } from './cardRows.ts'

/** A stored card: its ID is the import's unless given, as for a card the DM renamed. */
const card = (name: string, kind: CardKind = 'normal', id?: string): ArtCard => ({
  id: id ?? `${kind === 'cursed' ? 'cursed' : 'legend'}-${normalize(name)}`,
  kind,
  name,
  nameKey: normalize(name),
})

const word = (name: string): ArtDefinition => ({
  id: `tw-${normalize(name)}`,
  name,
  nameKey: normalize(name),
})

const set = (code: string, name: string, aliases: string[] = []): ArtSet => ({
  setId: normalize(code),
  code,
  name,
  aliases,
})

const SETS: ArtSet[] = [
  set('The End is Nigh', 'The End is Nigh', ['endisnigh']),
  set('Kesqer', 'Kesqerian Nights'),
  set('Ulagal', 'Ballad of Ulagal'),
  set('Nordhallr', 'Ragnarök: Nordhallr', ['ragnarok', 'ragnarök']),
  set('Pandemonium', 'Pandemonium'),
]

const DATA: ArtData = {
  legend: [
    card("Aboleth's Eyes"),
    card("Al-Aziz' Surprise Attack"),
    card('Mirror'),
    card('Twilight Veil'),
    card('Roguish Charm', 'blessed'),
  ],
  cursed: [
    card('Scorched Earth', 'cursed'),
    card('Mirror', 'cursed'),
    card('Endless Hunger', 'cursed'),
  ],
  words: [word('Abyss'), word('Ascend')],
  sets: SETS,
}

const files = (...names: string[]): ArtFile[] => names.map((name) => ({ name }))

/** The alias table as each script reads it. */
type Aliases = Record<ArtPlanMode, readonly ArtAlias[]>
const NO_ALIASES: Aliases = { assets: [], sets: [], definitions: [] }

/**
 * The plans of the three scripts: the build's (assets, no definitions and no sets), the set import's (the sets) and
 * the picture import's (the definitions).
 */
const plansOf = (names: string[], aliases: Aliases = NO_ALIASES) => ({
  assets: planArt(files(...names), NO_DEFINITIONS, aliases.assets, 'assets'),
  sets: planArt(files(...names), DATA, aliases.sets, 'sets'),
  definitions: planArt(files(...names), DATA, aliases.definitions, 'definitions'),
})

/** The target of each used file, by any script, as `<file> -> <group>:<key>`. */
function matches(names: string[], aliases: Aliases = NO_ALIASES): Record<string, string> {
  const { assets, sets, definitions } = plansOf(names, aliases)
  return Object.fromEntries(
    [...assets.assignments, ...sets.assignments, ...definitions.assignments].map(
      ({ file, target }) => [file.name, `${target.group}:${target.key}`],
    ),
  )
}

/** The files no script uses: unknown to the set import or the picture import. The build calls no file unknown. */
const unknownOf = (names: string[], aliases: Aliases = NO_ALIASES) => {
  const { assets, sets, definitions } = plansOf(names, aliases)
  expect(assets.unknown).toEqual([])
  return [...sets.unknown, ...definitions.unknown].map((file) => file.name).sort()
}

const aliasesOf = (text: string): Aliases => {
  const assets = readAliases(text, NO_DEFINITIONS, 'assets')
  const sets = readAliases(text, DATA, 'sets')
  const definitions = readAliases(text, DATA, 'definitions')
  expect(assets.errors).toEqual([])
  expect(sets.errors).toEqual([])
  expect(definitions.errors).toEqual([])
  return { assets: assets.aliases, sets: sets.aliases, definitions: definitions.aliases }
}

describe('planArt: the matching rules in order', () => {
  it('1. an alias row wins over the name rules', () => {
    const aliases = aliasesOf('File,Kind,Name\ntwabyss.png,word,Ascend')
    expect(matches(['twabyss.png'], aliases)).toEqual({ 'twabyss.png': 'word:tw-ascend' })
  })

  it('1. an alias gives a misspelled or renamed file its card, word, asset or set picture', () => {
    const aliases = aliasesOf(
      [
        'File,Kind,Name',
        'charmingrogue.png,legend,Roguish Charm',
        'cursed_spontanous.png,cursed,Endless Hunger',
        'twascend_1.png,word,Ascend',
        'pack_galmblers.png,asset,pack_gamblers',
        'kesq.png,asset,kesqer_cb',
        'ulagalmaker.png,asset,cardmaker_ulagal',
      ].join('\n'),
    )
    expect(
      matches(
        [
          'charmingrogue.png',
          'cursed_spontanous.png',
          'twascend_1.png',
          'pack_galmblers.png',
          'kesq.png',
          'ulagalmaker.png',
        ],
        aliases,
      ),
    ).toEqual({
      'charmingrogue.png': 'blessed:legend-roguishcharm',
      'cursed_spontanous.png': 'cursed:cursed-endlesshunger',
      'twascend_1.png': 'word:tw-ascend',
      'pack_galmblers.png': "pack:mechanic:Gambler's Gambit",
      'kesq.png': 'setBack:kesqer',
      'ulagalmaker.png': 'setMascot:ulagal',
    })
  })

  it("2. a screen's Cardmaker stem, in any case, is a mascot", () => {
    expect(
      matches(['cardmaker_lib.png', 'CardMaker_Shop.PNG', 'card_info.png', 'cardmaker_gold.png']),
    ).toEqual({
      'cardmaker_lib.png': 'mascot:cardmaker_lib',
      'CardMaker_Shop.PNG': 'mascot:cardmaker_shop',
      'card_info.png': 'mascot:card_info',
      'cardmaker_gold.png': 'mascot:cardmaker_gold',
    })
  })

  it("2. any other cardmaker_<set> is that set's Cardmaker, by its code, official name or alias", () => {
    expect(
      matches([
        'cardmaker_kesqer.png',
        'cardmaker_ballad of ulagal.png',
        'cardmaker_ragnarok.png',
        'Cardmaker_TheEndIsNigh.png',
      ]),
    ).toEqual({
      'cardmaker_kesqer.png': 'setMascot:kesqer',
      'cardmaker_ballad of ulagal.png': 'setMascot:ulagal',
      'cardmaker_ragnarok.png': 'setMascot:nordhallr',
      'Cardmaker_TheEndIsNigh.png': 'setMascot:theendisnigh',
    })
    expect(unknownOf(['cardmaker_dance.png'])).toEqual(['cardmaker_dance.png'])
  })

  it('3. a legacy pack picture stem is its Mechanic, Golden or Cursed Golden Pack', () => {
    expect(
      matches(['pack_blood.png', 'pack_dungeoneers.png', 'pack_gold.png', 'pack_cursedgold.png']),
    ).toEqual({
      'pack_blood.png': 'pack:mechanic:Blood & Battle',
      'pack_dungeoneers.png': "pack:mechanic:Dungeoneer's Kit",
      'pack_gold.png': 'pack:golden',
      'pack_cursedgold.png': 'pack:cursedGolden',
    })
    expect(unknownOf(['pack_galmblers.png'])).toEqual(['pack_galmblers.png'])
  })

  it("4. a set's own pack picture is no picture: <set>_std, _prm, _crs and _gold are unknown", () => {
    const names = [
      'kesqer_std.png',
      'kesqer_prm.png',
      'pandemonium_crs.png',
      'pandemonium_gold.png',
    ]
    expect(matches(names)).toEqual({})
    expect(unknownOf(names)).toEqual([...names].sort())
  })

  it("5. a cardback is the Blessed or the Cursed back, or else a set's, by its code, official name or alias", () => {
    expect(
      matches([
        'kesqer_cb.png',
        'theendisnigh_cb.png',
        'ragnarok_cb.png',
        'ballad of ulagal_cb.png',
        'blessed_cb.png',
        'cursed_cb.png',
      ]),
    ).toEqual({
      'kesqer_cb.png': 'setBack:kesqer',
      'theendisnigh_cb.png': 'setBack:theendisnigh',
      'ragnarok_cb.png': 'setBack:nordhallr',
      'ballad of ulagal_cb.png': 'setBack:ulagal',
      'blessed_cb.png': 'back:blessed',
      'cursed_cb.png': 'back:cursed',
    })
    expect(unknownOf(['nowhere_cb.png'])).toEqual(['nowhere_cb.png'])
  })

  it('6. tw<name> is that True Word', () => {
    expect(matches(['twabyss.png'])).toEqual({ 'twabyss.png': 'word:tw-abyss' })
  })

  it('7. cursed_<name> is that Cursed card, even when a Legend card has the name', () => {
    expect(matches(['cursed_scorchedearth.png', 'cursed_mirror.png'])).toEqual({
      'cursed_scorchedearth.png': 'cursed:cursed-scorchedearth',
      'cursed_mirror.png': 'cursed:cursed-mirror',
    })
  })

  it('8. any other name is the Legend card of that name, normal or Blessed', () => {
    expect(
      matches(['abolethseyes.png', 'roguishcharm.png', 'mirror.png', 'twilightveil.png']),
    ).toEqual({
      'abolethseyes.png': 'normal:legend-abolethseyes',
      'roguishcharm.png': 'blessed:legend-roguishcharm',
      'mirror.png': 'normal:legend-mirror',
      // A tw prefix that is no True Word falls through to the cards.
      'twilightveil.png': 'normal:legend-twilightveil',
    })
  })

  it('9. or else the Cursed card of that name', () => {
    expect(matches(['endlesshunger.png'])).toEqual({
      'endlesshunger.png': 'cursed:cursed-endlesshunger',
    })
  })

  it('10. a file that matches nothing is unknown, and the plan goes on', () => {
    const plan = planArt(files('zamansgolfc.png', 'abolethseyes.png'), DATA, [], 'definitions')
    expect(plan.unknown).toEqual([{ name: 'zamansgolfc.png' }])
    expect(plan.assignments).toHaveLength(1)
  })
})

describe('planArt: the stored definitions', () => {
  it('finds a card the DM renamed by the identity of its old name, before any name', () => {
    const renamed: ArtData = {
      ...DATA,
      legend: [card('Eyes of the Aboleth', 'normal', 'legend-abolethseyes'), card('Mirror')],
    }
    const plan = planArt(files('abolethseyes.png'), renamed, [], 'definitions')
    expect(plan.assignments.map(({ target }) => [target.key, target.label])).toEqual([
      ['legend-abolethseyes', 'Eyes of the Aboleth'],
    ])
  })

  it('finds a card added in the app with a suffixed ID by its name', () => {
    const added: ArtData = {
      ...DATA,
      legend: [...DATA.legend, card("Bard's Encore", 'normal', 'legend-bardsencore-2')],
    }
    const plan = planArt(files('bardsencore.png'), added, [], 'definitions')
    expect(plan.assignments.map(({ target }) => target.key)).toEqual(['legend-bardsencore-2'])
  })

  it('leaves each file to the script that plans it', () => {
    const names = [
      'kesqer_cb.png',
      'cardmaker_kesqer.png',
      'cardmaker_lib.png',
      'blessed_cb.png',
      'abolethseyes.png',
      'zamansgolfc.png',
    ]
    const { assets, sets, definitions } = plansOf(names)
    const left = (plan: ArtPlan<ArtFile>) =>
      Object.fromEntries(
        Object.entries(plan.leftTo).map(([mode, leftFiles]) => [
          mode,
          leftFiles.map(({ name }) => name),
        ]),
      )

    expect(left(assets)).toEqual({
      assets: [],
      sets: ['cardmaker_kesqer.png', 'kesqer_cb.png'],
      definitions: ['abolethseyes.png', 'zamansgolfc.png'],
    })
    expect(left(sets)).toEqual({
      assets: ['blessed_cb.png', 'cardmaker_lib.png'],
      sets: [],
      definitions: ['abolethseyes.png', 'zamansgolfc.png'],
    })
    expect(left(definitions)).toEqual({
      assets: ['blessed_cb.png', 'cardmaker_lib.png'],
      sets: ['cardmaker_kesqer.png', 'kesqer_cb.png'],
      definitions: [],
    })
    expect(definitions.skipped.map(({ name }) => name)).toEqual([
      'blessed_cb.png',
      'cardmaker_kesqer.png',
      'cardmaker_lib.png',
      'kesqer_cb.png',
    ])
    expect(definitions.unknown.map(({ name }) => name)).toEqual(['zamansgolfc.png'])
    expect(sets.unknown).toEqual([])
    expect(assets.unknown).toEqual([])
  })

  it('the build leaves every set file to the set import, without knowing the sets', () => {
    const { assets } = plansOf(['nowhere_cb.png', 'cardmaker_dance.png', 'kesqer_cb.png'])
    expect(assets.assignments).toEqual([])
    expect(assets.leftTo.sets.map(({ name }) => name)).toEqual([
      'cardmaker_dance.png',
      'kesqer_cb.png',
      'nowhere_cb.png',
    ])
  })

  it("leaves the files of the other scripts' alias rows to them", () => {
    const aliases = aliasesOf(
      'File,Kind,Name\ncharmingrogue.png,legend,Roguish Charm\npack_galmblers.png,asset,pack_gamblers\nkesq.png,asset,kesqer_cb',
    )
    const { assets, sets, definitions } = plansOf(
      ['charmingrogue.png', 'pack_galmblers.png', 'kesq.png'],
      aliases,
    )
    expect(assets.leftTo.definitions.map(({ name }) => name)).toEqual(['charmingrogue.png'])
    expect(assets.leftTo.sets.map(({ name }) => name)).toEqual(['kesq.png'])
    expect(sets.skipped.map(({ name }) => name)).toEqual([
      'charmingrogue.png',
      'pack_galmblers.png',
    ])
    expect(definitions.skipped.map(({ name }) => name)).toEqual(['kesq.png', 'pack_galmblers.png'])
  })
})

describe('planArt: duplicates', () => {
  it('a file matched by its name beats an alias, even one first by name', () => {
    const aliases = aliasesOf(
      "File,Kind,Name\nalazizsurpiseattack.png,legend,Al-Aziz' Surprise Attack",
    )
    const plan = planArt(
      files('alazizsurpriseattack.png', 'alazizsurpiseattack.png'),
      DATA,
      aliases.definitions,
      'definitions',
    )
    expect(plan.assignments).toEqual([
      {
        file: { name: 'alazizsurpriseattack.png' },
        target: {
          group: 'normal',
          key: 'legend-alazizsurpriseattack',
          label: "Al-Aziz' Surprise Attack",
        },
        via: 'name',
      },
    ])
    expect(plan.duplicates).toEqual([
      {
        file: { name: 'alazizsurpiseattack.png' },
        target: {
          group: 'normal',
          key: 'legend-alazizsurpriseattack',
          label: "Al-Aziz' Surprise Attack",
        },
        winner: { name: 'alazizsurpriseattack.png' },
      },
    ])
    expect(plan.unknown).toEqual([])
  })

  it('otherwise the first by file name wins, wherever the files come from', () => {
    const plan = planArt(
      [
        { name: 'kesqerian nights_cb.png', from: 'a.7z' },
        { name: 'kesqer_cb.png', from: 'b.7z' },
      ],
      DATA,
      [],
      'sets',
    )
    expect(plan.assignments.map(({ file }) => file)).toEqual([
      { name: 'kesqer_cb.png', from: 'b.7z' },
    ])
    expect(plan.duplicates.map(({ file, winner }) => [file.name, winner.name])).toEqual([
      ['kesqerian nights_cb.png', 'kesqer_cb.png'],
    ])
  })
})

describe('planArt: coverage', () => {
  it("counts each of its mode's kinds and names the missing targets", () => {
    const { assets, sets, definitions } = plansOf([
      'abolethseyes.png',
      'roguishcharm.png',
      'cursed_mirror.png',
      'twabyss.png',
      'blessed_cb.png',
      'kesqer_cb.png',
      'cardmaker_ulagal.png',
      'pack_blood.png',
      'cardmaker_lib.png',
    ])
    expect(Object.keys(assets.coverage)).toEqual(['back', 'pack', 'mascot'])
    expect(Object.keys(sets.coverage)).toEqual(['setBack', 'setMascot'])
    expect(Object.keys(definitions.coverage)).toEqual(['normal', 'blessed', 'cursed', 'word'])
    const { normal, blessed, cursed, word: words } = definitions.coverage
    const { back, pack, mascot } = assets.coverage
    if (!back || !pack || !mascot) throw new Error('The build plans the assets')
    expect(normal).toEqual({
      expected: 4,
      found: 1,
      missing: ["Al-Aziz' Surprise Attack", 'Mirror', 'Twilight Veil'],
    })
    expect(blessed).toEqual({ expected: 1, found: 1, missing: [] })
    expect(cursed).toEqual({
      expected: 3,
      found: 1,
      missing: ['Scorched Earth', 'Endless Hunger'],
    })
    expect(words).toEqual({ expected: 2, found: 1, missing: ['Ascend'] })
    // The build expects only the Blessed and Cursed backs: the sets' are the set import's.
    expect(back).toEqual({ expected: 2, found: 1, missing: ['Cursed'] })
    expect(pack.expected).toBe(10)
    expect(pack.found).toBe(1)
    expect(pack.missing).toContain('Golden Pack')
    expect(mascot.expected).toBe(15)
    expect(mascot.found).toBe(1)
    expect(sets.coverage.setBack).toEqual({
      expected: 5,
      found: 1,
      missing: ['The End is Nigh', 'Ballad of Ulagal', 'Ragnarök: Nordhallr', 'Pandemonium'],
    })
    expect(sets.coverage.setMascot).toEqual({
      expected: 5,
      found: 1,
      missing: ['The End is Nigh', 'Kesqerian Nights', 'Ragnarök: Nordhallr', 'Pandemonium'],
    })
  })
})

describe('readAliases', () => {
  const TABLE = [
    'File,Kind,Name',
    'orkolsacquisiton.png,legend,Aboleth’s Eyes',
    'cursed_spontanous.png,Cursed,Scorched Earth',
    'twascend_1.png,word,Ascend',
    'pack_galmblers.png,asset,pack_gamblers',
    'kesq.png,asset,kesqer_cb',
  ].join('\n')

  it('reads the card and word rows for the picture import, and keeps the asset rows without a target', () => {
    const result = readAliases(TABLE, DATA, 'definitions')
    expect(result.errors).toEqual([])
    expect(result.aliases.map(({ row, file, target }) => [row, file, target?.key ?? null])).toEqual(
      [
        [2, 'orkolsacquisiton.png', 'legend-abolethseyes'],
        [3, 'cursed_spontanous.png', 'cursed-scorchedearth'],
        [4, 'twascend_1.png', 'tw-ascend'],
        [5, 'pack_galmblers.png', null],
        [6, 'kesq.png', null],
      ],
    )
  })

  it('reads the asset rows for the build, and leaves the set rows to the set import unchecked', () => {
    const result = readAliases(`${TABLE}\nnowhere.png,asset,nowhere_cb`, NO_DEFINITIONS, 'assets')
    expect(result.errors).toEqual([])
    expect(
      result.aliases.map(({ file, owner, target }) => [file, owner, target?.key ?? null]),
    ).toEqual([
      ['orkolsacquisiton.png', 'definitions', null],
      ['cursed_spontanous.png', 'definitions', null],
      ['twascend_1.png', 'definitions', null],
      ['pack_galmblers.png', 'assets', "mechanic:Gambler's Gambit"],
      ['kesq.png', 'sets', null],
      ['nowhere.png', 'sets', null],
    ])
  })

  it('reads the set rows for the set import, against the sets', () => {
    const result = readAliases(TABLE, DATA, 'sets')
    expect(result.errors).toEqual([])
    expect(result.aliases.map(({ file, target }) => [file, target?.key ?? null])).toEqual([
      ['orkolsacquisiton.png', null],
      ['cursed_spontanous.png', null],
      ['twascend_1.png', null],
      ['pack_galmblers.png', null],
      ['kesq.png', 'kesqer'],
    ])
    expect(
      readAliases('File,Kind,Name\nnowhere.png,asset,nowhere_cb', DATA, 'sets').errors,
    ).toEqual([{ kind: 'unknown-target', row: 2, aliasKind: 'asset', name: 'nowhere_cb' }])
  })

  it('finds an aliased card by the identity of its name after a rename', () => {
    const renamed: ArtData = {
      ...DATA,
      legend: [card('Charm of the Rogue', 'blessed', 'legend-roguishcharm')],
    }
    const result = readAliases(
      'File,Kind,Name\ncharmingrogue.png,legend,Roguish Charm',
      renamed,
      'definitions',
    )
    expect(result.errors).toEqual([])
    expect(result.aliases[0]?.target?.label).toBe('Charm of the Rogue')
  })

  it('reports an unknown kind with its row number', () => {
    const result = readAliases(
      'File,Kind,Name\nx.png,legend,Mirror\ny.png,elixir,Zallut',
      DATA,
      'definitions',
    )
    expect(result.errors).toEqual([{ kind: 'unknown-kind', row: 3, value: 'elixir' }])
    expect(result.aliases).toHaveLength(1)
  })

  it('reports a name that matches no stored card or word, or no asset, with its row number', () => {
    const table = [
      'File,Kind,Name',
      'a.png,legend,Scorched Earth',
      'b.png,cursed,Nothing Here',
      'c.png,word,Abyss',
      'd.png,asset,pack_galmblers',
    ].join('\n')
    expect(readAliases(table, DATA, 'definitions').errors).toEqual([
      // Scorched Earth is a Cursed card, not a Legend card.
      { kind: 'unknown-target', row: 2, aliasKind: 'legend', name: 'Scorched Earth' },
      { kind: 'unknown-target', row: 3, aliasKind: 'cursed', name: 'Nothing Here' },
    ])
    expect(readAliases(table, NO_DEFINITIONS, 'assets').errors).toEqual([
      { kind: 'unknown-target', row: 5, aliasKind: 'asset', name: 'pack_galmblers' },
    ])
  })

  it('reports missing columns, empty cells and a file named twice', () => {
    expect(readAliases('File,Name\na.png,Mirror', DATA, 'definitions').errors).toEqual([
      { kind: 'missing-columns', columns: ['kind'] },
    ])
    expect(
      readAliases(
        'File,Kind,Name\n,legend,Mirror\na.png,legend,Mirror\nA.PNG,cursed,Mirror\nb.png,legend,',
        DATA,
        'definitions',
      ).errors,
    ).toEqual([
      { kind: 'empty-cell', row: 2, column: 'File' },
      { kind: 'duplicate-file', rows: [3, 4], file: 'A.PNG' },
      { kind: 'empty-cell', row: 5, column: 'Name' },
    ])
  })
})
