// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  type ArtAlias,
  type ArtCard,
  type ArtData,
  type ArtDefinition,
  type ArtFile,
  type ArtPlanMode,
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
}

const files = (...names: string[]): ArtFile[] => names.map((name) => ({ name }))

/** The alias table as each script reads it. */
type Aliases = Record<ArtPlanMode, readonly ArtAlias[]>
const NO_ALIASES: Aliases = { assets: [], definitions: [] }

/** The plans of both scripts: the build's (assets, no definitions) and the picture import's (the definitions). */
const plansOf = (names: string[], aliases: Aliases = NO_ALIASES) => ({
  assets: planArt(files(...names), NO_DEFINITIONS, aliases.assets, 'assets'),
  definitions: planArt(files(...names), DATA, aliases.definitions, 'definitions'),
})

/** The target of each used file, by either script, as `<file> -> <group>:<key>`. */
function matches(names: string[], aliases: Aliases = NO_ALIASES): Record<string, string> {
  const { assets, definitions } = plansOf(names, aliases)
  return Object.fromEntries(
    [...assets.assignments, ...definitions.assignments].map(({ file, target }) => [
      file.name,
      `${target.group}:${target.key}`,
    ]),
  )
}

/** The files neither script uses: unknown to the picture import, which leaves only the assets to the build. */
const unknownOf = (names: string[], aliases: Aliases = NO_ALIASES) =>
  plansOf(names, aliases).definitions.unknown.map((file) => file.name)

const aliasesOf = (text: string): Aliases => {
  const assets = readAliases(text, NO_DEFINITIONS, 'assets')
  const definitions = readAliases(text, DATA, 'definitions')
  expect(assets.errors).toEqual([])
  expect(definitions.errors).toEqual([])
  return { assets: assets.aliases, definitions: definitions.aliases }
}

describe('planArt: the matching rules in order', () => {
  it('1. an alias row wins over the name rules', () => {
    const aliases = aliasesOf('File,Kind,Name\ntwabyss.png,word,Ascend')
    expect(matches(['twabyss.png'], aliases)).toEqual({ 'twabyss.png': 'word:tw-ascend' })
  })

  it('1. an alias gives a misspelled or renamed file its card, word or asset', () => {
    const aliases = aliasesOf(
      [
        'File,Kind,Name',
        'charmingrogue.png,legend,Roguish Charm',
        'cursed_spontanous.png,cursed,Endless Hunger',
        'twascend_1.png,word,Ascend',
        'pack_galmblers.png,asset,pack_gamblers',
      ].join('\n'),
    )
    expect(
      matches(
        ['charmingrogue.png', 'cursed_spontanous.png', 'twascend_1.png', 'pack_galmblers.png'],
        aliases,
      ),
    ).toEqual({
      'charmingrogue.png': 'blessed:legend-roguishcharm',
      'cursed_spontanous.png': 'cursed:cursed-endlesshunger',
      'twascend_1.png': 'word:tw-ascend',
      'pack_galmblers.png': "pack:mechanic:Gambler's Gambit",
    })
  })

  it('2. a known Cardmaker stem, in any case, is a mascot', () => {
    expect(matches(['cardmaker_lib.png', 'CardMaker_Shop.PNG', 'card_info.png'])).toEqual({
      'cardmaker_lib.png': 'mascot:cardmaker_lib',
      'CardMaker_Shop.PNG': 'mascot:cardmaker_shop',
      'card_info.png': 'mascot:card_info',
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

  it("4. a set's pack picture, by the set's code, official name or alias", () => {
    expect(
      matches([
        'kesqer_std.png',
        'kesqerian nights_prm.png',
        'kesqer_crs.png',
        'theendisnigh_cursed.png',
        'ragnarok_std.png',
      ]),
    ).toEqual({
      'kesqer_std.png': 'setPack:standard:Kesqer',
      'kesqerian nights_prm.png': 'setPack:premium:Kesqer',
      'kesqer_crs.png': 'setPack:cursed:Kesqer',
      'theendisnigh_cursed.png': 'setPack:cursed:The End is Nigh',
      'ragnarok_std.png': 'setPack:standard:Nordhallr',
    })
  })

  it("4. Pandemonium's pack pictures name its own two packs", () => {
    expect(matches(['pandemonium_std.png', 'pandemonium_crs.png'])).toEqual({
      'pandemonium_std.png': 'setPack:pandemonium:Pandemonium',
      'pandemonium_crs.png': 'setPack:pandemoniumCursed:Pandemonium',
    })
    expect(matches(['pandemonium_gld.png'])).toEqual({
      'pandemonium_gld.png': 'setPack:pandemonium:Pandemonium',
    })
    expect(unknownOf(['pandemonium_prm.png', 'kesqer_gold.png'])).toEqual([
      'kesqer_gold.png',
      'pandemonium_prm.png',
    ])
  })

  it("5. a cardback is a set's, the Blessed or the Cursed back", () => {
    expect(
      matches(['kesqer_cb.png', 'theendisnigh_cb.png', 'blessed_cb.png', 'cursed_cb.png']),
    ).toEqual({
      'kesqer_cb.png': 'back:Kesqer',
      'theendisnigh_cb.png': 'back:The End is Nigh',
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

  it('leaves the asset files to the build, and the build leaves every other file to the import', () => {
    const names = ['kesqer_cb.png', 'cardmaker_lib.png', 'abolethseyes.png', 'zamansgolfc.png']
    const { assets, definitions } = plansOf(names)

    expect(definitions.skipped.map(({ name }) => name)).toEqual([
      'cardmaker_lib.png',
      'kesqer_cb.png',
    ])
    expect(definitions.unknown.map(({ name }) => name)).toEqual(['zamansgolfc.png'])
    expect(assets.skipped.map(({ name }) => name)).toEqual(['abolethseyes.png', 'zamansgolfc.png'])
    expect(assets.unknown).toEqual([])
  })

  it("leaves the files of the other script's alias rows to it", () => {
    const aliases = aliasesOf(
      'File,Kind,Name\ncharmingrogue.png,legend,Roguish Charm\npack_galmblers.png,asset,pack_gamblers',
    )
    const { assets, definitions } = plansOf(['charmingrogue.png', 'pack_galmblers.png'], aliases)
    expect(assets.skipped.map(({ name }) => name)).toEqual(['charmingrogue.png'])
    expect(definitions.skipped.map(({ name }) => name)).toEqual(['pack_galmblers.png'])
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
        { name: 'pandemonium_std.png', from: 'a.7z' },
        { name: 'pandemonium_gold.png', from: 'b.7z' },
      ],
      NO_DEFINITIONS,
      [],
      'assets',
    )
    expect(plan.assignments.map(({ file }) => file)).toEqual([
      { name: 'pandemonium_gold.png', from: 'b.7z' },
    ])
    expect(plan.duplicates.map(({ file, winner }) => [file.name, winner.name])).toEqual([
      ['pandemonium_std.png', 'pandemonium_gold.png'],
    ])
  })
})

describe('planArt: coverage', () => {
  it("counts each of its mode's kinds and names the missing targets", () => {
    const { assets, definitions } = plansOf([
      'abolethseyes.png',
      'roguishcharm.png',
      'cursed_mirror.png',
      'twabyss.png',
      'kesqer_cb.png',
      'pack_blood.png',
      'kesqer_std.png',
      'cardmaker_lib.png',
    ])
    expect(Object.keys(assets.coverage)).toEqual(['back', 'pack', 'setPack', 'mascot'])
    expect(Object.keys(definitions.coverage)).toEqual(['normal', 'blessed', 'cursed', 'word'])
    const { normal, blessed, cursed, word: words } = definitions.coverage
    const { back, pack, setPack, mascot } = assets.coverage
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
    expect(back.expected).toBe(14)
    expect(back.found).toBe(1)
    expect(back.missing).toContain('Ballad of Ulagal')
    expect(back.missing).toContain('Blessed')
    expect(pack.expected).toBe(10)
    expect(pack.found).toBe(1)
    expect(pack.missing).toContain('Golden Pack')
    // A set pack picture is optional: counted, never missing.
    expect(setPack).toEqual({ expected: 0, found: 1, missing: [] })
    expect(mascot.expected).toBe(27)
    expect(mascot.found).toBe(1)
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

  it('reads the asset rows for the build, without checking the card and word rows', () => {
    const result = readAliases(TABLE, NO_DEFINITIONS, 'assets')
    expect(result.errors).toEqual([])
    expect(result.aliases.map(({ file, target }) => [file, target?.key ?? null])).toEqual([
      ['orkolsacquisiton.png', null],
      ['cursed_spontanous.png', null],
      ['twascend_1.png', null],
      ['pack_galmblers.png', "mechanic:Gambler's Gambit"],
      ['kesq.png', 'Kesqer'],
    ])
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
