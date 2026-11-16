// @vitest-environment node
// Plans the file names of the owner's archives against the owner's data and alias table, so a change to either shows
// here before a build or an import (design D3, the expected coverage). The build plans the assets; the set import plans
// the sets' pictures, here against the sets `data/sets.csv` would store; the picture import plans the cards and words,
// here against the definitions the owner's files would store. All of these files stay on the owner's machine (design D5
// of add-ci-and-deploy), so the whole test runs only where they are, and is skipped elsewhere.
import { describe, expect, it } from 'vitest'

import {
  type ArtData,
  definitionsOfRows,
  NO_DEFINITIONS,
  planArt,
  readAliases,
} from './artFiles.ts'
import { parseCardFile } from './cardRows.ts'
import { setIdOf } from './importSets.ts'
import { parseSetFile } from './setRows.ts'
import { DATA_FILES, hasOwnerData, ownerFile } from './testData.ts'
import { parseTrueWordFile } from './trueWordRows.ts'

const HAS_OWNER_DATA = hasOwnerData(...Object.values(DATA_FILES))
/** An owner's file, or nothing where the owner's data is absent and the test is skipped. */
const dataFile = (name: (typeof DATA_FILES)[keyof typeof DATA_FILES]) =>
  HAS_OWNER_DATA ? ownerFile(name) : ''

/** The picture file names in the owner's archives, by archive, as `7zz l` lists them (see data/README.md). */
const ART_INVENTORY = HAS_OWNER_DATA
  ? (JSON.parse(dataFile(DATA_FILES.inventory)) as Record<string, readonly string[]>)
  : {}

const DATA: ArtData = {
  ...definitionsOfRows(
    parseCardFile(dataFile(DATA_FILES.legend), 'legend').cards.map(({ card }) => card),
    parseCardFile(dataFile(DATA_FILES.cursed), 'cursed').cards.map(({ card }) => card),
    parseTrueWordFile(dataFile(DATA_FILES.trueWords)).words.map(({ word }) => word),
  ),
  sets: parseSetFile(dataFile(DATA_FILES.sets)).sets.map(({ code, name, aliases }) => ({
    setId: setIdOf(code),
    code,
    name,
    aliases,
  })),
}

const FILES = Object.entries(ART_INVENTORY).flatMap(([archive, names]) =>
  names.map((name) => ({ name, archive })),
)

describe.skipIf(!HAS_OWNER_DATA)('the inventory of the archives', () => {
  const ALIASES = dataFile(DATA_FILES.aliases)
  const assetAliases = readAliases(ALIASES, NO_DEFINITIONS, 'assets')
  const setAliases = readAliases(ALIASES, DATA, 'sets')
  const definitionAliases = readAliases(ALIASES, DATA, 'definitions')
  const assets = planArt(FILES, NO_DEFINITIONS, assetAliases.aliases, 'assets')
  const sets = planArt(FILES, DATA, setAliases.aliases, 'sets')
  const plan = planArt(FILES, DATA, definitionAliases.aliases, 'definitions')

  it('has 929 files, and every alias row names something that exists', () => {
    expect(FILES).toHaveLength(929)
    expect(DATA.sets).toHaveLength(13)
    expect(assetAliases.errors).toEqual([])
    expect(setAliases.errors).toEqual([])
    expect(definitionAliases.errors).toEqual([])
    expect(definitionAliases.aliases).toHaveLength(8)
  })

  it('gives every card and word a picture', () => {
    const { normal, blessed, cursed, word } = plan.coverage
    expect(normal).toEqual({ expected: 590, found: 590, missing: [] })
    expect(blessed).toEqual({ expected: 19, found: 19, missing: [] })
    expect(cursed).toEqual({ expected: 155, found: 155, missing: [] })
    expect(word).toEqual({ expected: 53, found: 53, missing: [] })
  })

  it('gives the Blessed and Cursed cardbacks and every pack a picture', () => {
    expect(assets.coverage.back).toEqual({ expected: 2, found: 2, missing: [] })
    expect(assets.coverage.pack).toEqual({ expected: 10, found: 10, missing: [] })
  })

  // The newest set has a cardback but no Cardmaker in the archives; the DM adds one on the Setler screen.
  it('gives each of the 13 sets its cardback, and 12 of them their Cardmaker', () => {
    expect(sets.coverage.setBack).toEqual({ expected: 13, found: 13, missing: [] })
    expect(sets.coverage.setMascot).toMatchObject({ expected: 13, found: 12 })
    expect(sets.unknown).toEqual([])
  })

  it('splits the files between the three scripts', () => {
    expect(assets.assignments.length + assets.skipped.length).toBe(FILES.length)
    expect(assets.leftTo.sets).toHaveLength(25)
    expect(sets.assignments.length + sets.duplicates.length + sets.unknown.length).toBe(
      assets.leftTo.sets.length,
    )
    expect(plan.leftTo.assets.length).toBe(assets.assignments.length + assets.duplicates.length)
    expect(plan.leftTo.sets).toEqual(assets.leftTo.sets)
  })

  it("has every screen's Cardmaker", () => {
    expect(assets.coverage.mascot).toEqual({ expected: 15, found: 15, missing: [] })
  })

  it('uses the Blessed pictures by their names, and the aliased pack picture', () => {
    const fileOf = (key: string) =>
      plan.assignments.find(({ target }) => target.key === key)?.file.name
    expect(fileOf('legend-charmingrogue')).toBe('charmingrogue.png')
    expect(fileOf('legend-drivendiehard')).toBe('drivendiehard.png')
    expect(fileOf('legend-durabledwarf')).toBe('durabledwarf.png')
    expect(
      assets.assignments.find(({ target }) => target.key === "mechanic:Gambler's Gambit")?.file
        .name,
    ).toBe('pack_galmblers.png')
  })

  // The Custom Card pictures (`<cost><effect>.png`) wait for the Custom Card Draft, which the app does not have yet.
  it('has no duplicates: the Custom Card pictures and three spare files are unknown', () => {
    expect(plan.duplicates).toEqual([])
    expect(assets.duplicates).toEqual([])
    expect(sets.duplicates).toEqual([])
    const unknown = plan.unknown.map(({ name }) => name)
    expect(unknown.filter((name) => /^[135][a-z]+\.png$/.test(name))).toHaveLength(57)
    expect(unknown.filter((name) => !/^[135][a-z]+\.png$/.test(name))).toEqual([
      'thecartographersmapkit.png',
      'vidajalsaqrsunjustblade.png',
      'zallut_shop.png',
    ])
  })
})
